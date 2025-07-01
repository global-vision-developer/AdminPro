/**
 * @fileoverview Server-side actions for managing "HelpItem" (FAQ) data in Firestore.
 * Provides CRUD (Create, Read, Update, Delete) operations for help/FAQ items.
 * 
 * Энэ файл нь Firestore дахь "Тусламжийн зүйл" (Түгээмэл Асуулт Хариулт) өгөгдлийг удирдах сервер талын үйлдлүүдийг агуулдаг.
 * Тусламжийн зүйлсийн CRUD (Үүсгэх, Унших, Шинэчлэх, Устгах) үйлдлүүдийг хангадаг.
 */
"use server";

import { db } from "@/lib/firebase";
import type { HelpItem } from "@/types";
import { HelpTopic } from "@/types"; // Ensure HelpTopic is imported
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const HELP_ITEMS_COLLECTION = "help_items";

/**
 * Firestore-оос тусламжийн зүйлсийн жагсаалтыг авна.
 * @param topicFilter - (Сонголтоор) Тодорхой сэдвээр шүүх.
 * @returns Тусламжийн зүйлсийн массив.
 */
export async function getHelpItems(topicFilter?: HelpTopic): Promise<HelpItem[]> {
  console.log(`getHelpItems: Received topicFilter: '${topicFilter}'`);
  try {
    const helpItemsRef = collection(db, HELP_ITEMS_COLLECTION);
    let q;

    if (topicFilter && topicFilter !== "all_topics") {
      console.log(`getHelpItems: Applying filter for topic: '${topicFilter}', ordering by createdAt ASC`);
      q = query(helpItemsRef, where("topic", "==", topicFilter), orderBy("createdAt", "asc")); // Changed to asc
    } else {
      console.log("getHelpItems: No topic filter or 'all_topics', ordering by createdAt ASC");
      q = query(helpItemsRef, orderBy("createdAt", "asc")); // Changed to asc
    }

    const querySnapshot = await getDocs(q);
    console.log(`getHelpItems: Firestore query returned ${querySnapshot.docs.length} documents.`);

    const itemsFromDb = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            topic: data.topic as HelpTopic,
            question: data.question,
            answer: data.answer,
            isPredefined: data.isPredefined === true,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
            createdBy: data.createdBy,
         } as HelpItem;
    });

    if (querySnapshot.docs.length === 0) {
        console.log(`getHelpItems: No items found in Firestore for topicFilter '${topicFilter}'. Returning empty array.`);
    }
    return itemsFromDb;

  } catch (e: any) {
    console.error("Error getting help items from Firestore: ", e);
    if (e.code === 'failed-precondition' && e.message && e.message.toLowerCase().includes('index')) {
        console.error("Firestore query requires an index. Please ensure the composite index on 'help_items' for 'topic' (ASC) and 'createdAt' (ASC or DESC as needed) exists and is enabled.");
    }
    return [];
  }
}

export interface AddHelpItemData {
  topic: HelpTopic;
  question: string;
  answer: string;
  adminId: string;
}

/**
 * Firestore-д шинэ тусламжийн зүйл нэмнэ.
 * @param data - Шинэ тусламжийн зүйлийн мэдээлэл.
 * @returns Үүссэн зүйлийн ID эсвэл алдааны мэдээлэл.
 */
export async function addHelpItem(
  data: AddHelpItemData
): Promise<{ id: string } | { error: string }> {
  if (!data.adminId) {
    return { error: "Админы ID алга байна. Нэвтэрсэн эсэхээ шалгана уу." };
  }
  try {
    const dataToSave = {
      topic: data.topic,
      question: data.question,
      answer: data.answer,
      isPredefined: true,
      createdBy: data.adminId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, HELP_ITEMS_COLLECTION), dataToSave);
    revalidatePath("/admin/help");
    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error adding help item: ", e);
    return { error: e.message || "Тусламжийн зүйл нэмэхэд алдаа гарлаа." };
  }
}

export type UpdateHelpItemData = Partial<Pick<HelpItem, "topic" | "question" | "answer">> & { adminId: string };

/**
 * Одоо байгаа тусламжийн зүйлийн мэдээллийг шинэчилнэ.
 * @param id - Шинэчлэх зүйлийн ID.
 * @param data - Шинэчлэх мэдээлэл.
 * @returns Амжилттай болсон эсэх эсвэл алдааны мэдээлэл.
 */
export async function updateHelpItem(
  id: string,
  data: UpdateHelpItemData
): Promise<{ success: boolean } | { error: string }> {
  if (!data.adminId) {
    return { error: "Админы ID алга байна. Нэвтэрсэн эсэхээ шалгана уу." };
  }
  try {
    const docRef = doc(db, HELP_ITEMS_COLLECTION, id);

    const updatePayload: Record<string, any> = {};
    if (data.topic) updatePayload.topic = data.topic;
    if (data.question) updatePayload.question = data.question;
    if (data.answer) updatePayload.answer = data.answer;

    if (Object.keys(updatePayload).length === 0) {
      return { error: "Шинэчлэх өгөгдөл алга." };
    }
    
    updatePayload.updatedAt = serverTimestamp();
    // updatePayload.updatedBy = data.adminId; // Consider adding this field to HelpItem type

    await updateDoc(docRef, updatePayload);
    revalidatePath("/admin/help");
    return { success: true };
  } catch (e: any) {
    console.error("Error updating help item: ", e);
    return { error: e.message || "Тусламжийн зүйл шинэчлэхэд алдаа гарлаа." };
  }
}

/**
 * Тусламжийн зүйлийг Firestore-оос устгана.
 * @param id - Устгах зүйлийн ID.
 * @param adminId - Үйлдлийг гүйцэтгэж буй админы ID.
 * @returns Амжилттай болсон эсэх эсвэл алдааны мэдээлэл.
 */
export async function deleteHelpItem(id: string, adminId: string): Promise<{ success: boolean } | { error: string }> {
 if (!adminId) {
    return { error: "Админы ID алга байна. Нэвтэрсэн эсэхээ шалгана уу." };
  }
  try {
    const docRef = doc(db, HELP_ITEMS_COLLECTION, id);
    await deleteDoc(docRef);
    revalidatePath("/admin/help");
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting help item: ", e);
    return { error: e.message || "Тусламжийн зүйл устгахад алдаа гарлаа." };
  }
}
