
// src/lib/actions/storageActions.ts
'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFileToStorage(formData: FormData): Promise<{ downloadURL?: string; error?: string }> {
  const file = formData.get('file') as File | null;
  const storagePath = formData.get('storagePath') as string | null;

  // Log the environment variable to check if it's available on the server
  console.log("uploadFileToStorage: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET on server:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

  if (!file) {
    console.error("uploadFileToStorage: No file provided in FormData.");
    return { error: 'Файл олдсонгүй.' };
  }
  if (!storagePath) {
    console.error("uploadFileToStorage: Storage path not specified in FormData.");
    return { error: 'Хадгалах зам тодорхойгүй байна.' };
  }
   if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    console.error("uploadFileToStorage: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set.");
    return { error: 'Storage bucket тохиргоо олдсонгүй. Системийн админтай холбогдоно уу.' };
  }

  console.log(`uploadFileToStorage: Received file '${file.name}' (${Math.round(file.size / 1024)} KB) for path '${storagePath}'.`);

  try {
    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
    const fullStoragePath = `${storagePath}/${fileName}`;
    const imageRef = ref(storage, fullStoragePath);

    console.log(`uploadFileToStorage: Attempting to upload to Firebase Storage at '${fullStoragePath}'.`);
    const metadata = {
        contentType: file.type,
    };
    const snapshot = await uploadBytes(imageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`uploadFileToStorage: File uploaded successfully. Download URL: ${downloadURL}`);

    return { downloadURL };
  } catch (error: any) {
    console.error('Error uploading file to Firebase Storage via Server Action. Raw error object:', error);
    // Log the full error object structure for detailed diagnosis
    console.error('Full error object from Firebase Storage:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    let errorMessage = error.message || 'Файл байршуулахад үл мэдэгдэх алдаа гарлаа.';
    let errorCode = error.code || 'N/A';

    if (error.code) {
      console.error('Firebase Storage Error Code:', error.code);
    }
    if (error.serverResponse) {
      console.error('Firebase Storage Server Response:', error.serverResponse);
      // Attempt to parse serverResponse if it's a stringified JSON
      try {
        const serverResponseObj = JSON.parse(error.serverResponse);
        if (serverResponseObj && serverResponseObj.error && serverResponseObj.error.message) {
          errorMessage = serverResponseObj.error.message;
        }
      } catch (e) {
        // Ignore parsing error, serverResponse might not be JSON
      }
    }
     if (errorCode === 'storage/unknown') {
        errorMessage = `Firebase Storage-д үл мэдэгдэх алдаа гарлаа. Та Firebase Console > Storage > Rules хэсгийг шалгана уу. Мөн NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET орчны хувьсагч зөв эсэхийг (.env.local файл) нягтална уу. (${errorCode})`;
    } else if (errorCode === 'storage/unauthorized') {
        errorMessage = `Firebase Storage-д файл байршуулах эрх алга (storage/unauthorized). Та Firebase Storage Rules-г шалгана уу. (${errorCode})`;
    } else if (errorCode === 'storage/object-not-found' && error.message.includes("Bucket not found")) {
        errorMessage = `Firebase Storage bucket олдсонгүй. NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET орчны хувьсагч зөв эсэхийг шалгана уу. (${errorCode})`;
    }

    return { error: `Байршуулалт амжилтгүй боллоо: ${errorMessage}` };
  }
}

export async function deleteFileFromStorage(fileUrl: string): Promise<{ success?: boolean; error?: string }> {
    if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
        console.warn("deleteFileFromStorage: Invalid file URL provided:", fileUrl);
        return { error: 'Буруу Firebase Storage URL байна.' };
    }
    try {
        const fileRef = ref(storage, fileUrl);
        console.log(`deleteFileFromStorage: Attempting to delete file from Firebase Storage at '${fileUrl}'.`);
        await deleteObject(fileRef);
        console.log(`deleteFileFromStorage: File deleted successfully from '${fileUrl}'.`);
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting file from Firebase Storage via Server Action. Raw error object:', error);
        console.error('Full error object from Firebase Storage:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        let errorMessage = error.message || 'Файл устгахад үл мэдэгдэх алдаа гарлаа.';
        let errorCode = error.code || 'N/A';

        if (error.code) {
          console.error('Firebase Storage Error Code:', error.code);
        }
        if (error.serverResponse) {
          console.error('Firebase Storage Server Response:', error.serverResponse);
        }

        if (errorCode === 'storage/object-not-found') {
            console.warn(`File not found for deletion (may have already been deleted or URL is incorrect): ${fileUrl}`);
            return { success: true, error: 'Файл олдсонгүй, устгагдсан эсвэл URL буруу байж магадгүй.' };
        } else if (errorCode === 'storage/unauthorized') {
            errorMessage = `Firebase Storage-аас файл устгах эрх алга (storage/unauthorized). Та Firebase Storage Rules-г шалгана уу. (${errorCode})`;
        }
        return { error: `Устгалт амжилтгүй боллоо: ${errorMessage}` };
    }
}
