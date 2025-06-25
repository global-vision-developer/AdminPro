
// functions/src/index.ts

import {
  onCall,
  type CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {UserRole} from "./types";

// Firebase Admin SDK-г эхлүүлнэ (зөвхөн нэг удаа)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();
const fAuth = admin.auth(); // Firebase Admin Auth instance

interface UserProfile {
  uid: string;
  name: string;
  email: string;
}

interface SendNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: string | null; // ISO string from client
  selectedUserIds: string[]; // Changed from selectedUsers
  adminCreator: Pick<UserProfile, "uid" | "name" | "email">;
}

// Firestore-д хадгалах log-ийн төрлүүд
interface NotificationTargetForLog {
  userId: string;
  userEmail?: string;
  userName?: string;
  token: string;
  status: "success" | "failed"; // No pending state
  error?: string;
  messageId?: string;
  attemptedAt: FirebaseFirestore.Timestamp;
}

interface NotificationLog {
  title: string;
  body: string;
  imageUrl: string | null;
  deepLink: string | null;
  adminCreator: Pick<UserProfile, "uid" | "name" | "email">;
  createdAt: FirebaseFirestore.FieldValue;
  targets: NotificationTargetForLog[];
  processingStatus:
    | "completed"
    | "partially_completed"
    | "scheduled"
    | "completed_no_targets";
  scheduleAt: FirebaseFirestore.Timestamp | null;
}

export const sendNotification = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<SendNotificationPayload>) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    try {
      const {
        title,
        body,
        imageUrl,
        deepLink,
        scheduleAt,
        selectedUserIds,
        adminCreator,
      } = request.data;

      if (
        !title ||
        !body ||
        !selectedUserIds ||
        !Array.isArray(selectedUserIds) ||
        selectedUserIds.length === 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: title, body, and selectedUserIds."
        );
      }

      // Scheduling logic
      if (scheduleAt && new Date(scheduleAt).getTime() > Date.now()) {
        const scheduledLog: NotificationLog = {
          title,
          body,
          imageUrl: imageUrl || null,
          deepLink: deepLink || null,
          adminCreator,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          targets: [], // Targets will be processed by a separate scheduled function
          processingStatus: "scheduled",
          scheduleAt: admin.firestore.Timestamp.fromDate(new Date(scheduleAt)),
        };
        const docRef = await db.collection("notifications").add(scheduledLog);
        logger.info(`Notification ${docRef.id} has been scheduled for later.`);
        return {
          success: true,
          message: `Мэдэгдэл хуваарьт амжилттай орлоо (ID: ${docRef.id}).`,
        };
      }

      // Fetch latest user data to get fresh FCM tokens
      const usersRef = db.collection("users");
      const userDocs = selectedUserIds.length > 0 ? await db.getAll(...selectedUserIds.map((id) => usersRef.doc(id))) : [];

      const tokensToSend: string[] = [];
      const tokenToUserMap = new Map<string, { id: string; email?: string; displayName?: string; }>();

      for (const userDoc of userDocs) {
          if (userDoc.exists) {
              const userData = userDoc.data()!;
              const userTokens: string[] = [];

              if (userData.fcmToken && typeof userData.fcmToken === 'string') {
                  userTokens.push(userData.fcmToken);
              } else if (Array.isArray(userData.fcmTokens)) {
                  userTokens.push(...userData.fcmTokens.filter(t => typeof t === 'string' && t));
              }

              if (userTokens.length > 0) {
                  const userInfo = {
                      id: userDoc.id,
                      email: userData.email,
                      displayName: userData.displayName,
                  };
                  userTokens.forEach((token) => {
                      if (token && !tokenToUserMap.has(token)) {
                          tokensToSend.push(token);
                          tokenToUserMap.set(token, userInfo);
                      }
                  });
              }
          }
      }
      
      if (tokensToSend.length === 0) {
        const noTokenLog: Partial<NotificationLog> = {
          title,
          body,
          adminCreator,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          processingStatus: "completed_no_targets",
          targets: [],
        };
        await db.collection("notifications").add(noTokenLog);
        return {
          success: false,
          message: "Сонгосон хэрэглэгчдэд идэвхтэй FCM token олдсонгүй.",
        };
      }

      // **FIX**: Ensure all necessary data is in the data payload for client-side processing
      const dataPayload: { [key: string]: string } = {
        _internalMessageId: new Date().getTime().toString() + Math.random().toString(),
        title: title,
        body: body,
      };
      if (deepLink) {
        dataPayload.deepLink = deepLink;
      }
      if (imageUrl) {
        dataPayload.imageUrl = imageUrl;
      }

      // **FIX**: Send a data-only message to give the client app full control
      // over notification display and logging. The 'notification' key is removed.
      const messagePayload: admin.messaging.MulticastMessage = {
        tokens: tokensToSend,
        data: dataPayload,
      };

      logger.info(`Sending ${tokensToSend.length} messages.`);
      const response = await messaging.sendEachForMulticast(messagePayload);
      const currentTimestamp = admin.firestore.Timestamp.now();

      const targetsForLog: NotificationTargetForLog[] = [];
      response.responses.forEach((result, index) => {
        const token = tokensToSend[index];
        const user = tokenToUserMap.get(token);

        const targetLog: Partial<NotificationTargetForLog> = {
          userId: user?.id || "unknown",
          token: token,
          status: result.success ? "success" : "failed",
          attemptedAt: currentTimestamp,
        };

        if (user?.email) {
          targetLog.userEmail = user.email;
        }
        if (user?.displayName) {
          targetLog.userName = user.displayName;
        }

        if (result.success) {
          if (result.messageId) {
            targetLog.messageId = result.messageId;
          }
        } else {
          if (result.error) {
            targetLog.error = result.error.message;
          }
        }
        targetsForLog.push(targetLog as NotificationTargetForLog);
      });

      const finalProcessingStatus =
        response.failureCount === 0 ? "completed" : "partially_completed";

      const finalLog: NotificationLog = {
        title,
        body,
        imageUrl: imageUrl || null,
        deepLink: deepLink || null,
        adminCreator,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        targets: targetsForLog,
        processingStatus: finalProcessingStatus,
        scheduleAt: scheduleAt ?
          admin.firestore.Timestamp.fromDate(new Date(scheduleAt)) :
          null,
      };

      const docRef = await db.collection("notifications").add(finalLog);
      logger.info(`Notification sent and log ${docRef.id} created.`);

      return {
        success: true,
        message: `Мэдэгдэл илгээгдлээ. ${response.successCount} амжилттай, ${response.failureCount} амжилтгүй.`,
      };
    } catch (error: unknown) {
      logger.error("Error in sendNotification function:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while sending the notification.",
        {
          originalErrorMessage: (error as Error).message,
        }
      );
    }
  }
);

// --- V2 Callable Function: Update Admin User Details ---
const ADMINS_COLLECTION = "admins";

interface UpdateAdminUserData {
  targetUserId: string;
  name?: string;
  email?: string;
  newPassword?: string;
  role?: UserRole;
  avatar?: string;
  allowedCategoryIds?: string[];
  canSendNotifications?: boolean;
}

export const updateAdminAuthDetails = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<UpdateAdminUserData>) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const callerUid = request.auth.uid;
    const {
      targetUserId,
      name,
      email,
      newPassword,
      role,
      avatar,
      allowedCategoryIds,
      canSendNotifications,
    } = request.data;

    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "targetUserId is required.");
    }
    
    const isEditingSelf = callerUid === targetUserId;

    // Get caller's role for permission checks
    const callerAdminDoc = await db.collection(ADMINS_COLLECTION).doc(callerUid).get();
    if (!callerAdminDoc.exists) {
        throw new HttpsError("permission-denied", "Caller is not a valid admin.");
    }
    const isCallerSuperAdmin = callerAdminDoc.data()?.role === UserRole.SUPER_ADMIN;

    // --- PERMISSION CHECKS ---
    // If not a super admin, can only edit self, and only limited fields.
    if (!isCallerSuperAdmin) {
        if (!isEditingSelf) {
            throw new HttpsError("permission-denied", "You do not have permissions to edit other users.");
        }
        // Sub-admins can't change email, password, role, or permissions for themselves
        if (email || newPassword || role || allowedCategoryIds !== undefined || canSendNotifications !== undefined) {
             throw new HttpsError("permission-denied", "You can only update your name and avatar.");
        }
    }
    
    // Super-admin specific checks (e.g. protecting the main super admin account)
    if (isCallerSuperAdmin) {
        try {
            const targetUserRecord = await fAuth.getUser(targetUserId);
            if (
                targetUserRecord.email === "super@example.com" &&
                (email && email !== "super@example.com" || role && role !== UserRole.SUPER_ADMIN)
            ) {
                throw new HttpsError(
                "permission-denied",
                "Cannot change the email or role of the primary super admin account."
                );
            }
        } catch (error: unknown) {
            logger.error("Error fetching target user for pre-check:", error);
        }
    }

    try {
      // Prepare Auth update payload
      const updatePayloadAuth: {
        email?: string;
        password?: string;
        displayName?: string;
        photoURL?: string;
      } = {};
      if (email) updatePayloadAuth.email = email;
      if (newPassword) updatePayloadAuth.password = newPassword;
      if (name) updatePayloadAuth.displayName = name;
      if (avatar) updatePayloadAuth.photoURL = avatar;

      // Update Auth if there's anything to update
      if (Object.keys(updatePayloadAuth).length > 0) {
        await fAuth.updateUser(targetUserId, updatePayloadAuth);
        logger.info(
          `Successfully updated Firebase Auth for user: ${targetUserId}`,
          updatePayloadAuth
        );
      }

      // Prepare Firestore update payload
      const updatePayloadFirestore: Record<string, any> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (email) updatePayloadFirestore.email = email;
      if (name) updatePayloadFirestore.name = name;
      if (avatar) updatePayloadFirestore.avatar = avatar;
      
      // Only allow role/permission changes if the caller is a Super Admin
      if (isCallerSuperAdmin) {
        if (role) updatePayloadFirestore.role = role;
        if (role === UserRole.SUB_ADMIN) {
            if (allowedCategoryIds !== undefined) {
            updatePayloadFirestore.allowedCategoryIds = allowedCategoryIds;
            }
            if (canSendNotifications !== undefined) {
            updatePayloadFirestore.canSendNotifications = canSendNotifications;
            }
        } else if (role === UserRole.SUPER_ADMIN) {
            updatePayloadFirestore.allowedCategoryIds = [];
            updatePayloadFirestore.canSendNotifications = true;
        }
      }

      // Update Firestore if there is more than just the timestamp
      if(Object.keys(updatePayloadFirestore).length > 1){
        await db
          .collection(ADMINS_COLLECTION)
          .doc(targetUserId)
          .update(updatePayloadFirestore);
        logger.info(
          `Successfully updated Firestore for user: ${targetUserId}`,
          updatePayloadFirestore
        );
      }

      return {
        success: true,
        message: "Admin details updated successfully in Auth and Firestore.",
      };
    } catch (error: unknown) {
      logger.error("Error updating admin details:", error);
      let errorCode: HttpsError["code"] = "unknown";
      let errorMessage = "Failed to update admin details.";
      if (error && typeof error === "object" && "code" in error) {
        const firebaseErrorCode = (error as {code: string}).code;
        switch (firebaseErrorCode) {
          case "auth/email-already-exists":
            errorCode = "already-exists";
            errorMessage = "The new email address is already in use by another account.";
            break;
          case "auth/invalid-email":
            errorCode = "invalid-argument";
            errorMessage = "The new email address is not valid.";
            break;
          case "auth/user-not-found":
            errorCode = "not-found";
            errorMessage = "Target user not found in Firebase Authentication.";
            break;
          case "auth/weak-password":
            errorCode = "invalid-argument";
            errorMessage = "The new password is too weak.";
            break;
          default:
            errorCode = "internal";
            errorMessage = (error as unknown as Error).message || "An internal error occurred during update.";
        }
        throw new HttpsError(errorCode, errorMessage, {
          originalCode: firebaseErrorCode,
        });
      } else {
        errorMessage = (error as unknown as Error).message || "An unknown error occurred.";
        throw new HttpsError("internal", errorMessage);
      }
    }
  }
);

// --- V2 Callable Function: Create a new Admin User ---
interface CreateAdminUserData {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  allowedCategoryIds?: string[];
  canSendNotifications?: boolean;
}
export const createAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateAdminUserData>) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const callerUid = request.auth.uid;
    try {
      const callerAdminDoc = await db
        .collection(ADMINS_COLLECTION)
        .doc(callerUid)
        .get();
      if (
        !callerAdminDoc.exists ||
        callerAdminDoc.data()?.role !== UserRole.SUPER_ADMIN
      ) {
        throw new HttpsError(
          "permission-denied",
          "Caller does not have Super Admin privileges to create users."
        );
      }
    } catch (error) {
      logger.error(
        "Error checking caller permissions for user creation:",
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Could not verify caller permissions."
      );
    }

    const {email, password, name, role, allowedCategoryIds = [], canSendNotifications = false} = request.data;
    if (!email || !password || !name || !role) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: email, password, name, role."
      );
    }
    if (password.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters long."
      );
    }

    try {
      logger.info(
        `'createAdminUser' called by ${callerUid} for new user ${email}.`
      );
      const photoURL = `https://placehold.co/100x100.png?text=${name
        .substring(0, 2)
        .toUpperCase()}&bg=FF5733&txt=FFFFFF`;
      const userRecord = await fAuth.createUser({
        email: email,
        password: password,
        displayName: name,
        photoURL: photoURL,
      });

      logger.info(
        "Successfully created new user in Firebase Auth:",
        userRecord.uid
      );

      const adminDocRef = db.collection(ADMINS_COLLECTION).doc(userRecord.uid);
      const firestoreAdminData = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: name,
        role: role,
        avatar: photoURL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        allowedCategoryIds:
          role === UserRole.SUB_ADMIN ? allowedCategoryIds : [],
        canSendNotifications: role === UserRole.SUPER_ADMIN ? true : canSendNotifications,
      };

      await adminDocRef.set(firestoreAdminData);
      logger.info(
        "Successfully created Firestore admin document for:",
        userRecord.uid
      );

      return {
        success: true,
        message: `Admin user ${name} created successfully.`,
        userId: userRecord.uid,
      };
    } catch (error: unknown) {
      logger.error("Error creating new admin user:", error);
      let errorCode: HttpsError["code"] = "unknown";
      let errorMessage = "Failed to create new admin user.";
      if (error && typeof error === "object" && "code" in error) {
        const firebaseErrorCode = (error as {code: string}).code;
        switch (firebaseErrorCode) {
          case "auth/email-already-exists":
            errorCode = "already-exists";
            errorMessage =
              "The email address is already in use by another account.";
            break;
          case "auth/invalid-email":
            errorCode = "invalid-argument";
            errorMessage = "The email address is not valid.";
            break;
          case "auth/weak-password":
            errorCode = "invalid-argument";
            errorMessage = "The new password is too weak.";
            break;
          default:
            errorCode = "internal";
            errorMessage =
              (error as unknown as Error).message ||
              "An internal error occurred during auth user creation.";
        }
        throw new HttpsError(errorCode, errorMessage, {
          originalCode: firebaseErrorCode,
        });
      }
      throw new HttpsError(
        "internal",
        (error as unknown as Error).message || "An unknown error occurred."
      );
    }
  }
);


// --- V2 Callable Function: Delete Admin User ---
interface DeleteAdminUserData {
  targetUserId: string;
}

export const deleteAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<DeleteAdminUserData>) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    try {
      const callerAdminDoc = await db.collection(ADMINS_COLLECTION).doc(callerUid).get();
      if (!callerAdminDoc.exists || callerAdminDoc.data()?.role !== UserRole.SUPER_ADMIN) {
        throw new HttpsError("permission-denied", "Caller does not have Super Admin privileges to delete users.");
      }
    } catch (error) {
      logger.error("Error checking caller permissions for user deletion:", error);
      throw new HttpsError("internal", "Could not verify caller permissions.");
    }

    const {targetUserId} = request.data;
    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "targetUserId is required.");
    }

    if (callerUid === targetUserId) {
      throw new HttpsError("permission-denied", "You cannot delete your own account.");
    }

    try {
      const targetUserRecord = await fAuth.getUser(targetUserId);
      if (targetUserRecord.email === "super@example.com") {
        throw new HttpsError("permission-denied", "Cannot delete the primary super admin account.");
      }

      // Delete from Auth
      await fAuth.deleteUser(targetUserId);
      logger.info(`Successfully deleted user ${targetUserId} from Firebase Auth.`);
      
      // Delete from Firestore
      await db.collection(ADMINS_COLLECTION).doc(targetUserId).delete();
      logger.info(`Successfully deleted Firestore admin document for ${targetUserId}.`);
      
      return { success: true, message: `Admin user ${targetUserRecord.displayName || targetUserRecord.email} has been deleted successfully.` };
    } catch (error: any) {
      logger.error(`Error deleting admin user ${targetUserId}:`, error);
      if (error.code === "auth/user-not-found") {
        try {
           await db.collection(ADMINS_COLLECTION).doc(targetUserId).delete();
           logger.info(`Firestore admin document for non-auth user ${targetUserId} deleted.`);
           return { success: true, message: "User not found in Auth, but Firestore document deleted." };
        } catch (firestoreError: any) {
          logger.error(`Error deleting Firestore document for non-auth user ${targetUserId}:`, firestoreError);
          throw new HttpsError("internal", `Failed to delete user: ${firestoreError.message}`);
        }
      }
      throw new HttpsError("internal", `Failed to delete user: ${error.message}`);
    }
  }
);

    