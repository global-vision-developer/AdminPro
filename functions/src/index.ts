
// functions/src/index.ts

import {
  onDocumentCreated,
  type FirestoreEvent,
} from "firebase-functions/v2/firestore";
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

// NotificationTarget-ийн орон нутгийн тодорхойлолт
interface FunctionNotificationTarget {
  userId: string;
  token: string;
  status: "pending" | "success" | "failed";
  userEmail?: string;
  userName?: string;
  error?: string;
  messageId?: string;
  attemptedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export const processNotificationRequest = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    region: "us-central1",
  },
  async (
    event: FirestoreEvent<FirebaseFirestore.DocumentSnapshot | undefined>
  ) => {
    const notificationId = event.params.notificationId;
    const snapshot = event.data;

    if (!snapshot) {
      logger.error(`No data for event. ID: ${notificationId}`);
      return null;
    }

    const notificationData = snapshot.data();

    if (!notificationData) {
      logger.error(`Notification data undefined. ID: ${notificationId}`);
      return null;
    }

    logger.info(`Processing notification. ID: ${notificationId}`);

    const {
      title,
      body,
      imageUrl,
      deepLink,
      targets,
      scheduleAt,
      processingStatus,
    } = notificationData;

    // Check if the notification is ready to be processed
    const isReadyToProcess =
        processingStatus === "pending" ||
        (processingStatus === "scheduled" &&
          scheduleAt &&
          scheduleAt.toMillis() <= Date.now() + 5 * 60 * 1000);

    // If it's scheduled for a later time, do nothing and exit.
    if (processingStatus === "scheduled" && scheduleAt && scheduleAt.toMillis() > Date.now() + 5 * 60 * 1000) {
      logger.info(`ID ${notificationId} is scheduled for a later time. No action needed now.`);
      return null;
    }

    // If it's not pending or a due scheduled notification, exit.
    if (!isReadyToProcess) {
      logger.info(
          `ID ${notificationId} is not in a state to be processed (status: ${processingStatus}). Exiting.`
      );
      return null;
    }


    // Update status to 'processing' since it's ready.
    try {
      await db.doc(`notifications/${notificationId}`).update({
        processingStatus: "processing",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      logger.error(
        `Err upd status to processing. ID: ${notificationId}:`,
        updateError
      );
      return null; // Stop if status can't be updated
    }


    const tokensToSend: string[] = [];
    const typedTargets = targets as unknown as (FunctionNotificationTarget[] | undefined);

    const originalTargetsArray: FunctionNotificationTarget[] =
      Array.isArray(typedTargets) ?
        typedTargets.map(
          (t: FunctionNotificationTarget) => ({...t})
        ) : [];


    originalTargetsArray.forEach((target) => {
      if (target && target.token && target.status === "pending") {
        tokensToSend.push(target.token);
      }
    });

    if (tokensToSend.length === 0) {
      logger.info(`No valid pending tokens for ID: ${notificationId}`);
      await db
        .doc(`notifications/${notificationId}`)
        .update({processingStatus: "completed_no_targets"})
        .catch((err) =>
          logger.error("Err updating to completed_no_targets:", err)
        );
      return null;
    }

    const messagePayload: admin.messaging.MulticastMessage = {
      notification: {
        title: title || "New Notification",
        body: body || "You have a new message.",
        ...(imageUrl && {imageUrl: imageUrl as string}),
      },
      tokens: tokensToSend,
      data: {
        ...(deepLink && {deepLink: deepLink as string}),
        notificationId: notificationId,
      },
    };

    logger.info(
      `Sending ${tokensToSend.length} msgs for ID: ${notificationId}. ` +
      `Payload: ${JSON.stringify(messagePayload.notification)}`
    );

    try {
      const response = await messaging.sendEachForMulticast(messagePayload);
      logger.info(
        `Sent ${response.successCount} successful msgs for ID: ` +
        notificationId
      );
      if (response.failureCount > 0) {
        logger.warn(
          `Failed to send ${response.failureCount} msgs for ID: ` +
          notificationId
        );
      }

      let allSentSuccessfully = response.failureCount === 0;
      const updatedTargetsFirestore = [...originalTargetsArray];
      const currentTimestamp = admin.firestore.FieldValue.serverTimestamp();

      response.responses.forEach((result, index) => {
        const token = tokensToSend[index];
        const originalTargetIndex = originalTargetsArray.findIndex(
          (t) => t.token === token && t.status === "pending"
        );

        if (originalTargetIndex !== -1) {
          const targetToUpdateInFirestore: FunctionNotificationTarget =
            updatedTargetsFirestore[originalTargetIndex];
          if (result.success) {
            targetToUpdateInFirestore.status = "success";
            targetToUpdateInFirestore.messageId = result.messageId;
            delete targetToUpdateInFirestore.error;
          } else {
            allSentSuccessfully = false;
            targetToUpdateInFirestore.status = "failed" as const;
            targetToUpdateInFirestore.error =
              result.error?.message || "Unknown FCM error";
            logger.error(
              `Failed to send to token ${token} for notification ` +
              `${notificationId}:`,
              result.error
            );
          }
          targetToUpdateInFirestore.attemptedAt = currentTimestamp;
        }
      });

      const finalProcessingStatus = allSentSuccessfully ?
        "completed" :
        "partially_completed";

      await db.doc(`notifications/${notificationId}`).update({
        targets: updatedTargetsFirestore,
        processingStatus: finalProcessingStatus,
        processedAt: currentTimestamp,
      });

      logger.info(
        `ID: ${notificationId} processing finished. ` +
        `Status: ${finalProcessingStatus}`
      );
    } catch (error) {
      logger.error(
        `Critical error sending multicast for ID: ${notificationId}:`,
        error
      );
      const errorTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const updatedTargetsOnError = originalTargetsArray.map((t) => {
        if (t.status === "pending") {
          return {
            ...t,
            status: "failed" as const,
            error: `General function error: ${(error as Error).message}`,
            attemptedAt: errorTimestamp,
          };
        }
        return t;
      });
      try {
        await db
          .doc(`notifications/${notificationId}`)
          .update({
            processingStatus: "error",
            targets: updatedTargetsOnError,
            processedAt: errorTimestamp,
          });
      } catch (err) {
        logger.error("Error updating to error status:", err);
      }
    }
    return null;
  }
);

const ADMINS_COLLECTION = "admins";

// --- V2 Callable Function: Update Admin Auth Details ---
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
      throw new HttpsError("invalid-argument", "Either newEmail or newPassword must be provided.");
    }

    try {
      const targetUserRecord = await fAuth.getUser(targetUserId);
      if (
        targetUserRecord.email === "super@example.com" &&
        newEmail &&
        newEmail !== "super@example.com"
      ) {
        throw new HttpsError("permission-denied", "Cannot change the email of the primary super admin account.");
      }
    } catch (error: unknown) {
      logger.error("Error fetching target user for pre-check:", error);
    }

    try {
      const updatePayloadAuth: {email?: string; password?: string} = {};
      const updatePayloadFirestore: {email?: string; updatedAt: FirebaseFirestore.FieldValue} = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (newEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          throw new HttpsError("invalid-argument", "The new email address is not valid.");
        }
        updatePayloadAuth.email = newEmail;
        updatePayloadFirestore.email = newEmail;
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new HttpsError("invalid-argument", "New password must be at least 6 characters long.");
        }
        updatePayloadAuth.password = newPassword;
      }

      if (Object.keys(updatePayloadAuth).length > 0) {
        await fAuth.updateUser(targetUserId, updatePayloadAuth);
        logger.info(`Successfully updated Firebase Auth for user: ${targetUserId}`, updatePayloadAuth);
      }

      await db
        .collection(ADMINS_COLLECTION)
        .doc(targetUserId)
        .update(updatePayloadFirestore);
      logger.info(`Successfully updated Firestore for user: ${targetUserId}`, updatePayloadFirestore);

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
          errorMessage = (error as unknown as Error).message || "An internal error occurred during auth update.";
        }
        throw new HttpsError(errorCode, errorMessage, {originalCode: firebaseErrorCode});
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
}
export const createAdminUser = onCall(
  {region: "us-central1"},
  async (request: CallableRequest<CreateAdminUserData>) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    try {
      const callerAdminDoc = await db.collection(ADMINS_COLLECTION).doc(callerUid).get();
      if (!callerAdminDoc.exists || callerAdminDoc.data()?.role !== UserRole.SUPER_ADMIN) {
        throw new HttpsError("permission-denied", "Caller does not have Super Admin privileges to create users.");
      }
    } catch (error) {
      logger.error("Error checking caller permissions for user creation:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Could not verify caller permissions.");
    }

    const {email, password, name, role, allowedCategoryIds = []} = request.data;
    if (!email || !password || !name || !role) {
      throw new HttpsError("invalid-argument", "Missing required fields: email, password, name, role.");
    }
    if (password.length < 6) {
      throw new HttpsError("invalid-argument", "Password must be at least 6 characters long.");
    }

    try {
      logger.info(`'createAdminUser' called by ${callerUid} for new user ${email}.`);
      const photoURL = `https://placehold.co/100x100.png?text=${name.substring(0, 2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
      const userRecord = await fAuth.createUser({
        email: email,
        password: password,
        displayName: name,
        photoURL: photoURL,
      });

      logger.info("Successfully created new user in Firebase Auth:", userRecord.uid);

      const adminDocRef = db.collection(ADMINS_COLLECTION).doc(userRecord.uid);
      const firestoreAdminData = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: name,
        role: role,
        avatar: photoURL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        allowedCategoryIds: role === UserRole.SUB_ADMIN ? allowedCategoryIds : [],
      };

      await adminDocRef.set(firestoreAdminData);
      logger.info("Successfully created Firestore admin document for:", userRecord.uid);

      return {success: true, message: `Admin user ${name} created successfully.`, userId: userRecord.uid};
    } catch (error: unknown) {
      logger.error("Error creating new admin user:", error);
      let errorCode: HttpsError["code"] = "unknown";
      let errorMessage = "Failed to create new admin user.";
      if (error && typeof error === "object" && "code" in error) {
        const firebaseErrorCode = (error as {code: string}).code;
        switch (firebaseErrorCode) {
        case "auth/email-already-exists":
          errorCode = "already-exists";
          errorMessage = "The email address is already in use by another account.";
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
          errorMessage = (error as unknown as Error).message || "An internal error occurred during auth user creation.";
        }
        throw new HttpsError(errorCode, errorMessage, {originalCode: firebaseErrorCode});
      }
      throw new HttpsError("internal", (error as unknown as Error).message || "An unknown error occurred.");
    }
  }
);
