
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTask } from "firebase/storage";
import { Progress } from '@/components/ui/progress';

interface ImageUploaderProps {
  onUploadComplete: (url: string | null) => void;
  initialImageUrl?: string | null;
  storagePath?: string;
  maxSizeMB?: number;
  label?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  initialImageUrl: initialUrlProp,
  storagePath = "images/",
  maxSizeMB = 5,
  label = "Зураг байршуулах",
}) => {
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrlProp || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPreview(initialUrlProp || null);
  }, [initialUrlProp]);

  const handleFileSelected = useCallback(async (file: File) => {
    if (!file) return;
    setError(null);
    let tempPreviewUrl = '';

    if (!storage) {
      const errorMsg = "Firebase Storage тохируулагдаагүй байна. `src/lib/firebase.ts` файлыг шалгана уу.";
      setError(errorMsg);
      toast({ title: "Тохиргооны Алдаа", description: errorMsg, variant: "destructive", duration: 8000 });
      return;
    }
    
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
        const errorMsg = "Firebase Storage Bucket тохируулагдаагүй байна. .env.local файл дотор NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET-г тохируулна уу.";
        setError(errorMsg);
        toast({ title: "Тохиргооны Алдаа", description: errorMsg, variant: "destructive", duration: 8000 });
        return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      const errorMsg = `Файлын хэмжээ (${(file.size / (1024 * 1024)).toFixed(2)}MB) хэтэрхий том байна (хязгаар: ${maxSizeMB}MB).`;
      setError(errorMsg);
      toast({ title: "Файлын хэмжээ их байна", description: errorMsg, variant: "destructive"});
      return;
    }

    setProcessing(true);
    setUploadProgress(0);
    tempPreviewUrl = URL.createObjectURL(file);
    setPreview(tempPreviewUrl);

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const fullStoragePath = `${storagePath.endsWith('/') ? storagePath : storagePath + '/'}${uniqueFileName}`;
    const storageRef = ref(storage, fullStoragePath);
    
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }
    );

    try {
      await uploadTask;
      const downloadURL = await getDownloadURL(storageRef);

      onUploadComplete(downloadURL);
      setPreview(downloadURL);
      toast({ title: "Амжилттай", description: "Зураг Firebase Storage-д амжилттай байршлаа." });

    } catch (uploadError: any) {
        console.error("Firebase Storage upload error:", uploadError);
        let errorMsg = `Зураг байршуулахад алдаа гарлаа: ${uploadError.message}`;
        switch (uploadError.code) {
            case 'storage/unauthorized':
                errorMsg = "Зураг байршуулах эрх байхгүй. Firebase Storage-ийн дүрмийг шалгана уу.";
                break;
            case 'storage/canceled':
                errorMsg = "Зураг байршуулахыг цуцаллаа.";
                break;
            case 'storage/unknown':
                errorMsg = "Үл мэдэгдэх алдаа гарлаа. Сүлжээний холболтоо шалгаад дахин оролдоно уу.";
                break;
        }
        setError(errorMsg);
        toast({ title: "Байршуулалтын Алдаа", description: errorMsg, variant: "destructive", duration: 7000 });
        
        setPreview(initialUrlProp || null);
        onUploadComplete(initialUrlProp || null);
    } finally {
        setProcessing(false);
        setUploadProgress(0);
        if (tempPreviewUrl && tempPreviewUrl.startsWith('blob:')) {
           URL.revokeObjectURL(tempPreviewUrl);
        }
    }
  }, [storagePath, maxSizeMB, onUploadComplete, toast, initialUrlProp]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelected(file);
    } else {
      setError("Зургийн файл сонгоно уу.");
      toast({title: "Буруу Файлын Төрөл", description: "Зөвхөн зургийн файл сонгоно уу.", variant: "destructive"})
    }
  }, [handleFileSelected, toast]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRemoveImage = async () => {
    if (preview && preview.includes('firebasestorage.googleapis.com')) {
      setProcessing(true);
      try {
        const imageRef = ref(storage, preview);
        await deleteObject(imageRef);
        toast({ title: "Зураг устгагдлаа", description: "Зураг Firebase Storage-оос устгагдлаа." });
      } catch (deleteError: any) {
        if (deleteError.code !== 'storage/object-not-found') {
            toast({ title: "Устгах үед алдаа гарлаа", description: "Storage-оос зураг устгахад алдаа гарлаа. Гэхдээ та үргэлжлүүлж болно.", variant: "destructive"});
        }
      } finally {
        setProcessing(false);
      }
    } else if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
    }
    
    setError(null);
    setPreview(null);
    onUploadComplete(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  useEffect(() => {
    let currentPreviewForCleanup = preview;
    return () => {
      if (currentPreviewForCleanup && currentPreviewForCleanup.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreviewForCleanup);
      }
    };
  }, [preview]);

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium text-foreground block">{label}</label>}
      <div
        className="w-full p-4 border-2 border-dashed border-muted-foreground/50 rounded-md flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors min-h-[150px] bg-muted/20"
        onClick={() => !processing && fileInputRef.current?.click()}
        onDrop={!processing ? onDrop : undefined}
        onDragOver={!processing ? onDragOver : undefined}
        onDragEnter={!processing ? onDragOver : undefined}
      >
        <input
          type="file"
          accept="image/jpeg, image/png, image/webp" 
          ref={fileInputRef}
          onChange={onFileChange}
          className="hidden"
          disabled={processing}
        />
        {processing ? (
          <div className="flex flex-col items-center space-y-2 w-full">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Зураг байршуулж байна... {Math.round(uploadProgress)}%</p>
            <Progress value={uploadProgress} className="w-full h-2 mt-2" />
          </div>
        ) : preview ? (
          <div className="relative group w-full max-w-xs mx-auto">
            <Image
              src={preview}
              alt="Сонгосон зураг"
              width={200} 
              height={112} 
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '192px' }}
              className="rounded-md object-contain"
              data-ai-hint="uploaded image preview"
              onError={() => {
                setError("Урьдчилан харах зургийг ачааллахад алдаа гарлаа.");
                setPreview(null); 
              }}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
              aria-label="Зургийг устгах"
              disabled={processing}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1">
            <UploadCloud className="h-10 w-10 text-muted-foreground/70" />
            <p className="text-sm font-medium text-foreground">Зургаа чирж оруулна уу</p>
            <p className="text-xs text-muted-foreground">эсвэл дарж сонгоно уу</p>
            <p className="text-xs text-muted-foreground mt-1">(Хамгийн ихдээ {maxSizeMB}MB, JPEG/PNG/WEBP)</p>
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center text-destructive text-sm mt-1 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
          <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
