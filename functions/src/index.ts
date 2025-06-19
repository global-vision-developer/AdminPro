
// functions/src/index.ts

import {
  onDocumentCreated,
  FirestoreEvent,
  // DocumentSnapshot, // Not directly used from here in v2
} from "firebase-functions/v2/firestore";
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
  attemptedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export const processNotificationRequest = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    region: "us-central1", // Таны Firebase project-ийн бүс нутаг
  },
  async (
    event: FirestoreEvent<FirebaseFirestore.DocumentSnapshot | undefined>
  ) => {
    const notificationId = event.params.notificationId;
    const snapshot = event.data; // DocumentSnapshot

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
    logger.debug("Notification Data:", notificationData);


    const {
      title,
      body,
      imageUrl,
      deepLink,
      targets, // Энэ нь { userId, token, status, ... } объектуудын массив байна
      scheduleAt, // Энэ нь Firestore Timestamp байх ёстой
    } = notificationData;

    // Хуваарьт илгээлт
    if (scheduleAt && scheduleAt.toMillis() > Date.now() + 5 * 60 * 1000) {
      const scheduledTime = new Date(scheduleAt.toMillis()).toISOString();
      logger.info(`ID ${notificationId} sched for later. Skipping.`);
      logger.debug(`Full scheduled time for ${notificationId}: ${scheduledTime}`);
      try {
        await db.doc(`notifications/${notificationId}`).update({
          processingStatus: "scheduled",
        });
      } catch (updateError) {
        logger.error(
          `Err upd status to scheduled. ID: ${notificationId}:`,
          updateError
        );
      }
      return null;
    }

    // Боловсруулж эхэлснийг тэмдэглэх
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
    }

    const tokensToSend: string[] = [];
    // `targets` нь DocumentData-аас ирж байгаа тул `any[]` байж болзошгүй.
    // `FunctionNotificationTarget` рүү cast хийж байна.
    const typedTargets = targets as unknown as (FunctionNotificationTarget[] | undefined);

    const originalTargetsArray: FunctionNotificationTarget[] =
      Array.isArray(typedTargets) ?
        typedTargets.map(
          (t: FunctionNotificationTarget) => ({...t}) // t-г FunctionNotificationTarget гэж үзнэ
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
      // Firestore-д хадгалах хуулбар
      const updatedTargetsFirestore = [...originalTargetsArray];
      const currentTimestamp = admin.firestore.FieldValue.serverTimestamp();

      response.responses.forEach((result, index) => {
        const token = tokensToSend[index];
        // Зөвхөн энэ илгээлтэд хамаарах 'pending' статустай,
        // ижил token-той анхны target-г олох
        const originalTargetIndex = originalTargetsArray.findIndex(
          (t) => t.token === token && t.status === "pending"
        );

        if (originalTargetIndex !== -1) {
          // Type assertion to ensure we are working with the correct type
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

      // Notification document-ийн ерөнхий статус болон targets-г шинэчлэх
      const finalProcessingStatus = allSentSuccessfully ?
        "completed" :
        "partially_completed";

      await db.doc(`notifications/${notificationId}`).update({
        targets: updatedTargetsFirestore,
        processingStatus: finalProcessingStatus,
        processedAt: currentTimestamp, // Эцсийн боловсруулсан цаг
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
      // Ерөнхий алдаа гарсан тохиолдолд
      // бүх pending target-уудын статусыг 'failed' болгох
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

