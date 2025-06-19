
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
const TARGET_TRANSLATOR_CATEGORY_SLUG = "orchluulagchid"; // Placeholder for the translator category slug

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
        } as Category; // Simplified, add other fields if needed by addEntry
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
    const anketData = anketSnap.data() as Anket;

    const translatorCategory = await getTranslatorCategory();
    if (!translatorCategory) {
      return { error: `"Орчуулагчид" категори (slug: "${TARGET_TRANSLATOR_CATEGORY_SLUG}") системд тохируулагдаагүй байна. Админтай холбогдоно уу.` };
    }

    // Map anket data to translator entry data
    // This mapping depends on the fields defined in your "translators" category
    const entryDataPayload: Record<string, any> = {};
    // Example mapping - adjust keys ('name', 'email', etc.) to match your "translators" category field keys
    if (translatorCategory.fields.find(f => f.key === 'name')) entryDataPayload['name'] = anketData.name;
    if (translatorCategory.fields.find(f => f.key === 'email')) entryDataPayload['email'] = anketData.email;
    if (anketData.phoneNumber && translatorCategory.fields.find(f => f.key === 'phone_number')) entryDataPayload['phone_number'] = anketData.phoneNumber;
    if (anketData.cvLink && translatorCategory.fields.find(f => f.key === 'cv_link')) entryDataPayload['cv_link'] = anketData.cvLink;
    if (anketData.message && translatorCategory.fields.find(f => f.key === 'notes')) entryDataPayload['notes'] = anketData.message;
    
    // Ensure all required fields for the translator category are present
     for (const field of translatorCategory.fields) {
        if (field.required && !entryDataPayload.hasOwnProperty(field.key)) {
            // Try to get from anket if a simple mapping exists, or set a default, or error out
            if (field.key === 'name' && !entryDataPayload['name']) entryDataPayload['name'] = anketData.name; // Default from anket name
            // Add more sophisticated default logic or error if required field is missing
            else if (!entryDataPayload.hasOwnProperty(field.key)) {
                 console.warn(`Required field "${field.label}" (key: ${field.key}) is missing for translator entry from anket ${anketId}. Setting to default/empty based on type.`);
                 if (field.type === "Text" || field.type === "Textarea") entryDataPayload[field.key] = "";
                 else if (field.type === "Number") entryDataPayload[field.key] = 0;
                 else if (field.type === "Boolean") entryDataPayload[field.key] = false;
                 else entryDataPayload[field.key] = null; // Or throw error
            }
        }
    }


    const newEntryResult = await addEntry({
      categoryId: translatorCategory.id,
      categoryName: translatorCategory.name, // Add categoryName
      title: anketData.name, // Use anket name as entry title
      data: entryDataPayload,
      status: 'published', // Or 'draft' if you prefer
    });

    if ("error" in newEntryResult) {
      return { error: `Орчуулагчийн бүртгэл үүсгэхэд алдаа гарлаа: ${newEntryResult.error}` };
    }

    // Update anket status in the same batch
    batch.update(anketDocRef, {
      status: AnketStatus.APPROVED,
      processedBy: adminId,
      processedAt: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath("/admin/anket");
    revalidatePath(`/admin/anket/${anketId}`);
    revalidatePath("/admin/entries"); // Revalidate entries list
    if (translatorCategory.id) {
        revalidatePath(`/admin/entries?category=${translatorCategory.id}`);
    }

    return { success: true, entryId: newEntryResult.id };
  } catch (e: any) {
    console.error("Error approving anket and creating entry: ", e);
    return { error: e.message || "Анкет зөвшөөрч, бүртгэл үүсгэхэд алдаа гарлаа." };
  }
}

// Helper function to submit a dummy anket for testing - NOT FOR PRODUCTION
export async function submitTestAnket(anketData: Omit<Anket, "id" | "submittedAt" | "status" | "processedBy" | "processedAt">): Promise<string | {error: string}> {
    try {
        const dataToSave = {
            ...anketData,
            submittedAt: serverTimestamp(),
            status: AnketStatus.PENDING,
        };
        const docRef = await addDoc(collection(db, ANKETS_COLLECTION), dataToSave);
        console.log("Test anket submitted with ID: ", docRef.id);
        revalidatePath("/admin/anket");
        return docRef.id;
    } catch (error: any) {
        console.error("Error submitting