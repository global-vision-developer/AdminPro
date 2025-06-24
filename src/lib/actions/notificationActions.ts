
"use server";

import { db } from "@/lib/firebase";
import type { NotificationLog, NotificationTarget } from "@/types";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";

const NOTIFICATIONS_COLLECTION = "notifications";

// The sendNotificationAction has been removed as it is now handled directly on the client
// in notifications/page.tsx to ensure authenticated calls to the Cloud Function.

export async function getNotificationLogs(): Promise<NotificationLog[]> {
  try {
    const logsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(logsRef, orderBy("createdAt", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Manually process targets to convert Timestamps to strings
      const rawTargets = data.targets || [];
      const processedTargets: NotificationTarget[] = rawTargets.map((target: any) => {
        const newTarget = { ...target };
        if (target.attemptedAt && target.attemptedAt instanceof Timestamp) {
          newTarget.attemptedAt = target.attemptedAt.toDate().toISOString();
        }
        return newTarget;
      });

      return {
        id: doc.id,
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl,
        deepLink: data.deepLink,
        scheduleAt: data.scheduleAt instanceof Timestamp ? data.scheduleAt.toDate().toISOString() : null,
        adminCreator: data.adminCreator,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        processingStatus: data.processingStatus,
        processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate().toISOString() : null,
        targets: processedTargets,
      } as NotificationLog;
    });
  } catch (error: any) {
    console.error("Error fetching notification logs:", error);
    return [];
  }
}

    
