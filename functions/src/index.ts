
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

// Client-аас ирэх payload-ийн төрөл
interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  fcmTokens?: string[];
}
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
  selectedUsers: Pick<AppUser, "id" | "email" | "displayName" | "fcmTokens">[];
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
  processingStatus: "completed" | "partially_completed" | "scheduled" | "completed_no_targets";
  scheduleAt: FirebaseFirestore.Timestamp | null;
}


export const sendNotification = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<SendNotificationPayload>) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }

    try {
      const {
        title,
        body,
        imageUrl,
        deepLink,
        scheduleAt,
        selectedUsers,
        adminCreator,
      } = request.data;

      if (
        !title ||
        !body ||
        !selectedUsers ||
        !Array.isArray(selectedUsers) ||
        selectedUsers.length === 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: title, body, and selectedUsers.",
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

      const tokensToSend: string[] = [];
      const targetsForLog: NotificationTargetForLog[] = [];
      const tokenToUserMap = new Map<string, AppUser>();

      selectedUsers.forEach((user) => {
        if (user.fcmTokens && user.fcmTokens.length > 0) {
          user.fcmTokens.forEach((token: string) => {
            if (token && !tokenToUserMap.has(token)) {
              tokensToSend.push(token);
              tokenToUserMap.set(token, user);
            }
          });
        }
      });

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

      const messagePayload: admin.messaging.MulticastMessage = {
        notification: {
          title: title,
          body: body,
          ...(imageUrl && {imageUrl: imageUrl}),
        },
        tokens: tokensToSend,
        data: {
          ...(deepLink && {deepLink: deepLink}),
        },
      };

      logger.info(`Sending ${tokensToSend.length} messages.`);
      const response = await messaging.sendEachForMulticast(messagePayload);
      const currentTimestamp = admin.firestore.Timestamp.now();

      response.responses.forEach((result, index) => {
        const token = tokensToSend[index];
        const user = tokenToUserMap.get(token);
        targetsForLog.push({
          userId: user?.id || "unknown",
          userEmail: user?.email,
          userName: user?.displayName,
          token: token,
          status: result.success ? "success" : "failed",
          messageId: result.success ? result.messageId : undefined,
          error: result.success ? undefined : result.error?.message,
          attemptedAt: currentTimestamp,
        });
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
    } catch (error) {
      logger.error("Error in sendNotification function:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "An unexpected error occurred while sending the notification.", {
        originalErrorMessage: (error as Error).message,
      });
    }
  },
);


// --- V2 Callable Function: Update Admin Auth Details ---
const ADMINS_COLLECTION = "admins";

interface UpdateAdminAuthDetailsData {
  targetUserId: string;
  newEmail?: string;
  newPassword?: string;
}

export const updateAdminAuthDetails = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<UpdateAdminAuthDetailsData>) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
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
          "Caller does not have Super Admin privileges.",
        );
      }
    } catch (error) {
      logger.error("Error checking caller permissions:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Could not verify caller permissions.",
      );
    }

    const {targetUserId, newEmail, newPassword} = request.data;
    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "targetUserId is required.");
    }
    if (!newEmail && !newPassword) {
      throw new HttpsError(
        "invalid-argument",
        "Either newEmail or newPassword must be provided.",
      );
    }

    try {
      const targetUserRecord = await fAuth.getUser(targetUserId);
      if (
        targetUserRecord.email === "super@example.com" &&
        newEmail &&
        newEmail !== "super@example.com"
      ) {
        throw new HttpsError(
          "permission-denied",
          "Cannot change the email of the primary super admin account.",
        );
      }
    } catch (error: unknown) {
      logger.error("Error fetching target user for pre-check:", error);
    }

    try {
      const updatePayloadAuth: {email?: string; password?: string} = {};
      const updatePayloadFirestore: {
        email?: string;
        updatedAt: FirebaseFirestore.FieldValue;
      } = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (newEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          throw new HttpsError(
            "invalid-argument",
            "The new email address is not valid.",
          );
        }
        updatePayloadAuth.email = newEmail;
        updatePayloadFirestore.email = newEmail;
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new HttpsError(
            "invalid-argument",
            "New password must be at least 6 characters long.",
          );
        }
        updatePayloadAuth.password = newPassword;
      }

      if (Object.keys(updatePayloadAuth).length > 0) {
        await fAuth.updateUser(targetUserId, updatePayloadAuth);
        logger.info(
          `Successfully updated Firebase Auth for user: ${targetUserId}`,
          updatePayloadAuth,
        );
      }

      await db
        .collection(ADMINS_COLLECTION)
        .doc(targetUserId)
        .update(updatePayloadFirestore);
      logger.info(
        `Successfully updated Firestore for user: ${targetUserId}`,
        updatePayloadFirestore,
      );

      return {
        success: true,
        message: "Admin authentication and Firestore details updated successfully.",
      };
    } catch (error: unknown) {
      logger.error("Error updating admin auth details:", error);
      let errorCode: HttpsError["code"] = "unknown";
      let errorMessage = "Failed to update admin authentication details.";
      if (error && typeof error === "object" && "code" in error) {
        const firebaseErrorCode = (error as {code: string}).code;
        switch (firebaseErrorCode) {
          case "auth/email-already-exists":
            errorCode = "already-exists";
            errorMessage =
              "The new email address is already in use by another account.";
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
            errorMessage =
              (error as unknown as Error).message ||
              "An internal error occurred during auth update.";
        }
        throw new HttpsError(errorCode, errorMessage, {
          originalCode: firebaseErrorCode,
        });
      } else {
        errorMessage =
          (error as unknown as Error).message || "An unknown error occurred.";
        throw new HttpsError("internal", errorMessage);
      }
    }
  },
);

// --- V2 Callable Function: Create a new Admin User ---
interface CreateAdminUserData {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  allowedCategoryIds?: string[];
}
export const createAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateAdminUserData>) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
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
          "Caller does not have Super Admin privileges to create users.",
        );
      }
    } catch (error) {
      logger.error("Error checking caller permissions for user creation:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Could not verify caller permissions.",
      );
    }

    const {email, password, name, role, allowedCategoryIds = []} = request.data;
    if (!email || !password || !name || !role) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: email, password, name, role.",
      );
    }
    if (password.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters long.",
      );
    }

    try {
      logger.info(`'createAdminUser' called by ${callerUid} for new user ${email}.`);
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
        userRecord.uid,
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
      };

      await adminDocRef.set(firestoreAdminData);
      logger.info(
        "Successfully created Firestore admin document for:",
        userRecord.uid,
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
        (error as unknown as Error).message || "An unknown error occurred.",
      );
    }
  },
);
