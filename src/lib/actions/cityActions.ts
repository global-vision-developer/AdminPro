
"use server";

import { db } from "@/lib/firebase";
import type { City } from "@/types";
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
} from "firebase/firestore";
import { revalidatePath } from "next/cache";

const CITIES_COLLECTION = "cities";

interface CityFirestoreData {
  name: string;
  nameCN: string;
  order: number;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export async function addCity(
  cityData: Omit<City, "id" | "createdAt" | "updatedAt">
): Promise<{ id: string } | { error: string }> {
  try {
    const dataToSave: CityFirestoreData = {
      name: cityData.name,
      nameCN: cityData.nameCN,
      order: cityData.order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, CITIES_COLLECTION), dataToSave);
    revalidatePath("/admin/cities");
    return { id: docRef.id };
  } catch (e: any) {
    console.error("Error adding city: ", e);
    return { error: e.message || "Хот нэмэхэд алдаа гарлаа." };
  }
}

export async function getCities(): Promise<City[]> {
  try {
    const q = query(collection(db, CITIES_COLLECTION), orderBy("order", "asc"), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        nameCN: data.nameCN || "",
        order: data.order || 0,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as City;
    });
  } catch (e: any) {
    console.error("Error getting cities: ", e);
    return [];
  }
}

export async function getCity(id: string): Promise<City | null> {
  try {
    const docRef = doc(db, CITIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "",
        nameCN: data.nameCN || "",
        order: data.order || 0,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      } as City;
    }
    return null;
  } catch (e: any) {
    console.error("Error getting city: ", e);
    return null;
  }
}

export async function updateCity(
  id: string,
  cityData: Partial<Omit<City, "id" | "createdAt" | "updatedAt">>
): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, CITIES_COLLECTION, id);
    await updateDoc(docRef, {
      ...cityData,
      updatedAt: serverTimestamp(),
    });
    revalidatePath("/admin/cities");
    revalidatePath(`/admin/cities/${id}/edit`);
    return { success: true };
  } catch (e: any) {
    console.error("Error updating city: ", e);
    return { error: e.message || "Хот шинэчлэхэд алдаа гарлаа." };
  }
}

export async function deleteCity(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    const docRef = doc(db, CITIES_COLLECTION, id);
    await deleteDoc(docRef);
    revalidatePath("/admin/cities");
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting city: ", e);
    return { error: e.message || "Хот устгахад алдаа гарлаа." };
  }
}
