/**
 * @fileoverview Client-side functions for managing "Admin User" data.
 * These functions call Cloud Functions for protected operations (create, update, delete)
 * and interact with Firebase Auth and Firestore for reading data.
 * 
 * Энэ файл нь Админ хэрэглэгчтэй холбоотой үйлдлүүдийг агуулна.
 * Үүсгэх, засах, устгах зэрэг хамгаалалттай үйлдлүүдийг Cloud Functions-руу дамжуулж,
 * унших үйлдлийг Firestore-оос шууд хийдэг.
 */

import { db, auth as clientAuth, app as clientApp } from "@/lib/firebase";
import type { UserProfile } from "@/types";
import { UserRole } from "@/types";
import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { 
  sendPasswordResetEmail
} from "firebase/auth";
import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';

const ADMINS_COLLECTION = "admins";

/**
 * Шинэ админ хэрэглэгч нэмнэ.
 * Энэ нь `createAdminUser` Cloud Function-г дууддаг.
 * @param data - Шинэ хэрэглэгчийн мэдээлэл (нэр, и-мэйл, нууц үг, эрх гэх мэт).
 * @returns Амжилттай болсон эсвэл алдааны мэдээлэл.
 */
export async function addAdminUser(
  data: Required<Pick<UserProfile, "name" | "email" | "role">> & { password?: string; allowedCategoryIds?: string[], canSendNotifications?: boolean }
): Promise<{ success?: boolean; error?: string; message?: string }> {
    if (!data.password) {
        return { error: "Нууц үг оруулах шаардлагатай." };
    }
    try {
        const functions = getFunctions(clientApp, 'us-central1');
        const callCreateAdmin = httpsCallable(functions, 'createAdminUser');
        
        const payload = {
            email: data.email,
            password: data.password,
            name: data.name,
            role: data.role,
            allowedCategoryIds: data.role === UserRole.SUB_ADMIN ? data.allowedCategoryIds || [] : [],
            canSendNotifications: data.role === UserRole.SUB_ADMIN ? data.canSendNotifications || false : true,
        };
        
        const result = await callCreateAdmin(payload) as HttpsCallableResult<{success?: boolean; message?: string; error?: string; userId?: string}>;

        if (result.data.success) {
            return { success: true, message: result.data.message || `Админ хэрэглэгч "${data.name}" амжилттай үүслээ.` };
        } else {
            return { error: result.data.error || "Cloud Function-оос тодорхойгүй алдаа гарлаа." };
        }
    } catch (error: any) {
        let errorMessage = error.message || "Админ хэрэглэгч нэмэхэд алдаа гарлаа.";
        if (error.code === 'functions/unavailable' || error.code === 'functions/not-found') {
            errorMessage = "Cloud Function-тэй холбогдож чадсангүй. Firebase төлөвлөгөө болон функцээ deploy хийсэн эсэхээ шалгана уу.";
        } else if (error.code === 'unauthenticated' || (error.details && error.details.code === 'unauthenticated')) {
            errorMessage = "Баталгаажуулалт шаардлагатай. Энэ функцийг нэвтэрсэн үед дуудах ёстой.";
        }
        return { error: errorMessage };
    }
}

/**
 * Одоо байгаа админ хэрэглэгчийн мэдээллийг шинэчилнэ.
 * Энэ нь `updateAdminAuthDetails` Cloud Function-г дууддаг.
 * @param userId - Засварлах хэрэглэгчийн ID.
 * @param data - Шинэчлэх мэдээлэл.
 * @returns Амжилттай болсон эсвэл алдааны мэдээлэл.
 */
export async function updateAdminUser(
  userId: string,
  data: Partial<Pick<UserProfile, "name" | "email" | "role" | "allowedCategoryIds" | "avatar" | "canSendNotifications">> & { newPassword?: string }
): Promise<{ success?: boolean; error?: string; message?: string }> {
  try {
    const functions = getFunctions(clientApp, 'us-central1');
    const callUpdateUser = httpsCallable(functions, 'updateAdminAuthDetails');

    const payload: any = { targetUserId: userId, ...data };
    
    const result = await callUpdateUser(payload) as HttpsCallableResult<{success?: boolean; message?: string; error?: string}>;

    if (result.data.success) {
        return { success: true, message: result.data.message || "Хэрэглэгчийн мэдээлэл амжилттай шинэчлэгдлээ." };
    } else {
        return { error: result.data.error || "Cloud Function-оос хэрэглэгч шинэчлэхэд алдаа гарлаа." };
    }
  } catch (error: any) {
    console.error("Error calling 'updateAdminAuthDetails' Cloud Function:", error);
    let errorMessage = error.message || "Админ хэрэглэгчийн мэдээллийг шинэчлэхэд ерөнхий алдаа гарлаа.";
     if (error.code === 'unauthenticated' || (error.details && error.details.code === 'unauthenticated')) {
        errorMessage = "Баталгаажуулалт шаардлагатай. Энэ функцийг нэвтэрсэн үед дуудах ёстой.";
     }
    return { error: errorMessage };
  }
}

/**
 * Бүх админ хэрэглэгчдийн жагсаалтыг Firestore-оос авна.
 * @returns Админ хэрэглэгчдийн массив.
 */
export async function getAdminUsers(): Promise<UserProfile[]> {
  try {
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const q = query(adminsRef, orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || UserRole.SUB_ADMIN,
        avatar: data.avatar,
        allowedCategoryIds: data.allowedCategoryIds || [],
        canSendNotifications: data.canSendNotifications === true,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return [];
  }
}

/**
 * Тодорхой нэг админ хэрэглэгчийн мэдээллийг Firestore-оос авна.
 * @param id - Авах гэж буй хэрэглэгчийн ID.
 * @returns Хэрэглэгчийн профайл эсвэл олдсонгүй бол `null`.
 */
export async function getAdminUser(id: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, ADMINS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || UserRole.SUB_ADMIN,
        avatar: data.avatar,
        allowedCategoryIds: data.allowedCategoryIds || [],
        canSendNotifications: data.canSendNotifications === true,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return null;
  }
}

/**
 * Админ хэрэглэгчийг устгана.
 * Энэ нь `deleteAdminUser` Cloud Function-г дууддаг.
 * @param id - Устгах хэрэглэгчийн ID.
 * @returns Амжилттай болсон эсвэл алдааны мэдээлэл.
 */
export async function deleteAdminUser(id: string): Promise<{ success?: boolean; error?: string, message?: string }> {
    try {
        const functions = getFunctions(clientApp, 'us-central1');
        const callDeleteAdmin = httpsCallable(functions, 'deleteAdminUser');
        
        const result = await callDeleteAdmin({ targetUserId: id }) as HttpsCallableResult<{success?: boolean; message?: string; error?: string}>;
        
        if (result.data.success) {
            return { success: true, message: result.data.message };
        } else {
            return { error: result.data.error || "Cloud функц алдаа буцаалаа." };
        }
    } catch (error: any) {
        console.error("Error calling 'deleteAdminUser' Cloud Function:", error);
         let errorMessage = error.message || "Хэрэглэгч устгах функцийг дуудахад алдаа гарлаа.";
         if (error.code === 'unauthenticated' || (error.details && error.details.code === 'unauthenticated')) {
            errorMessage = "Баталгаажуулалт шаардлагатай. Энэ функцийг нэвтэрсэн үед дуудах ёстой.";
         }
        return { error: errorMessage };
    }
}

/**
 * Админ хэрэглэгчийн нууц үгийг сэргээх и-мэйл илгээнэ.
 * @param email - Нууц үг сэргээх и-мэйл хаяг.
 * @returns Амжилттай болсон эсвэл алдааны мэдээлэл.
 */
export async function sendAdminPasswordResetEmail(email: string): Promise<{ success?: boolean; error?: string }> {
  try {
    await sendAdminPasswordResetEmail(clientAuth, email);
    return { success: true };
  } catch (error: any) {
    let friendlyMessage = error.message || "Нууц үг сэргээх имэйл илгээхэд алдаа гарлаа.";
    if (error.code === 'auth/user-not-found') {
        friendlyMessage = "Энэ имэйл хаягтай хэрэглэгч Firebase Authentication-д олдсонгүй.";
    }
    return { error: friendlyMessage };
  }
}
