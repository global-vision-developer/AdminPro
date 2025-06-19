
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onUploadComplete: (dataUri: string | null) => void;
  initialImageUrl?: string | null; // Can be a data URI or a regular URL if previously stored
  maxSizeMB?: number;
  maxDimension?: number; // Max width/height for client-side compression
  compressionQuality?: number; // For JPEG compression
  label?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  initialImageUrl: initialUrlProp,
  maxSizeMB = 1, // Reduced max size for Base64
  maxDimension = 800,
  compressionQuality = 0.7,
  label = "Зураг байршуулах",
}) => {
  const [currentDataUri, setCurrentDataUri] = useState<string | null>(initialUrlProp || null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrlProp || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // If initialUrlProp is a data URI, use it directly. If it's a regular URL,
    // it implies it's from a previous version or manual input, so we can't "remove" it
    // from a non-existent storage here. This component now primarily handles new uploads as Base64.
    setCurrentDataUri(initialUrlProp || null);
    setPreview(initialUrlProp || null);
  }, [initialUrlProp]);

  const handleImageCompressionAndConversion = (file: File): Promise<string> => {
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
          
          // Get data URI (default is PNG, can specify image/jpeg for compression)
          const dataUrl = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', compressionQuality);
          
          // Check size of dataURI (approximate, as it's string length)
          // 1 character of Base64 is roughly 6 bits. 1 byte = 8 bits.
          // So, length * (6/8) = bytes.
          const approxByteSize = dataUrl.length * (3/4); // simplified from 6/8
          if (approxByteSize > maxSizeMB * 1024 * 1024) {
            return reject(new Error(`Файлын хэмжээ (${(approxByteSize / (1024*1024)).toFixed(2)}MB) нь Base64 хөрвүүлсний дараа хэтэрхий том байна (хязгаар: ${maxSizeMB}MB). Илүү жижиг зураг сонгоно уу эсвэл шахалтыг нэмэгдүүлнэ үү.`));
          }
          resolve(dataUrl);
        };
        img.onerror = (errEvent) => {
            console.error("Image loading error for conversion:", errEvent);
            reject(new Error('Зураг ачаалахад алдаа гарлаа. Файл гэмтсэн эсвэл дэмжигддэггүй зургийн формат байж магадгүй.'));
        };
        if (event.target?.result) {
            img.src = event.target.result as string;
        } else {
            reject(new Error('FileReader зургийг уншиж чадсангүй.'));
        }
      };
      reader.onerror = (errEvent) => {
          console.error("FileReader error:", errEvent);
          reject(new Error('Файлыг уншиж чадсангүй.'));
      };
      reader.readAsDataURL(file); // Read original file to then draw on canvas
    });
  };


  const handleFileSelected = useCallback(async (file: File) => {
    if (!file) return;
    setError(null);

    // Check original file size first (rough check before compression)
    if (file.size > maxSizeMB * 1.5 * 1024 * 1024) { // Allow slightly larger original if it compresses well
      const errorMsg = `Анхны файлын хэмжээ (${(file.size / (1024*1024)).toFixed(2)}MB) хэтэрхий том байна (зөвшөөрөгдөх хэмжээ ойролцоогоор ${maxSizeMB}MB).`;
      setError(errorMsg);
      toast({ title: "Алдаа", description: errorMsg, variant: "destructive"});
      return;
    }

    setProcessing(true);
    let tempPreviewUrl = "";
    try {
        tempPreviewUrl = URL.createObjectURL(file);
        setPreview(tempPreviewUrl); // Show original image preview while processing

        const dataUri = await handleImageCompressionAndConversion(file);
        
        setCurrentDataUri(dataUri);
        setPreview(dataUri); // Update preview to compressed/converted Base64
        onUploadComplete(dataUri);
        toast({ title: "Амжилттай", description: "Зураг амжилттай боловсруулагдлаа." });

    } catch (processError: any) {
      console.error("Image processing/conversion error:", processError);
      const errorMsg = `Зураг боловсруулахад алдаа гарлаа: ${processError.message}`;
      setError(errorMsg);
      toast({ title: "Боловсруулалтын Алдаа", description: errorMsg, variant: "destructive", duration: 7000 });
      setPreview(initialUrlProp || null); // Revert preview
      setCurrentDataUri(initialUrlProp || null);
      onUploadComplete(initialUrlProp || null); // Revert to initial on error
    } finally {
      setProcessing(false);
      if (tempPreviewUrl && preview !== tempPreviewUrl && !tempPreviewUrl.startsWith('data:')) { // Don't revoke if it's already a data URI
           URL.revokeObjectURL(tempPreviewUrl);
      }
    }
  }, [maxSizeMB, maxDimension, compressionQuality, onUploadComplete, toast, initialUrlProp, preview]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
    if (event.target) {
      event.target.value = ""; // Allow re-selecting the same file
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

  const handleRemoveImage = () => {
    // No need for confirmation if it's just clearing local state / form field
    setError(null);
    setCurrentDataUri(null);
    if (preview && preview.startsWith('blob:')) { // Only revoke if it's an object URL
        URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onUploadComplete(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({ title: "Зураг устгагдлаа", description: "Сонгосон зураг цэвэрлэгдлээ." });
  };
  
  useEffect(() => {
    // Cleanup object URLs
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
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Зураг боловсруулж байна...</p>
          </div>
        ) : preview ? (
          <div className="relative group w-full max-w-xs mx-auto">
            <Image
              src={preview} // Can be data URI or external URL
              alt="Сонгосон зураг"
              width={maxDimension} 
              height={maxDimension * (9/16)} 
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '192px' }}
              className="rounded-md object-contain"
              data-ai-hint="uploaded image preview"
              onError={(e) => {
                console.warn("Error loading preview image:", preview);
                setError("Урьдчилан харах зургийг ачааллахад алдаа гарлаа. Энэ нь хүчингүй URL эсвэл data URI байж магадгүй.");
                setPreview(null); 
              }}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
              aria-label="Зургийг устгах"
              disabled={processing}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1">
            <UploadCloud className="h-10 w-10 text-muted-foreground/70" />
            <p className="text-sm font-medium text-foreground">Зургаа чирж оруулна уу</p>
            <p className="text-xs text-muted-foreground">эсвэл дарж сонгоно уу</p>
            <p className="text-xs text-muted-foreground mt-1">(Хамгийн ихдээ {maxSizeMB}MB Base64, JPEG/PNG/WEBP)</p>
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center text-destructive text-sm mt-1 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
          <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
          {error}
        </div>
      )}
       <p className="text-xs text-muted-foreground mt-1">
        Анхаар: Том зургууд нь Firestore-ийн баримт бичгийн 1MB хязгаарыг давж, зардлыг нэмэгдүүлж болзошгүй.
        Зургууд нь Base64 хэлбэрээр хадгалагдана.
      </p>
    </div>
  );
};

export default ImageUploader;
