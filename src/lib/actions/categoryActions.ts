
"use server";

import { db } from "@/lib/firebase";
import type { Category, FieldDefinition } from "@/types"; // Updated to use FieldDefinition
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
  writeBatch,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const CATEGORIES_COLLECTION = "categories";

interface CategoryFirestoreData {
  name: string;
  slug: string;
  description?: string;
  fields: FieldDefinition[]; // Storing FieldDefinition directly
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
}


// Omit id for creation, slug and description are now part of Category type
export async function addCategory(
  categoryData: Pick<Category, "name" | "slug" | "description" | "fields">
): Promise<{ id: string } | { error: string }> {
  try {
    const dataToSave: Omit<CategoryFirestoreData, "createdAt" | "updatedAt"> & { createdAt: any, updatedAt: any } = {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description || "",
      fields: categoryData.fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), dataToSave);
    revalidatePath("/admin/categories");
    revalidatePath("/admin/entries");
    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error adding category: ", e);
    return { error: e.message || "Failed to add category." };
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        fields: data.fields || [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as Category;
    });
  } catch (e: any) {
    console.error("Error getting categories: ", e);
    // Consider throwing the error or returning a specific error object
    // For now, returning empty array to avoid breaking UI too much
    return [];
  }
}

export async function getCategory(id: string): Promise<Category | null> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        fields: data.fields || [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as Category;
    }
    return null;
  } catch (e: any) {
    console.error("Error getting category: ", e);
    return null;
  }
}

export async function updateCategory(
  id: string,
  categoryData: Partial<Pick<Category, "name" | "slug" | "description" | "fields">>
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    
    // Construct data for Firestore update, ensuring serverTimestamp for updatedAt
    const dataToUpdate: Record<string, any> = { ...categoryData };
    
    // Remove client-side string versions of timestamps if they exist in partial data
    delete dataToUpdate.createdAt; 
    delete dataToUpdate.updatedAt;

    await updateDoc(docRef, {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    });

    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}/edit`);
    revalidatePath("/admin/entries");
    return { success: true };
  } catch (e: any) {
    console.error("Error updating category: ", e);
    return { error: e.message || "Failed to update category." };
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    // Consider also deleting all entries associated with this category, or archiving them.
    // This is a destructive operation. For now, just deleting the category.
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
    revalidatePath("/admin/categories");
    revalidatePath("/admin/entries");
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting category: ", e);
    return { error: e.message || "Failed to delete category." };
  }
}
