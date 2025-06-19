
"use server";

import { db, auth as adminAuth } from "@/lib/firebase";
import type { HelpItem, HelpRequest } from "@/types"; // Keep existing type import
import { HelpTopic } from "@/types"; // Added this line to import HelpTopic
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const HELP_ITEMS_COLLECTION = "help_items";
const HELP_REQUESTS_COLLECTION = "help_requests";

// Mock data for pre-defined FAQs - replace with actual Firestore fetching if needed
const predefinedHelpItems: HelpItem[] = [
  {
    id: "faq1_app",
    topic: HelpTopic.APPLICATION_GUIDE,
    question: "Аппликэйшн интернетгүй үед ажилладаг уу?",
    answer: "Бидний аппликэйшн нь үндсэн функцуудаа ажиллуулахын тулд интернет холболт шаарддаг. Гэсэн хэдий ч, та аяллын төлөвлөгөө, тасалбар зэрэг зарим мэдээллийг офлайн байдлаар хадгалах боломжтой. Офлайн функцүүдийг ашиглахын тулд урьдчилан дата татаж авах шаардлагатайг анхаарна уу. Дэлгэрэнгүй мэдээллийг тохиргоо хэсгээс харна уу.",
    isPredefined: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "faq2_app",
    topic: HelpTopic.APPLICATION_GUIDE,
    question: "Мэдээллээ яаж устгах вэ?",
    answer: "Та өөрийн хувийн мэдээлэл болон бүртгэлээ устгахыг хүсвэл аппликэйшны 'Профайл' > 'Тохиргоо' > 'Бүртгэл устгах' хэсэгт хандана уу. Энэ үйлдэл нь таны бүх өгөгдлийг манай системээс бүрмөсөн устгах бөгөөд үүнийг буцаах боломжгүйг анхаарна уу. Хэрэв танд нэмэлт тусламж хэрэгтэй бол бидэнтэй холбогдоно уу.",
    isPredefined: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "faq3_app",
    topic: HelpTopic.APPLICATION_GUIDE,
    question: "Нууц үгээ мартсан тохиолдолд яах вэ?",
    answer: "Хэрэв та нууц үгээ мартсан бол нэвтрэх хуудасны 'Нууц үг мартсан уу?' холбоос дээр дарна уу. Таны бүртгэлтэй имэйл хаяг руу нууц үг сэргээх зааварчилгаа илгээгдэх болно. Имэйлээ шалгаад, зааврын дагуу шинэ нууц үгээ тохируулна уу. Хэрэв имэйл ирэхгүй байвал спам фолдероо шалгаарай.",
    isPredefined: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "faq1_travel",
    topic: HelpTopic.TRAVEL_TIPS,
    question: "Аялахад хамгийн тохиромжтой сар хэзээ вэ?",
    answer: "Аялахад тохиромжтой сар нь таны очихыг хүсэж буй газар, сонирхож буй үйл ажиллагаанаас ихээхэн хамаарна. Жишээлбэл, далайн эрэг дээр амрахыг хүсвэл зуны сарууд тохиромжтой байдаг бол ууланд авирах, цанаар гулгах сонирхолтой бол өвөл, хаврын эхэн сар илүү тохиромжтой. Мөн аяллын улирлаас гадуур аялах нь зардал хэмнэх, хүн багатай үед тайван аялах боломжийг олгодог.",
    isPredefined: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "faq2_travel",
    topic: HelpTopic.TRAVEL_TIPS,
    question: "Хямд тийз яаж олох вэ?",
    answer: "Хямд тийз олохын тулд дараах зөвлөмжүүдийг анхаараарай: 1. Аялахаар төлөвлөж буй хугацаанаасаа дор хаяж 1-3 сарын өмнө тийзээ хайж эхлээрэй. 2. Долоо хоногийн дунд үеийн (Мягмар, Лхагва) нислэгүүд ихэвчлэн хямд байдаг. 3. Янз бүрийн авиа компани болон тийз борлуулах вэбсайтуудын үнийг харьцуулж үзээрэй. 4. Аяллын улирлаас гадуурх үеийг сонгох. 5. Нислэгийн компанийн мэдээллийн хуудсанд бүртгүүлж, хямдралтай саналуудыг хүлээж аваарай.",
    isPredefined: true,
    createdAt: new Date().toISOString(),
  },
];

export async function getHelpItems(topic?: HelpTopic): Promise<HelpItem[]> {
  try {
    // For now, return filtered mock data.
    // In a real scenario, fetch from Firestore:
    // const helpItemsRef = collection(db, HELP_ITEMS_COLLECTION);
    // const q = topic ? query(helpItemsRef, where("topic", "==", topic), where("isPredefined", "==", true), orderBy("createdAt", "desc"))
    //               : query(helpItemsRef, where("isPredefined", "==", true), orderBy("createdAt", "desc"));
    // const querySnapshot = await getDocs(q);
    // const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpItem));
    // return items;

    if (topic) {
      return predefinedHelpItems.filter(item => item.topic === topic);
    }
    return predefinedHelpItems; // Return all if no specific topic
  } catch (e: any) {
    console.error("Error getting help items: ", e);
    return [];
  }
}

export async function submitHelpRequest(
  topic: HelpTopic,
  question: string
): Promise<{ id: string } | { error: string }> {
  const currentUser = adminAuth.currentUser; // If submitted from admin panel
  try {
    const dataToSave: Omit<HelpRequest, "id" | "createdAt"> & { createdAt: any } = {
      topic,
      question,
      userId: currentUser?.uid,
      userEmail: currentUser?.email,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, HELP_REQUESTS_COLLECTION), dataToSave);
    revalidatePath("/admin/help"); // Revalidate if admin can see these requests
    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error submitting help request: ", e);
    return { error: e.message || "Тусламж хүсэлт илгээхэд алдаа гарлаа." };
  }
}

    