
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
        
        console.log("Calling 'createAdminUser' Cloud Function with payload:", payload);
        const result = await callCreateAdmin(payload) as HttpsCallableResult<{success?: boolean; message?: string; error?: string; userId?: string}>;
        console.log("Cloud Function 'createAdminUser' responded:", result.data);

        if (result.data.success) {
            revalidatePath("/admin/users");
            return { success: true, message: result.data.message || `Admin user "${data.name}" created successfully.` };
        } else {
            return { error: result.data.error || "Cloud Function-оос тодорхойгүй алдаа гарлаа." };
        }
    } catch (error: any) {
        console.error("Error calling 'createAdminUser' Cloud Function:", error);
        let errorMessage = error.message || "Админ хэрэглэгч нэмэхэд алдаа гарлаа.";
        if (error.code === 'unavailable') {
            errorMessage = "Cloud Function-тэй холбогдож чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.";
        }
        return { error: errorMessage };
    }
}


export async function updateAdminUser(
  userId: string,
  data: Partial<Pick<UserProfile, "name" | "email" | "role" | "allowedCategoryIds">> & { newPassword?: string }
): Promise<{ success?: boolean; error?: string; message?: string }> {
  try {
    const adminDocRef = doc(db, ADMINS_COLLECTION, userId);
    const currentFirestoreUserSnap = await getDoc(adminDocRef);
    if (!currentFirestoreUserSnap.exists()) {
        return { error: "Админ хэрэглэгч олдсонгүй." };
    }
    const currentFirestoreData = currentFirestoreUserSnap.data();
    const currentFirestoreEmail = currentFirestoreData?.email;

    const updateDataForFirestore: any = { updatedAt: serverTimestamp() };

    if (data.name && data.name !== currentFirestoreData?.name) updateDataForFirestore.name = data.name;
    if (data.email && data.email !== currentFirestoreEmail) updateDataForFirestore.email = data.email;
    if (data.role && data.role !== currentFirestoreData?.role) updateDataForFirestore.role = data.role;
    
    if (data.role && data.role !== UserRole.SUB_ADMIN) {
      updateDataForFirestore.allowedCategoryIds = []; 
    } else if (data.role === UserRole.SUB_ADMIN) {
      updateDataForFirestore.allowedCategoryIds = data.allowedCategoryIds || [];
    } else if (data.hasOwnProperty('allowedCategoryIds') && data.allowedCategoryIds !== currentFirestoreData?.allowedCategoryIds) {
        updateDataForFirestore.allowedCategoryIds = data.allowedCategoryIds;
    }

    if (Object.keys(updateDataForFirestore).length > 1) { // if more than just updatedAt
        await updateDoc(adminDocRef, updateDataForFirestore);
        console.log(`Firestore document for admin ${userId} updated with new details.`);
    } else {
        console.log(`No changes to Firestore document for admin ${userId} other than potentially Auth updates.`);
    }


    let authUpdateAttempted = false;
    let authUpdateMessage = "";
    let authUpdateError = "";

    const payloadToCloudFunction: any = { targetUserId: userId };
    let needsCloudFunctionCall = false;

    if (data.email && data.email !== currentFirestoreEmail) {
        payloadToCloudFunction.newEmail = data.email;
        needsCloudFunctionCall = true;
        console.log(`Email change detected for ${userId}. Old: ${currentFirestoreEmail}, New: ${data.email}. Will call Cloud Function.`);
    }
    if (data.newPassword) {
        if (data.newPassword.length < 6) {
            return { error: "Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой." };
        }
        payloadToCloudFunction.newPassword = data.newPassword;
        needsCloudFunctionCall = true;
        console.log(`New password provided for ${userId}. Will call Cloud Function.`);
    }
    
    if (needsCloudFunctionCall) {
        authUpdateAttempted = true;
        console.log(`Attempting to call Cloud Function 'updateAdminAuthDetails' for user ${userId} with payload:`, JSON.stringify(payloadToCloudFunction));
        try {
            const functions = getFunctions(clientApp, 'us-central1'); 
            const callUpdateAuth = httpsCallable(functions, 'updateAdminAuthDetails');
            
            const resultFromCF = await callUpdateAuth(payloadToCloudFunction) as HttpsCallableResult<{success?: boolean; message?: string; error?: string}>;
            
            if (resultFromCF.data.success) {
                authUpdateMessage += ` ${resultFromCF.data.message || "Firebase Authentication амжилттай шинэчлэгдлээ."}`;
                console.log(`Cloud Function 'updateAdminAuthDetails' successful for user ${userId}. Response:`, resultFromCF.data);
            } else {
                authUpdateError += ` Cloud Function алдаа: ${resultFromCF.data.message || resultFromCF.data.error || "Cloud Function-оос тодорхойгүй алдаа."}`;
                console.warn(`Cloud Function 'updateAdminAuthDetails' for user ${userId} reported an issue:`, resultFromCF.data);
            }
        } catch (cfError: any) {
            console.error(`Error calling Cloud Function 'updateAdminAuthDetails' for user ${userId}:`, cfError);
            authUpdateError += ` Firebase Authentication шинэчлэхэд алдаа гарлаа: ${cfError.message} (Код: ${cfError.code || 'N/A'}).`;
        }
    }
    
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}/edit`);

    let finalMessage = "Админ хэрэглэгчийн мэдээлэл шинэчлэгдлээ.";
    if (Object.keys(updateDataForFirestore).length > 1) { // Firestore was updated
        finalMessage = "Админ хэрэглэгчийн Firestore дахь мэдээлэл амжилттай шинэчлэгдлээ.";
    }

    if (authUpdateAttempted) {
        if (authUpdateError) {
             return { 
                success: Object.keys(updateDataForFirestore).length > 1, // Firestore update might have been successful
                error: authUpdateError, 
                message: `${finalMessage}${authUpdateError}`
            };
        } else {
            finalMessage += authUpdateMessage;
        }
    }
    
    if (!needsCloudFunctionCall && Object.keys(updateDataForFirestore).length === 1 && updateDataForFirestore.updatedAt) {
        finalMessage = "Засварлах өгөгдөл олдсонгүй эсвэл өөрчлөлт хийгдээгүй.";
    }


    return { 
        success: true, 
        message: finalMessage 
    };

  } catch (error: any) {
    console.error("Error in updateAdminUser outer try-catch:", error);
    return { error: error.message || "Админ хэрэглэгчийн мэдээллийг шинэчлэхэд ерөнхий алдаа гарлаа." };
  }
}


export async function getAdminUsers(): Promise<UserProfile[]> {
  try {
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const q = query(adminsRef, orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => { // Renamed doc to docSnap
      const data = docSnap.data();
      users.push({
        id: docSnap.id,
        uid: data.uid || docSnap.id, 
        name: data.name || '',
        email: data.email || '',
        role: data.role || UserRole.SUB_ADMIN,
        avatar: data.avatar,
        allowedCategoryIds: data.allowedCategoryIds || [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined, // Handle Timestamp
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined, // Handle Timestamp
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
        uid: data.uid || docSnap.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || UserRole.SUB_ADMIN,
        avatar: data.avatar,
        allowedCategoryIds: data.allowedCategoryIds || [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined, // Handle Timestamp
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined, // Handle Timestamp
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
        // Firebase Admin SDK ашиглан Auth хэрэглэгчийг устгах шаардлагатай.
        // Энэ Server Action нь зөвхөн Firestore-оос устгана.
        // Ирээдүйд Cloud Function дуудаж Auth-оос устгаж болно.
        const adminDocRef = doc(db, ADMINS_COLLECTION, id);
        await deleteDoc(adminDocRef);
        revalidatePath("/admin/users");
        console.log(`Admin user record ${id} deleted from Firestore. Auth record needs manual deletion or via Admin SDK.`);
        return { 
            success: true, 
            message: "Админ хэрэглэгчийн Firestore дахь бичлэг устгагдлаа. Firebase Authentication дахь бүртгэлийг устгахын тулд Admin SDK (Cloud Function) ашиглах эсвэл Firebase console-оос гараар устгах шаардлагатай." 
        };
    } catch (error: any) {
        console.error("Error deleting admin user from Firestore:", error);
        return { error: error.message || "Админ хэрэглэгчийн Firestore бичлэгийг устгахад алдаа гарлаа." };
    }
}

export async function sendAdminPasswordResetEmail(email: string): Promise<{ success?: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(clientAuth, email);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    let friendlyMessage = error.message || "Нууц үг сэргээх имэйл илгээхэд алдаа гарлаа.";
    if (error.code === 'auth/user-not-found') {
        friendlyMessage = "Энэ имэйл хаягтай хэрэглэгч Firebase Authentication-д олдсонгүй.";
    }
    return { error: friendlyMessage };
  }
}
