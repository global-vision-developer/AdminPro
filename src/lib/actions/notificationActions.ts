
"use server";

import { db, auth as adminAuth } from "@/lib/firebase"; // Using adminAuth to get current admin user
import type { NotificationLog, NotificationTarget, AppUser } from "@/types";
import { collection, addDoc, serverTimestamp, Timestamp }
from "firebase/firestore";
import { revalidatePath } from "next/cache";

const NOTIFICATIONS_COLLECTION = "notifications";

interface CreateNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  scheduleAt?: Date | null; // Date object from form
  selectedUsers: Pick<AppUser, "id" | "email" | "displayName" | "fcmTokens">[];
}

export async function createNotificationEntry(
  payload: CreateNotificationPayload
): Promise<{ id: string } | { error: string }> {
  const currentAdmin = adminAuth.currentUser;
  if (!currentAdmin) {
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
            status: 'pending', // Initial status
          });
        });
      }
    });

    if (targets.length === 0) {
      return { error: "No valid FCM tokens found for the selected users. Notification not created." };
    }

    const notificationData: Omit<NotificationLog, "id" | "createdAt" | "processedAt" | "processingStatus"> & { createdAt: any, scheduleAt?: any } = {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl || null,
      deepLink: payload.deepLink || null,
      adminCreator: {
        uid: currentAdmin.uid,
        email: currentAdmin.email || "N/A",
        name: currentAdmin.displayName || currentAdmin.email?.split('@')[0] || "Admin",
      },
      createdAt: serverTimestamp(),
      processingStatus: 'pending', // Initial processing status
      targets: targets,
    };

    if (payload.scheduleAt) {
      notificationData.scheduleAt = Timestamp.fromDate(payload.scheduleAt);
    }

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
    
    // Revalidate paths related to notifications if you have a history page
    revalidatePath("/admin/notifications"); 
    // Optionally, revalidate a specific notification log page if it exists
    // revalidatePath(`/admin/notifications/${docRef.id}`);

    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error creating notification entry: ", e);
    return { error: e.message || "Failed to create notification entry." };
  }
}

// Future: Action to get notification logs for display
// export async function getNotificationLogs(): Promise<NotificationLog[]> { ... }
