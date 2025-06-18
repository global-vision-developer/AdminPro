// functions/src/index.ts

import * as functions from "firebase-functions";
import *部落格admin from "firebase-admin";

// Firebase Admin SDK-г эхлүүлнэ (зөвхөн нэг удаа)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// Firestore-ийн 'notifications' collection-д шинэ document үүсэхэд ажиллах функц
export const processNotificationRequest = functions.region("us-central1") // Өөрийн region-оо сонгоорой
  .firestore.document("notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notificationId = context.params.notificationId;
    const notificationData = snapshot.data();

    if (!notificationData) {
      console.error(`Notification data not found for ID: ${notificationId}`);
      return null;
    }

    console.log(
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
      adminCreator, // Админы мэдээлэл
    } = notificationData;

    // Хуваарьт илгээлт (Энгийн жишээ):
    // Хэрэв scheduleAt нь ирээдүйн цаг бөгөөд одоогийн цагаас хол байвал (жишээ нь, 5 минутаас илүү)
    // функцийг дуусгаад, Cloud Scheduler ашиглан дараа нь дахин ажиллуулах эсвэл
    // энэ функц дотроо setTimeout ашиглаж болно (удаан ажилладаг функцэд тохиромжгүй).
    // Илүү найдвартай шийдэл нь Cloud Scheduler ашиглах явдал юм.
    if (scheduleAt && scheduleAt.toMillis() > Date.now() + 5 * 60 * 1000) {
      console.log(
        `Notification ID: ${notificationId} is scheduled for ${new Date(
          scheduleAt.toMillis()
        ).toISOString()}. Skipping immediate send.`
      );
      // Та энд notification document-ийн статусыг 'scheduled' болгож шинэчилж болно.
      try {
        await db.doc(`notifications/${notificationId}`).update({
          processingStatus: "scheduled",
        });
      } catch (updateError) {
        console.error(
          `Error updating status to scheduled for ${notificationId}:`,
          updateError
        );
      }
      return null; // Эсвэл дараа нь retry хийх логик нэмнэ.
    }

    // Боловсруулж эхэлснийг тэмдэглэх
    try {
      await db.doc(`notifications/${notificationId}`).update({
        processingStatus: "processing",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error(
        `Error updating status to processing for ${notificationId}:`,
        updateError
      );
      // Алдаа гарсан ч үргэлжлүүлээд илгээхийг оролдож болно, эсвэл эндээс буцааж болно.
    }

    const tokensToSend: string[] = [];
    const originalTargetsArray: any[] = Array.isArray(targets) ? targets : [];
    const targetUpdatesPromises: Promise<void>[] = [];

    originalTargetsArray.forEach((target) => {
      if (target && target.token && target.status === "pending") {
        tokensToSend.push(target.token);
      }
    });

    if (tokensToSend.length === 0) {
      console.log(
        `No valid pending tokens found for notification ID: ${notificationId}`
      );
      await db
        .doc(`notifications/${notificationId}`)
        .update({ processingStatus: "completed_no_targets" })
        .catch((err) =>
          console.error("Error updating to completed_no_targets:", err)
        );
      return null;
    }

    const messagePayload: admin.messaging.MulticastMessage = {
      notification: {
        title: title || "New Notification",
        body: body || "You have a new message.",
        ...(imageUrl && { imageUrl: imageUrl as string }),
      },
      tokens: tokensToSend,
      data: {
        ...(deepLink && { deepLink: deepLink as string }),
        notificationId: notificationId, // Апп талд хэрэг болж магадгүй
      },
      // Android, APNS, Webpush-д зориулсан нэмэлт тохиргоо энд хийж болно.
      // Жишээ нь:
      // android: {
      //   notification: {
      //     clickAction: deepLink ? 'FLUTTER_NOTIFICATION_CLICK' : undefined, // Android-д click_action
      //   },
      // },
      // apns: {
      //   payload: {
      //     aps: {
      //       category: deepLink ? 'NAVIGATION_CATEGORY' : undefined, // iOS-д category
      //       sound: 'default',
      //     },
      //   },
      // },
    };

    console.log(
      `Sending ${
        tokensToSend.length
      } messages for notification ID: ${notificationId}. Payload: ${JSON.stringify(
        messagePayload.notification
      )}`
    );

    try {
      const response = await messaging.sendEachForMulticast(messagePayload);
      console.log(
        `Successfully sent ${response.successCount} messages for notification ID: ${notificationId}`
      );
      if (response.failureCount > 0) {
        console.warn(
          `Failed to send ${response.failureCount} messages for notification ID: ${notificationId}`
        );
      }

      let allSentSuccessfully = response.failureCount === 0;

      // Илгээлтийн үр дүнг target бүрээр шинэчлэх
      const updatedTargetsFirestore = [...originalTargetsArray]; // Firestore-д хадгалах хуулбар

      response.responses.forEach((result, index) => {
        const token = tokensToSend[index];
        // Зөвхөн энэ илгээлтэд хамаарах 'pending' статустай, ижил token-той анхны target-г олох
        const originalTargetIndex = originalTargetsArray.findIndex(
          (t) => t.token === token && t.status === "pending"
        );

        if (originalTargetIndex !== -1) {
          const targetToUpdateInFirestore =
            updatedTargetsFirestore[originalTargetIndex];
          if (result.success) {
            targetToUpdateInFirestore.status = "success";
            targetToUpdateInFirestore.messageId = result.messageId;
            delete targetToUpdateInFirestore.error; // Алдаагүй бол алдааны мэдээллийг цэвэрлэх
          } else {
            allSentSuccessfully = false;
            targetToUpdateInFirestore.status = "failed";
            targetToUpdateInFirestore.error =
              result.error?.message || "Unknown FCM error";
            console.error(
              `Failed to send to token ${token} for notification ${notificationId}:`,
              result.error
            );
          }
          targetToUpdateInFirestore.attemptedAt =
            admin.firestore.FieldValue.serverTimestamp();
        }
      });

      // Notification document-ийн ерөнхий статус болон targets-г шинэчлэх
      await db.doc(`notifications/${notificationId}`).update({
        targets: updatedTargetsFirestore,
        processingStatus: allSentSuccessfully
          ? "completed"
          : "partially_completed",
        processedAt: admin.firestore.FieldValue.serverTimestamp(), // Эцсийн боловсруулсан цаг
      });

      console.log(
        `Notification ID: ${notificationId} processing finished. Status: ${
          allSentSuccessfully ? "completed" : "partially_completed"
        }`
      );
    } catch (error) {
      console.error(
        `Critical error sending multicast message for notification ID: ${notificationId}:`,
        error
      );
      // Ерөнхий алдаа гарсан тохиолдолд бүх pending target-уудын статусыг 'failed' болгох
      const updatedTargetsOnError = originalTargetsArray.map((t) => {
        if (t.status === "pending") {
          return {
            ...t,
            status: "failed",
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
        .catch((err) => console.error("Error updating to error status:", err));
    }
    return null;
  });

    