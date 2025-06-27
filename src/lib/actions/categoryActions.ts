/**
 * @fileoverview Server-side actions for managing "Category" data in Firestore.
 * Provides CRUD (Create, Read, Update, Delete) operations for content categories and their fields.
 */
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
  where 
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils"; 

const CATEGORIES_COLLECTION = "categories";
const ENTRIES_COLLECTION = "entries";

interface CategoryFirestoreData {
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string | null; // Added coverImageUrl
  fields: FieldDefinition[];
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
}


export async function addCategory(
  categoryData: Pick<Category, "name" | "slug" | "description" | "fields" | "coverImageUrl">
): Promise<{ id: string } | { error: string }> {
  try {
    const dataToSave: Omit<CategoryFirestoreData, "createdAt" | "updatedAt"> & { createdAt: any, updatedAt: any } = {
      name: categoryData.name,
      slug: categoryData.slug || slugify(categoryData.name), 
      description: categoryData.description || "",
      coverImageUrl: categoryData.coverImageUrl || null, // Save coverImageUrl
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
    return { error: e.message || "Error adding category." };
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      if (!data.name || typeof data.name !== 'string') {
        console.warn(`Category document (ID: ${doc.id}) has no valid name. Skipping.`);
        return null; 
      }
      return {
        id: doc.id,
        name: data.name,
        slug: data.slug || slugify(data.name), 
        description: data.description || '',
        coverImageUrl: data.coverImageUrl || null, // Retrieve coverImageUrl
        fields: data.fields || [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as Category;
    }).filter(Boolean) as Category[]; 
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
        console.error(`Category document (ID: ${id}) has no valid name.`);
        return null; 
      }
      return {
        id: docSnap.id,
        name: data.name,
        slug: data.slug || slugify(data.name), 
        description: data.description || '',
        coverImageUrl: data.coverImageUrl || null, // Retrieve coverImageUrl
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
  categoryData: Partial<Pick<Category, "name" | "slug" | "description" | "fields" | "coverImageUrl">>
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    
    const dataToUpdate: Record<string, any> = { ...categoryData };
    if (categoryData.name && !categoryData.slug) { 
        dataToUpdate.slug = slugify(categoryData.name);
    }
     // Explicitly handle null for coverImageUrl to allow unsetting it
    if (categoryData.hasOwnProperty('coverImageUrl')) {
        dataToUpdate.coverImageUrl = categoryData.coverImageUrl === undefined ? null : categoryData.coverImageUrl;
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
    return { error: e.message || "Error updating category." };
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    const categoryDocRef = doc(db, CATEGORIES_COLLECTION, id);
    const batch = writeBatch(db);

    const entriesRef = collection(db, ENTRIES_COLLECTION);
    const entriesQuery = query(entriesRef, where("categoryId", "==", id));
    const entriesSnapshot = await getDocs(entriesQuery);

    entriesSnapshot.forEach((entryDoc) => {
      batch.delete(doc(db, ENTRIES_COLLECTION, entryDoc.id));
    });

    batch.delete(categoryDocRef);
    await batch.commit();

    revalidatePath("/admin/categories");
    revalidatePath("/admin/entries"); 
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting category and its entries: ", e);
    if (e.message && e.message.includes("maximum 500 writes")) {
        return { error: "Error deleting category: The number of entries to delete at once exceeds the limit. Reduce the number of entries or contact support." };
    }
    return { error: e.message || "Error deleting category and its associated entries." };
  }
}
