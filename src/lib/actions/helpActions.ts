
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

// Mock data (fallback if Firestore is empty or for testing)
// const mockHelpItems: HelpItem[] = [
//   {
//     id: "faq1_app",
//     topic: HelpTopic.APPLICATION_GUIDE,
//     question: "Аппликэйшн интернетгүй үед ажилладаг уу?",
//     answer: "Бидний аппликэйшн нь үндсэн функцуудаа ажиллуулахын тулд интернет холболт шаарддаг. Гэсэн хэдий ч, та аяллын төлөвлөгөө, тасалбар зэрэг зарим мэдээллийг офлайн байдлаар хадгалах боломжтой. Офлайн функцүүдийг ашиглахын тулд урьдчилан дата татаж авах шаардлагатайг анхаарна уу. Дэлгэрэнгүй мэдээллийг тохиргоо хэсгээс харна уу.",
//     isPredefined: true,
//     createdAt: new Date().toISOString(),
//   },
//   {
//     id: "faq2_app",
//     topic: HelpTopic.APPLICATION_GUIDE,
//     question: "Мэдээллээ яаж устгах вэ?",
//     answer: "Та өөрийн мэдээллийг устгахыг хүсвэл профайлын тохиргоо хэсэгт байрлах 'Бүртгэл устгах' товчийг дарна уу. Энэ үйлдэл нь таны бүх мэдээллийг манай системээс бүрмөсөн устгах болно.",
//     isPredefined: true,
//     createdAt: new Date().toISOString(),
//   },
//   {
//     id: "faq1_travel",
//     topic: HelpTopic.TRAVEL_TIPS,
//     question: "Аялахад хамгийн тохиромжтой сар хэзээ вэ?",
//     answer: "Энэ нь таны очих газраас ихээхэн хамаарна. Ерөнхийдөө, жуулчны улирлын бус үеүд (off-season) нь хямд зардалтай, хүн багатай байдаг тул илүү таатай байж болно. Жишээлбэл, Европ руу хавар (4-5 сар) эсвэл намар (9-10 сар) аялахад цаг агаар сайхан, үнэ харьцангуй боломжийн байдаг.",
//     isPredefined: true,
//     createdAt: new Date().toISOString(),
//   },
// ];


export async function getHelpItems(topicFilter?: HelpTopic): Promise<HelpItem[]> {
  try {
    const helpItemsRef = collection(db, HELP_ITEMS_COLLECTION);
    const q = topicFilter
                ? query(helpItemsRef, where("topic", "==", topicFilter), orderBy("createdAt", "desc"))
                : query(helpItemsRef, orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);
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

    // if (itemsFromDb.length === 0 && !topicFilter) {
    //   console.log("No items in Firestore, returning mock data for all topics.");
    //   return mockHelpItems;
    // }
    // if (itemsFromDb.length === 0 && topicFilter) {
    //    console.log(`No items in Firestore for topic ${topicFilter}, returning filtered mock data.`);
    //    return mockHelpItems.filter(item => item.topic === topicFilter);
    // }
    return itemsFromDb;

  } catch (e: any) {
    console.error("Error getting help items: ", e);
    // console.log("Returning mock data due to error.");
    // return topicFilter ? mockHelpItems.filter(item => item.topic === topicFilter) : mockHelpItems;
    return []; // Return empty on error instead of mock
  }
}

export interface AddHelpItemData {
  topic: HelpTopic; // Topic is the full string name
  question: string;
  answer: string;
  adminId: string; // ID of the admin creating the item
}

export async function addHelpItem(
  data: AddHelpItemData
): Promise<{ id: string } | { error: string }> {
  try {
    const dataToSave = {
      topic: data.topic, // Store the full string name
      question: data.question,
      answer: data.answer,
      isPredefined: true, // Admin-added FAQs are predefined
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

export async function updateHelpItem(
  id: string,
  data: UpdateHelpItemData
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, HELP_ITEMS_COLLECTION, id);

    const updatePayload: Record<string, any> = {};
    if (data.topic) updatePayload.topic = data.topic; // Store the full string name
    if (data.question) updatePayload.question = data.question;
    if (data.answer) updatePayload.answer = data.answer;

    if (Object.keys(updatePayload).length === 0) {
      return { error: "Шинэчлэх өгөгдөл алга." };
    }
    
    updatePayload.updatedAt = serverTimestamp();
    // Optionally, update 'updatedBy' if you add such a field, using data.adminId

    await updateDoc(docRef, updatePayload);
    revalidatePath("/admin/help");
    return { success: true };
  } catch (e: any) {
    console.error("Error updating help item: ", e);
    return { error: e.message || "Тусламжийн зүйл шинэчлэхэд алдаа гарлаа." };
  }
}

export async function deleteHelpItem(id: string, adminId: string): Promise<{ success: boolean } | { error: string }> {
  // adminId could be used for logging or further permission checks if needed
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
