/**
 * @fileoverview Server-side actions for fetching application user data from the 'users' collection in Firestore.
 * This is distinct from admin users.
 * 
 * Энэ файл нь Firestore-ийн 'users' коллекциос аппликейшны хэрэглэгчийн өгөгдлийг авах сервер талын үйлдлүүдийг агуулдаг.
 * Энэ нь админ хэрэглэгчдээс ялгаатай.
 */
"use server";

import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";

const USERS_COLLECTION = "users"; // Апп хэрэглэгчдийн коллекци, админ хэрэглэгчдийнх биш

/**
 * Firestore-оос бүх апп хэрэглэгчдийн жагсаалтыг авна.
 * @returns Апп хэрэглэгчдийн массив.
 */
export async function getAppUsers(): Promise<AppUser[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy("email", "asc")); 
    const querySnapshot = await getDocs(q);

    const users: AppUser[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      const tokens: string[] = [];
      if (data.fcmToken && typeof data.fcmToken === 'string') {
        tokens.push(data.fcmToken);
      } else if (Array.isArray(data.fcmTokens)) {
        tokens.push(...data.fcmTokens);
      }

      return {
        id: doc.id,
        email: data.email || "",
        displayName: data.displayName || data.email?.split('@')[0] || "N/A",
        fcmTokens: tokens,
      } as AppUser;
    });
    return users;
  } catch (error: any) {
    console.error("Error getting app users from Firestore: ", error);
    return [];
  }
}

/**
 * Апп хэрэглэгчдийг ID-гаар нь хурдан хайх боломжтой Map үүсгэж буцаана.
 * @returns Хэрэглэгчийн ID-г түлхүүр болгосон хэрэглэгчийн мэдээллийн Map.
 */
export async function getAppUsersMap(): Promise<Record<string, AppUser>> {
  try {
    const users = await getAppUsers();
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, AppUser>);
  } catch (error) {
    console.error("Error creating app users map:", error);
    return {};
  }
}
