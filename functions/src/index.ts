// functions/src/index.ts

import {
  onCall,
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {UserRole} from "./types";

// Firebase Admin SDK-г эхлүүлнэ (зөвхөн нэг удаа)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const fAuth = admin.auth(); // Firebase Admin Auth instance

// Client-аас ирэх payload-ийн төрөл
interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  fcmTokens?: string[];
}
interface UserProfile {
  id: string;
  name: string;
  email: string;
}
interface SendNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: string | null; // Comes as ISO string from client
  selectedUsers: Pick<AppUser, "id" | "email" | "displayName" | "fcmTokens">[];
  adminCreator: Pick<UserProfile, "id" | "name" | "email">;
}

// Firestore-д хадгалах log-ийн төрлүүд
interface NotificationTargetForLog {
  userId: string;
  userEmail: string | undefined;
  userName: string | undefined;
  token: string;
  status: "pending";
}

interface NotificationLog {
    title: string;
    body: string;
    imageUrl: string | null;
    deepLink: string | null;
    adminCreator: Pick<UserProfile, "id" | "name" | "email">;
    createdAt: FirebaseFirestore.FieldValue;
    targets: NotificationTargetForLog[];
    processingStatus: "pending";
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
        "Missing required fields: title, body, and selectedUsers."
      );
    }

    const targets: NotificationTargetForLog[] = [];
    selectedUsers.forEach((user) => {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        user.fcmTokens.forEach((token: string) => {
          if (token) {
            targets.push({
              userId: user.id,
              userEmail: user.email,
              userName: user.displayName,
              token: token,
              status: "pending",
            });
          }
        });
      }
    });

    if (targets.length === 0) {
      return {
        success: false,
        message: "Сонгосон хэрэглэгчдэд идэвхтэй FCM token олдсонгүй.",
      };
    }

    const notificationLog: NotificationLog = {
      title,
      body,
      imageUrl: imageUrl || null,
      deepLink: deepLink || null,
      adminCreator,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      targets: targets,
      processingStatus: "pending",
      scheduleAt: scheduleAt ?
        admin.firestore.Timestamp.fromDate(new Date(scheduleAt)) :
        null,
    };

    try {
      const docRef = await db
        .collection("notifications")
        .add(notificationLog);
      logger.info(`Notification request ${docRef.id} saved for processing.`);
      return {
        success: true,
        message: `Мэдэгдэл илгээх хүсэлтийг хүлээн авлаа (ID: ${docRef.id}).`,
      };
    } catch (error: unknown) {
      logger.error("Error saving notification request to Firestore:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      throw new HttpsError("internal", "Мэдэгдэл хадгалахад алдаа гарлаа.", {
        details: errorMessage,
      });
    }
  }
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
          "Caller does not have Super Admin privileges."
        );
      }
    } catch (error) {
      logger.error("Error checking caller permissions:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Could not verify caller permissions."
      );
    }

    const {targetUserId, newEmail, newPassword} = request.data;
    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "targetUserId is required.");
    }
    if (!newEmail && !newPassword) {
      throw new HttpsError(
        "invalid-argument",
        "Either newEmail or newPassword must be provided."
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
          "Cannot change the email of the primary super admin account."
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
            "The new email address is not valid."
          );
        }
        updatePayloadAuth.email = newEmail;
        updatePayloadFirestore.email = newEmail;
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new HttpsError(
            "invalid-argument",
            "New password must be at least 6 characters long."
          );
        }
        updatePayloadAuth.password = newPassword;
      }

      if (Object.keys(updatePayloadAuth).length > 0) {
        await fAuth.updateUser(targetUserId, updatePayloadAuth);
        logger.info(
          `Successfully updated Firebase Auth for user: ${targetUserId}`,
          updatePayloadAuth
        );
      }

      await db
        .collection(ADMINS_COLLECTION)
        .doc(targetUserId)
        .update(updatePayloadFirestore);
      logger.info(
        `Successfully updated Firestore for user: ${targetUserId}`,
        updatePayloadFirestore
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
  }
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
      logger.error("Error checking caller permissions for user creation:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Could not verify caller permissions."
      );
    }

    const {email, password, name, role, allowedCategoryIds = []} = request.data;
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
