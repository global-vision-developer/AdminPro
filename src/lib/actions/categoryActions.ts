
/**
 * @fileoverview Server-side actions for managing "Category" data in Firestore.
 * Provides CRUD (Create, Read, Update, Delete) operations for content categories and their fields.
 * 
 * Энэ файл нь Firestore дахь "Категори"-той холбоотой сервер талын үйлдлүүдийг агуулна.
 * Контентийн категори, түүний талбаруудыг үүсгэх, унших, шинэчлэх, устгах (CRUD) үйлдлүүдийг хангадаг.
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

// Firestore-д хадгалах категорийн өгөгдлийн бүтэц
interface CategoryFirestoreData {
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string | null; // Added coverImageUrl
  fields: FieldDefinition[];
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

/**
 * Firestore-д шинэ категори нэмэх.
 * @param categoryData - Шинэ категорийн мэдээлэл (нэр, slug, талбарууд гэх мэт).
 * @returns Үүссэн категорийн ID эсвэл алдааны мэдээлэл.
 */
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
    return { error: e.message || "Категори нэмэхэд алдаа гарлаа." };
  }
}

/**
 * Firestore-оос бүх категорийн жагсаалтыг авах.
 * @returns Категориудын массив.
 */
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

/**
 * Тодорхой нэг категорийн мэдээллийг ID-гаар нь авах.
 * @param id - Авах гэж буй категорийн ID.
 * @returns Категорийн мэдээлэл эсвэл олдсонгүй бол `null`.
 */
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

/**
 * Одоо байгаа категорийн мэдээллийг шинэчлэх.
 * @param id - Шинэчлэх гэж буй категорийн ID.
 * @param categoryData - Шинэчлэх мэдээлэл.
 * @returns Амжилттай болсон эсвэл алдааны мэдээлэл.
 */
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
    return { error: e.message || "Категори шинэчлэхэд алдаа гарлаа." };
  }
}

/**
 * Категорийг болон түүнд хамаарах бүх бүртгэлийг (entries) устгах.
 * @param id - Устгах категорийн ID.
 * @returns Амжилттай болсон эсвэл алдааны мэдээлэл.
 */
export async function deleteCategory(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    const categoryDocRef = doc(db, CATEGORIES_COLLECTION, id);
    const batch = writeBatch(db);

    // Энэ категорид хамаарах бүх бүртгэлийг олох
    const entriesRef = collection(db, ENTRIES_COLLECTION);
    const entriesQuery = query(entriesRef, where("categoryId", "==", id));
    const entriesSnapshot = await getDocs(entriesQuery);

    // Олдсон бүх бүртгэлийг batch delete-д нэмэх
    entriesSnapshot.forEach((entryDoc) => {
      batch.delete(doc(db, ENTRIES_COLLECTION, entryDoc.id));
    });

    // Категорийг өөрийг нь устгах
    batch.delete(categoryDocRef);

    // Бүх устгах үйлдлийг нэг дор гүйцэтгэх
    await batch.commit();

    revalidatePath("/admin/categories");
    revalidatePath("/admin/entries"); 
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting category and its entries: ", e);
    if (e.message && e.message.includes("maximum 500 writes")) {
        return { error: "Категори устгахад алдаа гарлаа: Нэг дор устгах бүртгэлийн тоо хэтэрсэн байна. Бүртгэлийн тоог цөөлөх эсвэл админтай холбогдоно уу." };
    }
    return { error: e.message || "Категори болон түүнтэй холбоотой бүртгэлүүдийг устгахад алдаа гарлаа." };
  }
}
