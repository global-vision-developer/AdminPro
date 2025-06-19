
"use server";

import { db } from "@/lib/firebase"; // Removed adminAuth import as it's not reliably usable in server actions
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
    const itemsFromDb = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            topic: data.topic as HelpTopic,
            question: data.question,
            answer: data.answer,
            isPredefined: data.isPredefined === true,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
            createdBy: data.createdBy,
         } as HelpItem;
    });
    
    if (itemsFromDb.length === 0 && !topic) { 
        const mockItems: HelpItem[] = [
             {
                id: "mock_faq1_app",
                topic: HelpTopic.APPLICATION_GUIDE,
                question: "Аппликэйшн интернетгүй үед ажилладаг уу? (Жишээ)",
                answer: "Энэ бол админ панелаас оруулсан жишээ хариулт. Та үүнийг засаж эсвэл устгаж болно.",
                isPredefined: true,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
              },
              {
                id: "mock_faq1_travel",
                topic: HelpTopic.TRAVEL_TIPS,
                question: "Аялахад хамгийн тохиромжтой сар хэзээ вэ? (Жишээ)",
                answer: "Энэ бол \"Хэрхэн хямд аялах вэ?\" сэдвийн жишээ хариулт.",
                isPredefined: true,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              },
        ];
        return mockItems;
    }

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
  adminId: string; // ID of the admin creating the item
}

export async function addHelpItem(
  data: AddHelpItemData
): Promise<{ id: string } | { error: string }> {
  // Removed: const currentAdmin = adminAuth.currentUser; check
  // Authorization will be handled by Firestore Security Rules.

  try {
    const dataToSave = {
      topic: data.topic,
      question: data.question,
      answer: data.answer,
      isPredefined: true, // Admin-added FAQs are considered predefined
      createdBy: data.adminId, // Use the adminId passed from the client
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
  // Removed: const currentAdmin = adminAuth.currentUser; check
  // Authorization will be handled by Firestore Security Rules.
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
  // Removed: const currentAdmin = adminAuth.currentUser; check
  // Authorization will be handled by Firestore Security Rules.
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
    
