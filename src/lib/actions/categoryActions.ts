
"use server";

import { db } from "@/lib/firebase";
import type { Category, FieldDefinition } from "@/types";
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
import { slugify } from "@/lib/utils"; // Import slugify

const CATEGORIES_COLLECTION = "categories";

interface CategoryFirestoreData {
  name: string;
  slug: string;
  description?: string;
  fields: FieldDefinition[];
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
}


export async function addCategory(
  categoryData: Pick<Category, "name" | "slug" | "description" | "fields">
): Promise<{ id: string } | { error: string }> {
  try {
    const dataToSave: Omit<CategoryFirestoreData, "createdAt" | "updatedAt"> & { createdAt: any, updatedAt: any } = {
      name: categoryData.name,
      slug: categoryData.slug || slugify(categoryData.name), // Ensure slug exists
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
      if (!data.name || typeof data.name !== 'string') {
        console.warn(`Category document with ID ${doc.id} is missing a valid name. Skipping.`);
        return null; 
      }
      return {
        id: doc.id,
        name: data.name,
        slug: data.slug || slugify(data.name), // Ensure slug exists or generate it
        description: data.description || '',
        fields: data.fields || [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as Category;
    }).filter(Boolean) as Category[]; // Filter out nulls if any category was invalid
  } catch (e: any) {
    console.error("Error getting categories: ", e);
    return [];
  }
}

export async function getCategory(id: string): Promise<Category | null> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data.name || typeof data.name !== 'string') {
        console.error(`Category document with ID ${id} is missing a valid name.`);
        return null; 
      }
      return {
        id: docSnap.id,
        name: data.name,
        slug: data.slug || slugify(data.name), // Ensure slug exists or generate it
        description: data.description || '',
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
    
    const dataToUpdate: Record<string, any> = { ...categoryData };
    if (categoryData.name && !categoryData.slug) { // If name changes and slug isn't provided, update slug
        dataToUpdate.slug = slugify(categoryData.name);
    }
    
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
