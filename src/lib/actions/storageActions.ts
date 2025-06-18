// src/lib/actions/storageActions.ts
'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFileToStorage(formData: FormData): Promise<{ downloadURL?: string; error?: string }> {
  const file = formData.get('file') as File | null;
  const storagePath = formData.get('storagePath') as string | null;

  if (!file) {
    console.error("uploadFileToStorage: No file provided in FormData.");
    return { error: 'Файл олдсонгүй.' };
  }
  if (!storagePath) {
    console.error("uploadFileToStorage: Storage path not specified in FormData.");
    return { error: 'Хадгалах зам тодорхойгүй байна.' };
  }

  console.log(`uploadFileToStorage: Received file '${file.name}' (${Math.round(file.size / 1024)} KB) for path '${storagePath}'.`);

  try {
    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
    const fullStoragePath = `${storagePath}/${fileName}`;
    const imageRef = ref(storage, fullStoragePath);

    console.log(`uploadFileToStorage: Attempting to upload to Firebase Storage at '${fullStoragePath}'.`);
    // Файлын төрлийг uploadBytes-д metadata хэлбэрээр дамжуулж болно
    const metadata = {
        contentType: file.type,
    };
    const snapshot = await uploadBytes(imageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`uploadFileToStorage: File uploaded successfully. Download URL: ${downloadURL}`);

    return { downloadURL };
  } catch (error: any) {
    console.error('Error uploading file to Firebase Storage via Server Action:', error);
    return { error: error.message || 'Файл байршуулахад алдаа гарлаа.' };
  }
}

export async function deleteFileFromStorage(fileUrl: string): Promise<{ success?: boolean; error?: string }> {
    if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
        return { error: 'Буруу Firebase Storage URL байна.' };
    }
    try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting file from Firebase Storage via Server Action:', error);
        // Handle specific errors like 'object-not-found' if necessary
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found for deletion (may have already been deleted): ${fileUrl}`);
            return { success: true }; // Or return an error specific to "not found"
        }
        return { error: error.message || 'Файл устгахад алдаа гарлаа.' };
    }
}
