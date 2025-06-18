
// functions/src/index.ts

import {onDocumentCreated, FirestoreEvent} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Firebase Admin SDK-г эхлүүлнэ (зөвхөн нэг удаа)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// NotificationTarget-ийн орон нутгийн тодорхойлолт
interface FunctionNotificationTarget {
  userId: string;
  token: string;
  status: "pending" | "success" | "failed";
  userEmail?: string;
  userName?: string;
  error?: string;
  messageId?: string;
  attemptedAt?: FirebaseFirestore.FieldValue; // Firestore-д бичих үед Timestamp
}


// Firestore-ийн 'notifications' collection-д шинэ document үүсэхэд ажиллах функц
export const processNotificationRequest = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    region: "us-central1",
  },
  async (event: FirestoreEvent<FirebaseFirestore.DocumentSnapshot | undefined>) => {
    const notificationId = event.params.notificationId;
    const snapshot = event.data; // DocumentSnapshot

    if (!snapshot) {
      logger.error(
        `No data associated with event for notification ID: ${notificationId}`
      );
      return null;
    }

    const notificationData = snapshot.data();

    if (!notificationData) {
      logger.error(`Notification data is undefined for ID: ${notificationId}`);
      return null;
    }

    logger.info(
      `Processing notification request ID: ${notificationId}`,
      JSON.stringify(notificationData)
    );

    const {
      title,
      body,
      imageUrl,
      deepLink,
      targets, // Энэ нь { userId, token, status, ... } объектуудын массив байна
      scheduleAt, // Энэ нь Firestore Timestamp байх ёстой
      // adminCreator, // Ашиглагдаагүй тул хасав
    } = notificationData;

    // scheduleAt нь Firestore Timestamp байх ёстой
    if (scheduleAt && scheduleAt.toMillis() > Date.now() + 5 * 60 * 1000) {
      logger.info(
        `Notification ID: ${notificationId} is scheduled for ${new Date(
          scheduleAt.toMillis()
        ).toISOString()}. Skipping immediate send.`
      );
      try {
        await db.doc(`notifications/${notificationId}`).update({
          processingStatus: "scheduled",
        });
      } catch (updateError) {
        logger.error(
          `Error updating status to scheduled for ${notificationId}:`,
          updateError
        );
      }
      return null;
    }

    try {
      await db.doc(`notifications/${notificationId}`).update({
        processingStatus: "processing",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      logger.error(
        `Error updating status to processing for ${notificationId}:`,
        updateError
      );
    }

    const tokensToSend: string[] = [];
    // originalTargetsArray-ийн төрлийг FunctionNotificationTarget[] болгосон.
    const originalTargetsArray: FunctionNotificationTarget[] =
      Array.isArray(targets) ? targets.map((t: any) => ({...t})) : [];


    originalTargetsArray.forEach((target) => {
      if (target && target.token && target.status === "pending") {
        tokensToSend.push(target.token);
      }
    });

    if (tokensToSend.length === 0) {
      logger.info(
        `No valid pending tokens found for notification ID: ${notificationId}`
      );
      await db
        .doc(`notifications/${notificationId}`)
        .update({processingStatus: "completed_no_targets"})
        .catch((err) =>
          logger.error("Error updating to completed_no_targets:", err)
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
      `Sending ${tokensToSend.length} messages for notification ID: ` +
      `${notificationId}. Payload: ` +
      `${JSON.stringify(messagePayload.notification)}`
    );

    try {
      const response = await messaging.sendEachForMulticast(messagePayload);
      logger.info(
        `Successfully sent ${response.successCount} messages for ` +
        `notification ID: ${notificationId}`
      );
      if (response.failureCount > 0) {
        logger.warn(
          `Failed to send ${response.failureCount} messages for ` +
          `notification ID: ${notificationId}`
        );
      }

      let allSentSuccessfully = response.failureCount === 0;
      const updatedTargetsFirestore = [...originalTargetsArray];

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
            targetToUpdateInFirestore.status = "failed";
            targetToUpdateInFirestore.error =
              result.error?.message || "Unknown FCM error";
            logger.error(
              `Failed to send to token ${token} for ` +
              `notification ${notificationId}:`,
              result.error
            );
          }
          targetToUpdateInFirestore.attemptedAt =
            admin.firestore.FieldValue.serverTimestamp();
        }
      });

      await db.doc(`notifications/${notificationId}`).update({
        targets: updatedTargetsFirestore,
        processingStatus: allSentSuccessfully ?
          "completed" :
          "partially_completed",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(
        `Notification ID: ${notificationId} processing finished. Status: ${
          allSentSuccessfully ? "completed" : "partially_completed"
        }`
      );
    } catch (error) {
      logger.error(
        `Critical error sending multicast message for notification ID: ` +
        `${notificationId}:`,
        error
      );
      const updatedTargetsOnError = originalTargetsArray.map((t) => {
        if (t.status === "pending") {
          return {
            ...t,
            status: "failed" as const, // Use "as const" for literal type
            error: `General function error: ${(error as Error).message}`,
            attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
        }
        return t;
      });
      await db
        .doc(`notifications/${notificationId}`)
        .update({
          processingStatus: "error",
          targets: updatedTargetsOnError,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch((err) => logger.error(
          "Error updating to error status:", // Double quotes ensured
          err
        ));
    }
    return null;
  }
);
