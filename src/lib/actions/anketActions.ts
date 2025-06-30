/**
 * @fileoverview Server-side actions for managing "Anket" (application form) data in Firestore.
 * Includes functions for fetching, retrieving a single anket, and updating status.
 */
"use server";

import { db } from "@/lib/firebase";
import type { Anket, Category } from "@/types";
import { AnketStatus } from "@/types";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { addEntry } from "./entryActions";
import { getAppUsersMap } from "./appUserActions";
import { getCitiesMap } from "./cityActions";

const ANKETS_COLLECTION = "ankets";
const CATEGORIES_COLLECTION = "categories";
const TARGET_TRANSLATOR_CATEGORY_SLUG = "translators";

export async function getAnkets(statusFilter?: AnketStatus): Promise<Anket[]> {
  try {
    const anketsRef = collection(db, ANKETS_COLLECTION);
    
    // Query without ordering by a potentially non-existent field.
    // Sorting will be done in-memory after fetching.
    const q = statusFilter 
      ? query(anketsRef, where("status", "==", statusFilter))
      : query(anketsRef);
      
    const [querySnapshot, usersMap] = await Promise.all([
        getDocs(q),
        getAppUsersMap()
    ]);

    const ankets = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const user = usersMap[data.uid || doc.id] || null;

      // Handle missing createdAt/submittedAt gracefully
      let submittedAtDate;
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        submittedAtDate = data.createdAt.toDate();
      } else if (data.submittedAt && data.submittedAt instanceof Timestamp) { // Also check for submittedAt
        submittedAtDate = data.submittedAt.toDate();
      } else {
        console.warn(`Anket document (ID: ${doc.id}) has no valid 'createdAt' or 'submittedAt' timestamp. Using fallback.`);
        submittedAtDate = new Date(); // Fallback to current date
      }

      return {
        id: doc.id,
        uid: data.uid || doc.id,
        name: data.name || user?.displayName || "Unknown User",
        email: user?.email || "No Email",
        submittedAt: submittedAtDate.toISOString(),
        status: data.status || AnketStatus.PENDING,
        averageRating: data.averageRating ?? null,
      } as Anket;
    });
    
    // Since we removed orderBy from the query, we sort here in the code.
    return ankets.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  } catch (e: any) {
    console.error("Error getting ankets: ", e);
    if (e.code === 'failed-precondition' && e.message?.includes('index')) {
        console.error("Firestore index missing for 'ankets' query. Please create a composite index for 'status' in the Firebase console.");
    }
    return [];
  }
}

export async function getAnket(id: string): Promise<Anket | null> {
  try {
    const anketDocRef = doc(db, ANKETS_COLLECTION, id);
    const userDocRef = doc(db, "users", id);

    const [anketSnap, userSnap, citiesMap] = await Promise.all([
        getDoc(anketDocRef),
        getDoc(userDocRef),
        getCitiesMap()
    ]);

    if (anketSnap.exists()) {
      const data = anketSnap.data();
      const user = userSnap.exists() ? userSnap.data() : null;
      
      const currentCityInChinaName = data.currentCityInChina ? citiesMap[data.currentCityInChina] || data.currentCityInChina : undefined;
      const canWorkInOtherCitiesNames = Array.isArray(data.canWorkInOtherCities) 
        ? data.canWorkInOtherCities.map((cityId: string) => citiesMap[cityId] || cityId) 
        : [];
        
      // Handle missing createdAt/submittedAt gracefully
      let submittedAtDate;
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        submittedAtDate = data.createdAt.toDate();
      } else if (data.submittedAt && data.submittedAt instanceof Timestamp) {
        submittedAtDate = data.submittedAt.toDate();
      } else {
        submittedAtDate = new Date(); // Fallback to current date
      }

      return {
        id: anketSnap.id,
        uid: data.uid || anketSnap.id,
        name: data.name || user?.displayName || "Unknown User",
        email: user?.email || "No Email",
        status: data.status || AnketStatus.PENDING,
        submittedAt: submittedAtDate.toISOString(),
        processedBy: data.processedBy,
        processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate().toISOString() : undefined,
        
        photoUrl: data.photoUrl,
        selfieImageUrl: data.selfieImageUrl,
        idCardFrontImageUrl: data.idCardFrontImageUrl,
        idCardBackImageUrl: data.idCardBackImageUrl,
        wechatId: data.wechatId,
        wechatQrImageUrl: data.wechatQrImageUrl,
        chinaPhoneNumber: data.chinaPhoneNumber,
        inChinaNow: data.inChinaNow,
        currentCityInChina: data.currentCityInChina,
        currentCityInChinaName: currentCityInChinaName,
        canWorkInOtherCities: data.canWorkInOtherCities || [],
        canWorkInOtherCitiesNames: canWorkInOtherCitiesNames,
        yearsInChina: data.yearsInChina,
        nationality: data.nationality,
        speakingLevel: data.speakingLevel,
        writingLevel: data.writingLevel,
        chineseExamTaken: data.chineseExamTaken,
        workedAsTranslator: data.workedAsTranslator,
        translationFields: data.translationFields || [],
        dailyRate: data.dailyRate,
        isActive: data.isActive,
        isProfileComplete: data.isProfileComplete,
        itemType: data.itemType,
        message: data.description || "",
        cvLink: data.cvLink, // For legacy compatibility
        averageRating: data.averageRating, // For legacy compatibility
      } as Anket;
    }
    return null;
  } catch (e: any) {
    console.error("Error getting anket: ", e);
    return null;
  }
}


export async function updateAnketStatus(
  id: string,
  status: AnketStatus,
  adminId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, ANKETS_COLLECTION, id);
    await updateDoc(docRef, {
      status: status,
      processedBy: adminId,
      processedAt: serverTimestamp(),
    });
    revalidatePath("/admin/anket");
    revalidatePath(`/admin/anket/${id}`);
    return { success: true };
  } catch (e: any) {
    console.error("Error updating anket status: ", e);
    return { error: e.message || "Анкетийн статус шинэчлэхэд алдаа гарлаа." };
  }
}
