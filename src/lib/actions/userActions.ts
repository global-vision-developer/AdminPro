
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

export type AdminUserData = Partial<Omit<UserProfile, "id" | "avatar">> & {
  id?: string;
  password?: string; 
  newPassword?: string; 
};

// This function now calls a Cloud Function to securely add a new admin user.
export async function addAdminUser(
  data: Required<Pick<UserProfile, "name" | "email" | "role">> & { password?: string; allowedCategoryIds?: string[] }
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
        };
        
        const result = await callCreateAdmin(payload) as HttpsCallableResult<{success?: boolean; message?: string; error?: string; userId?: string}>;

        if (result.data.success) {
            revalidatePath("/admin/users");
            return { success: true, message: result.data.message || `Admin user "${data.name}" created successfully.` };
        } else {
            return { error: result.data.error || "Cloud Function-оос тодорхойгүй алдаа гарлаа." };
        }
    } catch (error: any) {
        let errorMessage = error.message || "Админ хэрэглэгч нэмэхэд алдаа гарлаа.";
        if (error.code === 'unavailable' || error.code === 'not-found') {
            errorMessage = "Cloud Function-тэй холбогдож чадсангүй (not-found). Та Firebase төлөвлөгөөгөө шалгаж, функцүүдээ deploy хийсэн эсэхээ нягтална уу.";
        }
        return { error: errorMessage };
    }
}


export async function updateAdminUser(
  userId: string,
  data: Partial<Pick<UserProfile, "name" | "email" | "role" | "allowedCategoryIds" | "avatar">> & { newPassword?: string }
): Promise<{ success?: boolean; error?: string; message?: string }> {
  try {
    const adminDocRef = doc(db, ADMINS_COLLECTION, userId);
    
    // This action can be called from the main user list (Super Admin) or the profile page (self-update).
    // We create a flexible payload.
    const updatePayload: Record<string, any> = { updatedAt: serverTimestamp() };
    
    // Add fields to payload only if they are provided in the data object
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.avatar !== undefined) updatePayload.avatar = data.avatar;
    if (data.allowedCategoryIds !== undefined) updatePayload.allowedCategoryIds = data.allowedCategoryIds;
    
    // When updating from the profile page, we might only update name/avatar in Firestore.
    // When a Super Admin updates a user, it might involve Cloud Function calls for auth changes.
    // The logic below handles the more complex Super Admin case. The profile page logic is simpler and mostly client-side.
    if (data.email || data.newPassword) {
      const payloadToCloudFunction: any = { targetUserId: userId };
      let needsCloudFunctionCall = false;
      
      if (data.email) {
          payloadToCloudFunction.newEmail = data.email;
          needsCloudFunctionCall = true;
      }
      if (data.newPassword) {
           if (data.newPassword.length < 6) {
            return { error: "Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой." };
          }
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
                  return { error: `Auth update failed: ${cfError}` };
              }
          } catch (cfError: any) {
              return { error: `Calling Cloud Function failed: ${cfError.message}` };
          }
      }
    }

    // Update Firestore document with any changed data
    if (Object.keys(updatePayload).length > 1) {
        await updateDoc(adminDocRef, updatePayload);
    }

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}/edit`);
    revalidatePath(`/admin/profile`);

    return { 
        success: true, 
        message: "Profile details updated successfully in Firestore." 
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
    const users: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        id: docSnap.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || UserRole.SUB_ADMIN,
        avatar: data.avatar,
        allowedCategoryIds: data.allowedCategoryIds || [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      });
    });
    return users;
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
        name: data.name || '',
        email: data.email || '',
        role: data.role || UserRole.SUB_ADMIN,
        avatar: data.avatar,
        allowedCategoryIds: data.allowedCategoryIds || [],
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
        const adminDocRef = doc(db, ADMINS_COLLECTION, id);
        await deleteDoc(adminDocRef);
        revalidatePath("/admin/users");
        return { 
            success: true, 
            message: "Админ хэрэглэгчийн Firestore дахь бичлэг устгагдлаа. Firebase Authentication дахь бүртгэлийг устгахын тулд Admin SDK (Cloud Function) ашиглах эсвэл Firebase console-оос гараар устгах шаардлагатай." 
        };
    } catch (error: any) {
        return { error: error.message || "Админ хэрэглэгчийн Firestore бичлэгийг устгахад алдаа гарлаа." };
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
