
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

export async function getHelpItems(topicId?: HelpTopic): Promise<HelpItem[]> {
  try {
    const helpItemsRef = collection(db, HELP_ITEMS_COLLECTION);
    const q = topicId 
                ? query(helpItemsRef, where("topic", "==", topicId), orderBy("createdAt", "desc"))
                : query(helpItemsRef, orderBy("createdAt", "desc"));
    
    const querySnapshot = await getDocs(q);
    const itemsFromDb = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
            id: docSnap.id, 
            topic: data.topic as HelpTopic, // Ensure topic is cast to HelpTopic enum
            question: data.question,
            answer: data.answer,
            isPredefined: data.isPredefined === true,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
            createdBy: data.createdBy,
         } as HelpItem;
    });
    
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
      topic: data.topic, // Will store "1" or "2"
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
    
    const updatePayload: Record<string, any> = { ...data };
    if (data.topic) updatePayload.topic = data.topic; // Will be "1" or "2"
    if (data.question) updatePayload.question = data.question;
    if (data.answer) updatePayload.answer = data.answer;
    
    updatePayload.updatedAt = serverTimestamp();

    await updateDoc(docRef, updatePayload);
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
    
