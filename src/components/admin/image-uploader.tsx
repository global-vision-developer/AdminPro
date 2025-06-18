
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploaderProps {
  onUploadComplete: (downloadURL: string | null) => void;
  initialImageUrl?: string | null;
  storagePath?: string;
  maxSizeMB?: number;
  maxDimension?: number;
  compressionQuality?: number;
  label?: string;
}

const DIRECT_UPLOAD_THRESHOLD_MB = 3; // 3MB

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  initialImageUrl: initialUrlProp,
  storagePath = "general-uploads",
  maxSizeMB = 5,
  maxDimension = 1200,
  compressionQuality = 0.8,
  label = "Зураг байршуулах",
}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialUrlProp || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrlProp || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentImageUrl(initialUrlProp || null);
    setPreview(initialUrlProp || null);
  }, [initialUrlProp]);

  const handleImageCompression = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
          let { width, height } = img;
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Failed to get canvas context'));
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            compressionQuality
          );
        };
        img.onerror = (errEvent) => {
            console.error("Image loading error for compression:", errEvent);
            reject(new Error('Image loading failed for compression. The file might be corrupt or not a supported image format.'));
        };
        if (event.target?.result) {
            img.src = event.target.result as string;
        } else {
            reject(new Error('FileReader did not successfully read the file.'));
        }
      };
      reader.onerror = (errEvent) => {
          console.error("FileReader error:", errEvent);
          reject(new Error('File could not be read.'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      const errorMsg = `Файлын хэмжээ ${maxSizeMB}MB-аас хэтэрсэн байна.`;
      setError(errorMsg);
      toast({ title: "Алдаа", description: errorMsg, variant: "destructive"});
      return;
    }

    setUploading(true);
    setProgress(0);
    let tempPreviewUrl = "";
    try {
        tempPreviewUrl = URL.createObjectURL(file);
        setPreview(tempPreviewUrl);
    } catch (e) {
        console.error("Error creating object URL for preview:", e);
        // Not critical, upload can proceed without preview if this fails
    }


    try {
      let blobToUpload: Blob;
      if (file.size < DIRECT_UPLOAD_THRESHOLD_MB * 1024 * 1024 && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
        console.log(`ImageUploader: File size (${(file.size / (1024*1024)).toFixed(2)}MB) is less than ${DIRECT_UPLOAD_THRESHOLD_MB}MB and is JPEG/PNG/WEBP. Uploading directly.`);
        blobToUpload = file;
      } else {
        console.log(`ImageUploader: File size (${(file.size / (1024*1024)).toFixed(2)}MB) or type (${file.type}) requires compression. Compressing image...`);
        blobToUpload = await handleImageCompression(file);
        console.log(`ImageUploader: Image compressed. New size: (${(blobToUpload.size / (1024*1024)).toFixed(2)}MB)`);
      }

      const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
      const imageRef = ref(storage, `${storagePath}/${fileName}`);
      const uploadTask = uploadBytesResumable(imageRef, blobToUpload);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(prog);
        },
        (uploadError) => {
          console.error("Upload error:", uploadError);
          const errorMsg = `Зураг байршуулахад алдаа гарлаа: ${uploadError.message}`;
          setError(errorMsg);
          toast({ title: "Байршуулах Алдаа", description: errorMsg, variant: "destructive" });
          setUploading(false);
          setPreview(initialUrlProp || null);
          setProgress(0);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploading(false); 
          setProgress(100); 
          
          setCurrentImageUrl(downloadURL);
          setPreview(downloadURL); // Update preview to final URL
          
          try {
            onUploadComplete(downloadURL);
          } catch (callbackError) {
            console.error("Error in onUploadComplete callback:", callbackError);
            toast({ title: "Аппликэйшний алдаа", description: "Зураг байршсан ч дараагийн үйлдэл алдаатай байна.", variant: "destructive" });
          }
          
          toast({ title: "Амжилттай", description: "Зураг амжилттай байршуулагдлаа." });
          // No need to revoke tempPreviewUrl here as setPreview(downloadURL) replaces it.
          // It will be revoked if component unmounts or preview changes again.
        }
      );
    } catch (processError: any) {
      console.error("Image processing/upload error:", processError);
      const errorMsg = `Зураг боловсруулах/байршуулахад алдаа гарлаа: ${processError.message}`;
      setError(errorMsg);
      toast({ title: "Боловсруулалтын Алдаа", description: errorMsg, variant: "destructive" });
      setUploading(false);
      setPreview(initialUrlProp || null);
      setProgress(0);
    } finally {
        if (tempPreviewUrl && preview !== tempPreviewUrl) { // Clean up if temp URL was created but not used as final preview
             URL.revokeObjectURL(tempPreviewUrl);
        }
    }
  }, [storagePath, maxSizeMB, compressionQuality, maxDimension, onUploadComplete, toast, initialUrlProp, preview]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
     // Reset file input to allow re-uploading the same file
    if (event.target) {
      event.target.value = "";
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else {
      setError("Зургийн файл сонгоно уу.");
      toast({title: "Буруу Файлын Төрөл", description: "Зөвхөн зургийн файл сонгоно уу.", variant: "destructive"})
    }
  }, [handleFileUpload]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;
    const confirmation = window.confirm("Та энэ зургийг устгахдаа итгэлтэй байна уу? Энэ нь боломжтой бол Firebase Storage-аас мөн устгах болно.");
    if (!confirmation) return;

    if (currentImageUrl.includes('firebasestorage.googleapis.com')) {
        try {
            const imageRef = ref(storage, currentImageUrl);
            await deleteObject(imageRef);
            toast({ title: "Зураг Storage-оос устгагдлаа."});
        } catch (deleteError: any) {
            console.warn("Failed to delete image from Firebase Storage:", deleteError);
            if (deleteError.code === 'storage/object-not-found') {
                // Object not found, consider it deleted from storage already.
            } else {
                toast({ title: "Storage-оос устгах алдаа", description: "Зураг Storage-оос устгагдсангүй, гэхдээ UI-аас цэвэрлэгдэх болно.", variant: "destructive"});
            }
        }
    }

    setCurrentImageUrl(null);
    if (preview && preview.startsWith('blob:')) { // Revoke object URL if it's a blob
        URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onUploadComplete(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  useEffect(() => {
    // Cleanup object URLs when component unmounts or preview changes
    let currentPreview = preview;
    return () => {
      if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, [preview]);


  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium text-foreground block">{label}</label>}
      <div
        className="w-full p-4 border-2 border-dashed border-muted-foreground/50 rounded-md flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors min-h-[150px] bg-muted/20"
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={!uploading ? onDrop : undefined}
        onDragOver={!uploading ? onDragOver : undefined}
        onDragEnter={!uploading ? onDragOver : undefined}
      >
        <input
          type="file"
          accept="image/jpeg, image/png, image/webp, image/gif"
          ref={fileInputRef}
          onChange={onFileChange}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Зураг байршуулж байна...</p>
            <Progress value={progress} className="w-3/4" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        ) : preview ? (
          <div className="relative group w-full max-w-xs mx-auto">
            <Image
              src={preview}
              alt="Сонгосон зураг"
              width={maxDimension}
              height={maxDimension * (9/16)} // Maintain aspect ratio, adjust as needed
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '192px' }} // 192px = 12rem, for max-h-48
              className="rounded-md object-contain"
              data-ai-hint="uploaded image preview"
              onError={(e) => {
                console.warn("Error loading preview image:", preview);
                setError("Урьдчилан харах зургийг ачааллахад алдаа гарлаа.");
                setPreview(null); // Clear broken preview
              }}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
              aria-label="Зургийг устгах"
              disabled={uploading}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1">
            <UploadCloud className="h-10 w-10 text-muted-foreground/70" />
            <p className="text-sm font-medium text-foreground">Зургаа чирж оруулна уу</p>
            <p className="text-xs text-muted-foreground">эсвэл дарж сонгоно уу</p>
            <p className="text-xs text-muted-foreground mt-1">(Хамгийн ихдээ {maxSizeMB}MB, JPEG/PNG/WEBP/GIF форматтай)</p>
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

