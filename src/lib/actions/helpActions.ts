
"use server";

import { db } from "@/lib/firebase";
import type { HelpItem } from "@/types";
import { HelpTopic } from "@/types";
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

export async function getHelpItems(topic?: HelpTopic): Promise<HelpItem[]> {
  try {
    const helpItemsRef = collection(db, HELP_ITEMS_COLLECTION);
    const q = topic 
                ? query(helpItemsRef, where("topic", "==", topic), orderBy("createdAt", "desc"))
                : query(helpItemsRef, orderBy("createdAt", "desc"));
    
    const querySnapshot = await getDocs(q);
    const itemsFromDb = querySnapshot.docs.map(docSnap => { // Renamed 'doc' to 'docSnap'
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
    
    // Removed mock data fallback. If Firestore is empty or filter yields no results, an empty array is returned.
    return itemsFromDb;

  } catch (e: any) {
    console.error("Error getting help items: ", e);
    return [];
  }
}

export interface AddHelpItemData {
  topic: HelpTopic;
  question: string;
  answer: string;
  adminId: string;
}

export async function addHelpItem(
  data: AddHelpItemData
): Promise<{ id: string } | { error: string }> {
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

export type UpdateHelpItemData = Partial<Pick<HelpItem, "topic" | "question" | "answer">>;

export async function updateHelpItem(
  id: string,
  data: UpdateHelpItemData
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, HELP_ITEMS_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    revalidatePath("/admin/help");
    return { success: true };
  } catch (e: any) {
    console.error("Error updating help item: ", e);
    return { error: e.message || "Тусламжийн зүйл шинэчлэхэд алдаа гарлаа." };
  }
}

export async function deleteHelpItem(id: string): Promise<{ success: boolean } | { error: string }> {
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
    
