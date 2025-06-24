
"use server";

import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";

const USERS_COLLECTION = "users"; // Collection for app users, not admin users

export async function getAppUsers(): Promise<AppUser[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    // Consider adding orderBy if you have a relevant field like 'displayName' or 'email'
    // For now, fetching without specific order beyond Firestore's default
    const q = query(usersRef, orderBy("email", "asc")); 
    const querySnapshot = await getDocs(q);

    const users: AppUser[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // Simplified token handling to match the user's database structure.
      const tokens: string[] = [];
      if (typeof data.fcmToken === 'string' && data.fcmToken) {
        tokens.push(data.fcmToken);
      }

      return {
        id: doc.id,
        email: data.email || "",
        displayName: data.displayName || data.email?.split('@')[0] || "N/A", // Fallback for displayName
        fcmTokens: tokens,
        // Add other fields from your AppUser type if they exist in Firestore
        // e.g., createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
      } as AppUser;
    });
    return users;
  } catch (error: any) {
    console.error("Error getting app users from Firestore: ", error);
    // Consider more specific error handling or re-throwing if needed
    return []; // Return empty array on error to prevent UI crashes
  }
}
