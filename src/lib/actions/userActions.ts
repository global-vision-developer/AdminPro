
"use server";

import { db, auth as clientAuth, app as clientApp } from "@/lib/firebase";
import type { UserProfile } from "@/types";
import { UserRole } from "@/types";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
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
import { revalidatePath } from "next/cache";

const ADMINS_COLLECTION = "admins";

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
            revalidatePath("/admin/users");
            return { success: true, message: result.data.message || `Админ хэрэглэгч "${data.name}" амжилттай үүслээ.` };
        } else {
            return { error: result.data.error || "Cloud Function-оос тодорхойгүй алдаа гарлаа." };
        }
    } catch (error: any) {
        let errorMessage = error.message || "Админ хэрэглэгч нэмэхэд алдаа гарлаа.";
        if (error.code === 'functions/unavailable' || error.code === 'functions/not-found') {
            errorMessage = "Cloud Function-тэй холбогдож чадсангүй. Firebase төлөвлөгөө болон функцээ deploy хийсэн эсэхээ шалгана уу.";
        } else if (error.code === 'unauthenticated') {
            errorMessage = "Authentication required. The function must be called while authenticated.";
        }
        return { error: errorMessage };
    }
}


export async function updateAdminUser(
  userId: string,
  data: Partial<Pick<UserProfile, "name" | "email" | "role" | "allowedCategoryIds" | "avatar" | "canSendNotifications">> & { newPassword?: string }
): Promise<{ success?: boolean; error?: string; message?: string }> {
  try {
    const adminDocRef = doc(db, ADMINS_COLLECTION, userId);
    
    const updatePayloadFirestore: Record<string, any> = { updatedAt: serverTimestamp() };
    
    if (data.name !== undefined) updatePayloadFirestore.name = data.name;
    if (data.email !== undefined) updatePayloadFirestore.email = data.email;
    if (data.role !== undefined) updatePayloadFirestore.role = data.role;
    if (data.avatar !== undefined) updatePayloadFirestore.avatar = data.avatar;

    if (data.role === UserRole.SUB_ADMIN) {
      if (data.allowedCategoryIds !== undefined) {
        updatePayloadFirestore.allowedCategoryIds = data.allowedCategoryIds;
      }
      if (data.canSendNotifications !== undefined) {
        updatePayloadFirestore.canSendNotifications = data.canSendNotifications;
      }
    } else if (data.role === UserRole.SUPER_ADMIN) {
      updatePayloadFirestore.allowedCategoryIds = [];
      updatePayloadFirestore.canSendNotifications = true;
    }
    
    const currentDoc = await getDoc(adminDocRef);
    const currentEmail = currentDoc.data()?.email;

    if ((data.email && data.email !== currentEmail) || data.newPassword) {
      const payloadToCloudFunction: any = { targetUserId: userId };
      let needsCloudFunctionCall = false;

      if (data.email && data.email !== currentEmail) {
          payloadToCloudFunction.newEmail = data.email;
          needsCloudFunctionCall = true;
      }
      if (data.newPassword) {
          payloadToCloudFunction.newPassword = data.newPassword;
          needsCloudFunctionCall = true;
      }

      if (needsCloudFunctionCall) {
          try {
              const functions = getFunctions(clientApp, 'us-central1'); 
              const callUpdateAuth = httpsCallable(functions, 'updateAdminAuthDetails');
              const resultFromCF = await callUpdateAuth(payloadToCloudFunction) as HttpsCallableResult<{success?: boolean; message?: string; error?: string}>;

              if (!resultFromCF.data.success) {
                  const cfError = resultFromCF.data.message || resultFromCF.data.error || "Cloud Function-оос тодорхойгүй алдаа.";
                  return { error: `Auth шинэчлэлт амжилтгүй: ${cfError}` };
              }
          } catch (cfError: any) {
              return { error: `Cloud Function дуудахад алдаа гарлаа: ${cfError.message}` };
          }
      }
    }

    if (Object.keys(updatePayloadFirestore).length > 1) {
        await updateDoc(adminDocRef, updatePayloadFirestore);
    }

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}/edit`);
    revalidatePath(`/admin/profile`);

    return { 
        success: true, 
        message: "Хэрэглэгчийн мэдээлэл амжилттай шинэчлэгдлээ." 
    };

  } catch (error: any) {
    return { error: error.message || "Админ хэрэглэгчийн мэдээллийг шинэчлэхэд ерөнхий алдаа гарлаа." };
  }
}


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

export async function deleteAdminUser(id: string): Promise<{ success?: boolean; error?: string, message?: string }> {
    try {
        const functions = getFunctions(clientApp, 'us-central1');
        const callDeleteAdmin = httpsCallable(functions, 'deleteAdminUser');
        
        const result = await callDeleteAdmin({ targetUserId: id }) as HttpsCallableResult<{success?: boolean; message?: string; error?: string}>;
        
        if (result.data.success) {
            revalidatePath("/admin/users");
            return { success: true, message: result.data.message };
        } else {
            return { error: result.data.error || "Cloud функц алдаа буцаалаа." };
        }
    } catch (error: any) {
        console.error("Error calling 'deleteAdminUser' Cloud Function:", error);
        return { error: error.message || "Хэрэглэгч устгах функцийг дуудахад алдаа гарлаа." };
    }
}

export async function sendAdminPasswordResetEmail(email: string): Promise<{ success?: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(clientAuth, email);
    return { success: true };
  } catch (error: any) {
    let friendlyMessage = error.message || "Нууц үг сэргээх имэйл илгээхэд алдаа гарлаа.";
    if (error.code === 'auth/user-not-found') {
        friendlyMessage = "Энэ имэйл хаягтай хэрэглэгч Firebase Authentication-д олдсонгүй.";
    }
    return { error: friendlyMessage };
  }
}
