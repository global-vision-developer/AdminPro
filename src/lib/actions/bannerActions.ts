
"use server";

import { db } from "@/lib/firebase";
import type { Banner } from "@/types";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const BANNERS_COLLECTION = "banners";

interface BannerFirestoreData {
  imageUrl: string | null;
  description: string;
  link?: string | null;
  isActive: boolean;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export async function addBanner(
  bannerData: Omit<Banner, "id" | "createdAt" | "updatedAt">
): Promise<{ id: string } | { error: string }> {
  try {
    const dataToSave: BannerFirestoreData = {
      imageUrl: bannerData.imageUrl,
      description: bannerData.description,
      link: bannerData.link || null,
      isActive: bannerData.isActive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, BANNERS_COLLECTION), dataToSave);
    revalidatePath("/admin/banners");
    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error adding banner: ", e);
    return { error: e.message || "Баннер нэмэхэд алдаа гарлаа." };
  }
}

export async function getBanners(): Promise<Banner[]> {
  try {
    const q = query(collection(db, BANNERS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        imageUrl: data.imageUrl || null,
        description: data.description || "",
        link: data.link || null,
        isActive: data.isActive === true, // Ensure boolean
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as Banner;
    });
  } catch (e: any) {
    console.error("Error getting banners: ", e);
    return [];
  }
}

export async function getBanner(id: string): Promise<Banner | null> {
  try {
    const docRef = doc(db, BANNERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        imageUrl: data.imageUrl || null,
        description: data.description || "",
        link: data.link || null,
        isActive: data.isActive === true,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as Banner;
    }
    return null;
  } catch (e: any) {
    console.error("Error getting banner: ", e);
    return null;
  }
}

export async function updateBanner(
  id: string,
  bannerData: Partial<Omit<Banner, "id" | "createdAt" | "updatedAt">>
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, BANNERS_COLLECTION, id);
    
    const dataToUpdate: Record<string, any> = { ...bannerData };
     if (bannerData.hasOwnProperty('link') && bannerData.link === '') {
        dataToUpdate.link = null;
    }
    
    await updateDoc(docRef, {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    });

    revalidatePath("/admin/banners");
    revalidatePath(`/admin/banners/${id}/edit`);
    return { success: true };
  } catch (e: any) {
    console.error("Error updating banner: ", e);
    return { error: e.message || "Баннер шинэчлэхэд алдаа гарлаа." };
  }
}

export async function deleteBanner(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, BANNERS_COLLECTION, id);
    await deleteDoc(docRef);
    revalidatePath("/admin/banners");
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting banner: ", e);
    return { error: e.message || "Баннер устгахад алдаа гарлаа." };
  }
}
