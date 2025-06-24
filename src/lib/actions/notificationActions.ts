
"use server";

import { db } from "@/lib/firebase";
import type { NotificationLog, NotificationTarget, AppUser, UserProfile } from "@/types";
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, orderBy, limit }
from "firebase/firestore";
import { revalidatePath } from "next/cache";

const NOTIFICATIONS_COLLECTION = "notifications";

interface CreateNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: Date | null;
  selectedUsers: Pick<AppUser, "id" | "email" | "displayName" | "fcmTokens">[];
  adminCreator: Pick<UserProfile, 'id' | 'name' | 'email'>;
}

export async function createNotificationEntry(
  payload: CreateNotificationPayload
): Promise<{ id: string } | { error: string }> {
  const { adminCreator } = payload;
  if (!adminCreator || !adminCreator.id) {
    return { error: "Admin not authenticated. Unable to create notification." };
  }

  try {
    const targets: NotificationTarget[] = [];
    payload.selectedUsers.forEach(user => {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        user.fcmTokens.forEach(token => {
          targets.push({
            userId: user.id,
            userEmail: user.email,
            userName: user.displayName || user.email?.split('@')[0],
            token: token,
            status: 'pending',
          });
        });
      }
    });

    if (targets.length === 0) {
      return { error: "No valid FCM tokens found for the selected users. Notification not created." };
    }

    const notificationData: Omit<NotificationLog, "id" | "createdAt" | "processedAt" > & { createdAt: any, scheduleAt?: any, processingStatus: string } = {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl || null,
      deepLink: payload.deepLink || null,
      adminCreator: {
        uid: adminCreator.id,
        email: adminCreator.email || "N/A",
        name: adminCreator.name || adminCreator.email?.split('@')[0] || "Admin",
      },
      createdAt: serverTimestamp(),
      targets: targets,
      processingStatus: 'pending', // Default status for immediate sends
    };

    // Only override status if it's a scheduled notification
    if (payload.scheduleAt) {
      notificationData.scheduleAt = Timestamp.fromDate(payload.scheduleAt);
      notificationData.processingStatus = 'scheduled';
    }

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
    
    revalidatePath("/admin/notifications"); 

    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error creating notification entry: ", e);
    return { error: e.message || "Failed to create notification entry." };
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
