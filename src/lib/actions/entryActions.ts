
/**
 * @fileoverview Server-side actions for managing "Entry" data in Firestore.
 * Provides CRUD (Create, Read, Update, Delete) operations for content entries based on categories.
 */
"use server";

import { db } from "@/lib/firebase";
import type { Entry } from "@/types";
import { AnketStatus } from "@/types";
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
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const ENTRIES_COLLECTION = "entries";

type AddEntryData = {
  categoryId: string;
  categoryName: string;
  title: string;
  data: Record<string, any>;
  status: 'draft' | 'published' | 'scheduled';
  publishAt?: string | null;
};

export async function addEntry(
  entryData: AddEntryData,
  sourceAnketId?: string,
  adminId?: string
): Promise<{ id: string } | { error: string }> {
  try {
    const batch = writeBatch(db);
    const entriesCollectionRef = collection(db, ENTRIES_COLLECTION);
    const newEntryRef = doc(entriesCollectionRef);

    const dataToSave = {
      ...entryData,
      publishAt: entryData.publishAt || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(newEntryRef, dataToSave);

    if (sourceAnketId && adminId) {
      const anketDocRef = doc(db, "ankets", sourceAnketId);
      batch.update(anketDocRef, {
        status: AnketStatus.APPROVED,
        processedBy: adminId,
        processedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    revalidatePath("/admin/entries");
    revalidatePath(`/admin/entries?category=${entryData.categoryId}`);
    if (sourceAnketId) {
      revalidatePath("/admin/anket");
      revalidatePath(`/admin/anket/${sourceAnketId}`);
    }
    return { id: newEntryRef.id };
  } catch (e: any) {
    console.error("Error adding entry and updating anket: ", e);
    return { error: e.message || "Бүртгэл нэмэхэд алдаа гарлаа." };
  }
}

export async function getEntries(categoryId?: string): Promise<Entry[]> {
  try {
    let q;
    if (categoryId && categoryId !== "all") {
      q = query(
        collection(db, ENTRIES_COLLECTION),
        where("categoryId", "==", categoryId),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(collection(db, ENTRIES_COLLECTION), orderBy("createdAt", "desc"));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            categoryId: data.categoryId,
            categoryName: data.categoryName || "Unknown Category", 
            title: data.title || "", 
            data: data.data || {},
            status: data.status || 'draft', 
            publishAt: data.publishAt instanceof Timestamp ? data.publishAt.toDate().toISOString() : (typeof data.publishAt === 'string' ? data.publishAt : undefined),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()), 
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
        } as Entry;
    });
  } catch (e: any) {
    console.error(`Error getting entries (categoryId: ${categoryId || 'all'}):`, e);
    if (e.code === 'failed-precondition' && e.message && e.message.toLowerCase().includes('requires an index')) {
        console.error("Firestore query requires an index. Please check Firebase console for index creation link specific to this query (likely on 'entries' collection for 'categoryId' and 'createdAt').");
    }
    return [];
  }
}


export async function getEntry(id: string): Promise<Entry | null> {
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        categoryId: data.categoryId,
        categoryName: data.categoryName || "Unknown Category",
        title: data.title || "",
        data: data.data || {},
        status: data.status || 'draft',
        publishAt: data.publishAt instanceof Timestamp ? data.publishAt.toDate().toISOString() : (typeof data.publishAt === 'string' ? data.publishAt : undefined),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
      } as Entry;
    }
    return null;
  } catch (e: any) {
    console.error("Error getting entry: ", e);
    return null;
  }
}

type UpdateEntryData = Partial<Omit<Entry, "id" | "createdAt" | "updatedAt" | "categoryId" | "categoryName">>;

export async function updateEntry(
  id: string,
  entryData: UpdateEntryData 
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id);

    const existingEntrySnap = await getDoc(docRef);
    if (!existingEntrySnap.exists()) {
        return { error: "Шинэчлэх бүртгэл олдсонгүй." };
    }
    const categoryId = existingEntrySnap.data().categoryId;

    const dataToUpdate: Record<string, any> = {};

    Object.keys(entryData).forEach(key => {
      if (key === 'title' || key === 'data' || key === 'status' || key === 'publishAt') {
        // @ts-ignore
        dataToUpdate[key] = entryData[key];
      }
    });
    
    if (dataToUpdate.hasOwnProperty('publishAt')) {
      dataToUpdate.publishAt = dataToUpdate.publishAt || null;
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
      console.log("No updatable data provided for entry.");
    }
    
    dataToUpdate.updatedAt = serverTimestamp();

    await updateDoc(docRef, dataToUpdate);

    revalidatePath("/admin/entries");
    if (categoryId) {
        revalidatePath(`/admin/entries?category=${categoryId}`);
    }
    revalidatePath(`/admin/entries/${id}/edit`);
    return { success: true };
  } catch (e: any) {
    console.error("Error updating entry: ", e);
    return { error: e.message || "Бүртгэл шинэчлэхэд алдаа гарлаа." };
  }
}

export async function deleteEntry(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id);
    const entrySnap = await getDoc(docRef);
    let categoryId: string | undefined = undefined;
    if (entrySnap.exists()) {
        categoryId = entrySnap.data().categoryId;
    }

    await deleteDoc(docRef);

    revalidatePath("/admin/entries");
    if (categoryId) {
        revalidatePath(`/admin/entries?category=${categoryId}`);
    }
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting entry: ", e);
    return { error: e.message || "Бүртгэл устгахад алдаа гарлаа." };
  }
}
