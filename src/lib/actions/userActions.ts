
"use server";

import { db, auth as clientAuth } from "@/lib/firebase"; // Renamed to avoid confusion with adminAuth
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
  orderBy
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  updateProfile as updateAuthProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { revalidatePath } from "next/cache";

const ADMINS_COLLECTION = "admins";

// This type is for data submitted from the form, may not include password for updates
export type AdminUserData = Partial<Omit<UserProfile, "id" | "avatar">> & {
  id?: string; // For updates
  password?: string; // Only for creation
  newPassword?: string; // For password change during edit
};


export async function addAdminUser(
  data: Required<Pick<UserProfile, "name" | "email" | "role">> & { password?: string; allowedCategoryIds?: string[] }
): Promise<{ user?: UserProfile; error?: string; message?: string }> {
    if (!data.password) {
        return { error: "Нууц үг оруулах шаардлагатай." };
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(clientAuth, data.email, data.password);
        const firebaseUser = userCredential.user;

        const photoURL = `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
        await updateAuthProfile(firebaseUser, { displayName: data.name, photoURL });

        const adminDocRef = doc(db, ADMINS_COLLECTION, firebaseUser.uid);
        const firestoreAdminData: Omit<UserProfile, "id"> & { createdAt: any, updatedAt: any } = {
            uid: firebaseUser.uid, 
            email: firebaseUser.email!,
            name: data.name,
            role: data.role,
            avatar: photoURL,
            allowedCategoryIds: data.role === UserRole.SUB_ADMIN ? data.allowedCategoryIds || [] : [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(adminDocRef, firestoreAdminData);
        
        revalidatePath("/admin/users");
        return { 
            user: { id: firebaseUser.uid, ...firestoreAdminData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, 
            message: `Админ хэрэглэгч "${data.name}" амжилттай үүслээ. Одоо таны session энэ шинэ хэрэглэгчийнх болсон тул, дахин нэвтэрч Супер Админ эрхээ сэргээнэ үү.`
        };
    } catch (error: any) {
        console.error("Error adding admin user:", error);
        let errorMessage = error.message || "Админ хэрэглэгч нэмэхэд алдаа гарлаа.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Энэ имэйл хаяг бүртгэлтэй байна.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Нууц үг сул байна. Илүү хүчтэй нууц үг сонгоно уу.";
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
    const updateDataForFirestore: any = { updatedAt: serverTimestamp() };

    if (data.name) updateDataForFirestore.name = data.name;
    if (data.email) updateDataForFirestore.email = data.email;
    if (data.role) updateDataForFirestore.role = data.role;
    
    if (data.role && data.role !== UserRole.SUB_ADMIN) {
      updateDataForFirestore.allowedCategoryIds = []; 
    } else if (data.role === UserRole.SUB_ADMIN) {
      // If role is Sub Admin, update allowedCategoryIds if provided, otherwise keep existing or set to empty array
      updateDataForFirestore.allowedCategoryIds = data.allowedCategoryIds || [];
    } else if (data.hasOwnProperty('allowedCategoryIds')) { // Handle explicit empty array for non-SubAdmin roles too
        updateDataForFirestore.allowedCategoryIds = data.allowedCategoryIds;
    }


    await updateDoc(adminDocRef, updateDataForFirestore);
    console.log(`Firestore document for admin ${userId} updated with new details (name, role, email, allowedCategoryIds).`);

    let authUpdateMessage = "";
    const currentFirestoreUserSnap = await getDoc(adminDocRef);
    const currentFirestoreEmail = currentFirestoreUserSnap.data()?.email;

    if (data.email && data.email !== currentFirestoreEmail) { 
        authUpdateMessage += ` Firebase Authentication дахь имэйлийг (${data.email}) солихын тулд Cloud Function ашиглах шаардлагатай. Одоохондоо хэрэглэгч хуучин имэйлээрээ нэвтэрнэ.`;
        console.warn(`IMPORTANT: Admin user ${userId} Firestore email updated to ${data.email}. Corresponding Firebase Authentication email update requires a Cloud Function.`);
    }

    if (data.newPassword && data.newPassword.length >= 6) {
        authUpdateMessage += ` Firebase Authentication дахь нууц үгийг шинэчлэхийн тулд Cloud Function ашиглах шаардлагатай.`;
        console.warn(`IMPORTANT: Admin user ${userId} requested a password change. This requires a Cloud Function to update Firebase Authentication.`);
    } else if (data.newPassword && data.newPassword.length > 0) {
        return { error: "New password provided is less than 6 characters. Firestore not updated with password change request." };
    }
    
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}/edit`);
    return { success: true, message: `Админ хэрэглэгчийн Firestore мэдээлэл амжилттай шинэчлэгдлээ.${authUpdateMessage}` };

  } catch (error: any) {
    console.error("Error updating admin user in Firestore:", error);
    return { error: error.message || "Админ хэрэглэгчийн мэдээллийг Firestore-д шинэчлэхэд алдаа гарлаа." };
  }
}


export async function getAdminUsers(): Promise<UserProfile[]> {
  try {
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const q = query(adminsRef, orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        uid: data.uid || doc.id, 
        name: data.name || '',
        email: data.email || '',
        role: data.role || UserRole.SUB_ADMIN,
        avatar: data.avatar,
        allowedCategoryIds: data.allowedCategoryIds || [],
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
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
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
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
    return { error: error.message || "Нууц үг сэргээх имэйл илгээхэд алдаа гарлаа." };
  }
}

    