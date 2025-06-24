
"use server";

import { db, app as clientApp } from "@/lib/firebase";
import type { NotificationLog, NotificationTarget, AppUser, UserProfile } from "@/types";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { revalidatePath } from "next/cache";

const NOTIFICATIONS_COLLECTION = "notifications";

interface SendNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: Date | null;
  selectedUsers: Pick<AppUser, "id" | "email" | "displayName" | "fcmTokens">[];
  adminCreator: Pick<UserProfile, 'id' | 'name' | 'email'>;
}

export async function sendNotificationAction(
  payload: SendNotificationPayload
): Promise<{ success: boolean; message: string } | { error: string }> {
  if (!payload.adminCreator || !payload.adminCreator.id) {
    return { error: "Админ нэвтрээгүй байна." };
  }

  try {
    const functions = getFunctions(clientApp, 'us-central1');
    const callSendNotification = httpsCallable(functions, 'sendNotification');
    
    // Convert Date object to ISO string for serialization
    const serializablePayload = {
      ...payload,
      scheduleAt: payload.scheduleAt ? payload.scheduleAt.toISOString() : null,
    };
    
    const result = await callSendNotification(serializablePayload) as HttpsCallableResult<{success: boolean; message: string}>;

    if (result.data.success) {
        revalidatePath("/admin/notifications"); 
        return { success: true, message: result.data.message };
    } else {
        return { error: result.data.message || "Cloud функцээс тодорхойгүй алдаа гарлаа." };
    }
  } catch (error: any) {
    console.error("Error calling 'sendNotification' Cloud Function:", error);
    let errorMessage = error.message || "Мэдэгдэл илгээхэд алдаа гарлаа.";
    if (error.code === 'unavailable' || error.code === 'not-found') {
        errorMessage = "Cloud функцтэй холбогдож чадсангүй. 'sendNotification' функц deploy хийгдсэн эсэхийг шалгана уу.";
    }
    return { error: errorMessage };
  }
}

export async function getNotificationLogs(): Promise<NotificationLog[]> {
  try {
    const logsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(logsRef, orderBy("createdAt", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
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
        targets: data.targets || [],
      } as NotificationLog;
    });
  } catch (error: any) {
    console.error("Error fetching notification logs:", error);
    return [];
  }
}
