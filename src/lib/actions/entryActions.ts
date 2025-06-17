
"use server";

import { db } from "@/lib/firebase";
import type { Entry } from "@/types";
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
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const ENTRIES_COLLECTION = "entries";

// Type for data payload when adding an entry.
// It should align with the Entry type in src/types/index.ts,
// excluding server-generated fields like id, createdAt, updatedAt.
// It also needs categoryName which is denormalized.
type AddEntryData = {
  categoryId: string;
  categoryName: string;
  title: string;
  data: Record<string, any>;
  status: 'draft' | 'published' | 'scheduled';
  publishAt?: string | null;
};

export async function addEntry(
  entryData: AddEntryData
): Promise<{ id: string } | { error: string }> {
  try {
    const dataToSave = {
      ...entryData,
      publishAt: entryData.publishAt || null, // Firestore handles undefined as not set, but null is explicit
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), dataToSave);
    revalidatePath("/admin/entries");
    revalidatePath(`/admin/entries?category=${entryData.categoryId}`);
    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error adding entry: ", e);
    return { error: e.message || "Error adding entry." };
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
        // Ensure all fields from the Entry type are present with fallbacks
        return {
            id: doc.id,
            categoryId: data.categoryId,
            categoryName: data.categoryName || "Unknown Category", // Fallback for categoryName
            title: data.title || "", // Fallback for title
            data: data.data || {},
            status: data.status || 'draft', // Fallback for status
            publishAt: data.publishAt instanceof Timestamp ? data.publishAt.toDate().toISOString() : (typeof data.publishAt === 'string' ? data.publishAt : undefined),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()), // Fallback for createdAt
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

// Type for data payload when updating an entry.
// Only include fields that are actually updatable by this action.
// categoryId and categoryName are not updatable here.
type UpdateEntryData = Partial<Omit<Entry, "id" | "createdAt" | "updatedAt" | "categoryId" | "categoryName">>;

export async function updateEntry(
  id: string,
  entryData: UpdateEntryData // This should contain title, data, status, publishAt
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, ENTRIES_COLLECTION, id);

    const existingEntrySnap = await getDoc(docRef);
    if (!existingEntrySnap.exists()) {
        return { error: "Entry to update not found." };
    }
    const categoryId = existingEntrySnap.data().categoryId;

    const dataToUpdate: Record<string, any> = {};

    // Iterate over selectedCategory.fields to ensure all admin-editable fields are considered
    // This assumes selectedCategory is available or passed to this scope, which it isn't directly.
    // For now, we rely on entryData providing all necessary keys.
    // A more robust solution might involve fetching category fields if this becomes an issue.

    Object.keys(entryData).forEach(key => {
      if (key === 'title' || key === 'data' || key === 'status' || key === 'publishAt') {
        // @ts-ignore
        dataToUpdate[key] = entryData[key];
      }
    });
    
    // Handle publishAt for Firestore (null vs undefined)
    if (dataToUpdate.hasOwnProperty('publishAt')) {
      dataToUpdate.publishAt = dataToUpdate.publishAt || null;
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
      // If only fields not in the allowed list were passed, dataToUpdate might be empty.
      // However, the type UpdateEntryData already restricts what can be passed.
      console.log("No updatable data provided for entry.");
      // Consider if an error should be returned or just a success if no *valid* fields changed.
      // For now, proceed if entryData itself was not empty.
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
    return { error: e.message || "Error updating entry." };
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
    return { error: e.message || "Error deleting entry." };
  }
}
