
"use server";

import { db, auth as adminAuth } from "@/lib/firebase";
import type { Anket, Category, Entry, AppUser } from "@/types";
import { AnketStatus } from "@/types";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { addEntry } from "./entryActions";
import { getAppUsersMap } from "./appUserActions"; // Helper to get users efficiently

const ANKETS_COLLECTION = "ankets";
const CATEGORIES_COLLECTION = "categories";
const TARGET_TRANSLATOR_CATEGORY_SLUG = "orchluulagchid";

export async function getAnkets(statusFilter?: AnketStatus): Promise<Anket[]> {
  try {
    const anketsRef = collection(db, ANKETS_COLLECTION);
    
    // The original orderBy was breaking the query because 'submittedAt' field does not exist in the documents.
    // Removing it allows fetching the documents.
    const q = statusFilter 
      ? query(anketsRef, where("status", "==", statusFilter)) 
      : query(anketsRef);
      
    const [querySnapshot, usersMap] = await Promise.all([
        getDocs(q),
        getAppUsersMap()
    ]);

    const ankets = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const user = usersMap[doc.id] || null; // The anket doc ID is the user's UID

      return {
        id: doc.id,
        name: user?.displayName || "Unknown User", // Fetch name from user profile
        email: user?.email || "No Email", // Fetch email from user profile
        phoneNumber: data.chinaPhoneNumber || data.phoneNumber,
        cvLink: data.cvLink || "", // Fallback for legacy field
        message: data.description || "", // Map from description field
        submittedAt: (data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date())).toISOString(),
        status: data.status || AnketStatus.PENDING,
        processedBy: data.processedBy,
        processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate().toISOString() : undefined,
        // Map new fields
        averageRating: data.averageRating ?? null,
        chinaPhoneNumber: data.chinaPhoneNumber,
        idCardBackImageUrl: data.idCardBackImageUrl,
        dailyRate: data.dailyRate,
      } as Anket;
    });

    // Manual sort because we cannot rely on Firestore's orderBy
    return ankets.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  } catch (e: any) {
    console.error("Error getting ankets: ", e);
    return [];
  }
}

export async function getAnket(id: string): Promise<Anket | null> {
  try {
    const anketDocRef = doc(db, ANKETS_COLLECTION, id);
    const userDocRef = doc(db, "users", id); // Assuming user data is in 'users' collection

    const [anketSnap, userSnap] = await Promise.all([
        getDoc(anketDocRef),
        getDoc(userDocRef)
    ]);

    if (anketSnap.exists()) {
      const data = anketSnap.data();
      const user = userSnap.exists() ? userSnap.data() : null;
      
      return {
        id: anketSnap.id,
        name: user?.displayName || "Unknown User",
        email: user?.email || "No Email",
        phoneNumber: data.chinaPhoneNumber || data.phoneNumber,
        cvLink: data.cvLink || "",
        message: data.description || "",
        submittedAt: (data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date())).toISOString(),
        status: data.status || AnketStatus.PENDING,
        processedBy: data.processedBy,
        processedAt: data.processedAt instanceof Timestamp ? data.processedAt.toDate().toISOString() : undefined,
        // Map new fields
        averageRating: data.averageRating ?? null,
        chinaPhoneNumber: data.chinaPhoneNumber,
        idCardBackImageUrl: data.idCardBackImageUrl,
        dailyRate: data.dailyRate,
      } as Anket;
    }
    return null;
  } catch (e: any) {
    console.error("Error getting anket: ", e);
    return null;
  }
}


export async function updateAnketStatus(
  id: string,
  status: AnketStatus,
  adminId: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, ANKETS_COLLECTION, id);
    await updateDoc(docRef, {
      status: status,
      processedBy: adminId,
      processedAt: serverTimestamp(),
    });
    revalidatePath("/admin/anket");
    revalidatePath(`/admin/anket/${id}`);
    return { success: true };
  } catch (e: any) {
    console.error("Error updating anket status: ", e);
    return { error: e.message || "Анкетийн статус шинэчлэхэд алдаа гарлаа." };
  }
}

async function getTranslatorCategory(): Promise<Category | null> {
    try {
        const categoriesRef = collection(db, CATEGORIES_COLLECTION);
        const q = query(categoriesRef, where("slug", "==", TARGET_TRANSLATOR_CATEGORY_SLUG));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.error(`"Орчуулагчид" категори (slug: "${TARGET_TRANSLATOR_CATEGORY_SLUG}") олдсонгүй.`);
            return null;
        }
        const categoryDoc = snapshot.docs[0];
        const data = categoryDoc.data();
        return {
            id: categoryDoc.id,
            name: data.name,
            slug: data.slug,
            fields: data.fields || [],
        } as Category;
    } catch (error) {
        console.error(`Error fetching translator category (slug: "${TARGET_TRANSLATOR_CATEGORY_SLUG}"): `, error);
        return null;
    }
}


export async function approveAnketAndCreateTranslatorEntry(
  anketId: string,
  adminId: string
): Promise<{ success: boolean; entryId?: string } | { error: string }> {
  const batch = writeBatch(db);

  try {
    // Use the new getAnket function to get fully populated data
    const anketData = await getAnket(anketId);

    if (!anketData) {
      return { error: "Анкет олдсонгүй." };
    }

    const translatorCategory = await getTranslatorCategory();
    if (!translatorCategory) {
      return { error: `"Орчуулагчид" категори (slug: "${TARGET_TRANSLATOR_CATEGORY_SLUG}") системд тохируулагдаагүй байна. Админтай холбогдоно уу.` };
    }

    const entryDataPayload: Record<string, any> = {};
    
    const fieldMappings: Record<string, keyof Anket> = {
        'name': 'name',
        'email': 'email',
        'phone_number': 'phoneNumber',
        'cv_link': 'cvLink',
        'notes': 'message'
    };

    translatorCategory.fields.forEach(field => {
        if (fieldMappings[field.key]) {
            const anketFieldKey = fieldMappings[field.key];
            // @ts-ignore
            const value = anketData[anketFieldKey];
            if (value !== undefined && value !== null && value !== '') {
                entryDataPayload[field.key] = value;
            }
        }
        if (field.required && !entryDataPayload.hasOwnProperty(field.key)) {
            console.warn(`Required field "${field.label}" (key: ${field.key}) for "Орчуулагчид" category is missing from anket ${anketId}. Setting to default/empty.`);
            // Set a default value based on type to avoid Firestore errors
            switch (field.type) {
                case "Text":
                case "Textarea":
                    entryDataPayload[field.key] = ""; break;
                case "Number":
                    entryDataPayload[field.key] = 0; break;
                case "Boolean":
                    entryDataPayload[field.key] = false; break;
                default:
                    entryDataPayload[field.key] = null;
            }
        }
    });

    const newEntryResult = await addEntry({
      categoryId: translatorCategory.id,
      categoryName: translatorCategory.name,
      title: anketData.name,
      data: entryDataPayload,
      status: 'published',
    });

    if ("error" in newEntryResult) {
      return { error: `Орчуулагчийн бүртгэл үүсгэхэд алдаа гарлаа: ${newEntryResult.error}` };
    }

    const anketDocRef = doc(db, ANKETS_COLLECTION, anketId);
    batch.update(anketDocRef, {
      status: AnketStatus.APPROVED,
      processedBy: adminId,
      processedAt: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath("/admin/anket");
    revalidatePath(`/admin/anket/${anketId}`);
    revalidatePath("/admin/entries");
    revalidatePath(`/admin/entries?category=${translatorCategory.id}`);

    return { success: true, entryId: newEntryResult.id };
  } catch (e: any) {
    console.error("Error approving anket and creating entry: ", e);
    return { error: e.message || "Анкет зөвшөөрч, бүртгэл үүсгэхэд алдаа гарлаа." };
  }
}
