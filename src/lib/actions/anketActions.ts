
"use server";

import { db, auth as adminAuth } from "@/lib/firebase";
import type { Anket, Category, Entry } from "@/types";
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
import { addEntry } from "./entryActions"; // Assuming addEntry is correctly implemented
import { slugify } from "@/lib/utils";

const ANKETS_COLLECTION = "ankets";
const CATEGORIES_COLLECTION = "categories";
const TARGET_TRANSLATOR_CATEGORY_SLUG = "orchluulagchid";

export async function getAnkets(statusFilter?: AnketStatus): Promise<Anket[]> {
  try {
    const anketsRef = collection(db, ANKETS_COLLECTION);
    let q;
    if (statusFilter) {
      q = query(anketsRef, where("status", "==", statusFilter), orderBy("submittedAt", "desc"));
    } else {
      q = query(anketsRef, orderBy("submittedAt", "desc"));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber,
        cvLink: data.cvLink,
        message: data.message,
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate().toISOString() : new Date().toISOString(),
        status: data.status || AnketStatus.PENDING,
        processedBy: data.processedBy,
        processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate().toISOString() : undefined,
      } as Anket;
    });
  } catch (e: any) {
    console.error("Error getting ankets: ", e);
    return [];
  }
}

export async function getAnket(id: string): Promise<Anket | null> {
  try {
    const docRef = doc(db, ANKETS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber,
        cvLink: data.cvLink,
        message: data.message,
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate().toISOString() : new Date().toISOString(),
        status: data.status || AnketStatus.PENDING,
        processedBy: data.processedBy,
        processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate().toISOString() : undefined,
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

async function getTranslatorCategory(): Promise<Category | null> {
    try {
        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const q = query(categoriesRef, where("slug", "==", TARGET_TRANSLATOR_CATEGORY_SLUG));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.error(`"Орчуулагчид" категори (slug: "${TARGET_TRANSLATOR_CATEGORY_SLUG}") олдсонгүй.`);
            return null;
        }
        const categoryDoc = snapshot.docs[0];
        const data = categoryDoc.data();
        return {
            id: categoryDoc.id,
            name: data.name,
            slug: data.slug,
            fields: data.fields || [],
        } as Category;
    } catch (error) {
        console.error(`Error fetching translator category (slug: "${TARGET_TRANSLATOR_CATEGORY_SLUG}"): `, error);
        return null;
    }
}


export async function approveAnketAndCreateTranslatorEntry(
  anketId: string,
  adminId: string
): Promise<{ success: boolean; entryId?: string } | { error: string }> {
  const batch = writeBatch(db);

  try {
    const anketDocRef = doc(db, ANKETS_COLLECTION, anketId);
    const anketSnap = await getDoc(anketDocRef);

    if (!anketSnap.exists()) {
      return { error: "Анкет олдсонгүй." };
    }
    const anketDataFromDb = anketSnap.data();
     const anketData: Anket = { // Ensure proper typing
        id: anketSnap.id,
        name: anketDataFromDb.name || "",
        email: anketDataFromDb.email || "",
        phoneNumber: anketDataFromDb.phoneNumber,
        cvLink: anketDataFromDb.cvLink,
        message: anketDataFromDb.message,
        submittedAt: anketDataFromDb.submittedAt instanceof Timestamp ? anketDataFromDb.submittedAt.toDate().toISOString() : new Date().toISOString(),
        status: anketDataFromDb.status || AnketStatus.PENDING,
    };


    const translatorCategory = await getTranslatorCategory();
    if (!translatorCategory) {
      return { error: `"Орчуулагчид" категори (slug: "${TARGET_TRANSLATOR_CATEGORY_SLUG}") системд тохируулагдаагүй байна. Админтай холбогдоно уу.` };
    }

    const entryDataPayload: Record<string, any> = {};
    
    // Map known anket fields to translator category fields
    // These keys ('name', 'email', etc.) must match the 'key' in your "Орчуулагчид" category's field definitions
    const fieldMappings: Record<string, keyof Anket> = {
        'name': 'name', // Assuming 'name' is the key for "Нэр" field in "Орчуулагчид" category
        'email': 'email', // Assuming 'email' is the key for "Имэйл" field
        'phone_number': 'phoneNumber', // Assuming 'phone_number' is the key for "Утасны дугаар"
        'cv_link': 'cvLink', // Assuming 'cv_link' is the key for "CV Холбоос"
        'notes': 'message' // Assuming 'notes' is the key for "Нэмэлт Мэдээлэл" or a general notes field
    };

    translatorCategory.fields.forEach(field => {
        if (fieldMappings[field.key]) {
            const anketFieldKey = fieldMappings[field.key];
            // @ts-ignore
            if (anketData[anketFieldKey] !== undefined && anketData[anketFieldKey] !== null && anketData[anketFieldKey] !== '') {
                 // @ts-ignore
                entryDataPayload[field.key] = anketData[anketFieldKey];
            }
        }
        // Handle required fields that weren't mapped or were empty in anket
        if (field.required && !entryDataPayload.hasOwnProperty(field.key)) {
            console.warn(`Required field "${field.label}" (key: ${field.key}) for "Орчуулагчид" category is missing from anket ${anketId}. Setting to default/empty.`);
            switch (field.type) {
                case "Text":
                case "Textarea":
                    entryDataPayload[field.key] = ""; break;
                case "Number":
                    entryDataPayload[field.key] = 0; break;
                case "Boolean":
                    entryDataPayload[field.key] = false; break;
                default:
                    entryDataPayload[field.key] = null;
            }
        }
    });


    const newEntryResult = await addEntry({
      categoryId: translatorCategory.id,
      categoryName: translatorCategory.name,
      title: anketData.name,
      data: entryDataPayload,
      status: 'published', // Or 'draft'
    });

    if ("error" in newEntryResult) {
      // Rollback or compensation logic might be needed if batching wasn't fully successful here
      // However, addEntry is called before batch.commit, so this path means addEntry itself failed.
      return { error: `Орчуулагчийн бүртгэл үүсгэхэд алдаа гарлаа: ${newEntryResult.error}` };
    }

    batch.update(anketDocRef, {
      status: AnketStatus.APPROVED,
      processedBy: adminId,
      processedAt: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath("/admin/anket");
    revalidatePath(`/admin/anket/${anketId}`);
    revalidatePath("/admin/entries");
    revalidatePath(`/admin/entries?category=${translatorCategory.id}`);

    return { success: true, entryId: newEntryResult.id };
  } catch (e: any) {
    console.error("Error approving anket and creating entry: ", e);
    return { error: e.message || "Анкет зөвшөөрч, бүртгэл үүсгэхэд алдаа гарлаа." };
  }
}

// Test anket submission function removed
