
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress'; // Progress bar temporarily removed
import { useToast } from '@/hooks/use-toast';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/actions/storageActions'; // Import server action

interface ImageUploaderProps {
  onUploadComplete: (downloadURL: string | null) => void;
  initialImageUrl?: string | null;
  storagePath?: string;
  maxSizeMB?: number;
  maxDimension?: number;
  compressionQuality?: number;
  label?: string;
}

const DIRECT_UPLOAD_THRESHOLD_MB = 3;

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
  // const [progress, setProgress] = useState(0); // Progress bar temporarily removed
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
    // setProgress(0); // Progress bar temporarily removed
    let tempPreviewUrl = "";
    try {
        tempPreviewUrl = URL.createObjectURL(file);
        setPreview(tempPreviewUrl);
    } catch (e) {
        console.error("Error creating object URL for preview:", e);
    }

    try {
      let blobToUpload: Blob = file;
      let originalFileName = file.name; // Store original file name for FormData

      if (file.size >= DIRECT_UPLOAD_THRESHOLD_MB * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        console.log(`ImageUploader: Compressing image '${file.name}'...`);
        try {
            blobToUpload = await handleImageCompression(file);
            console.log(`ImageUploader: Image compressed. Original: ${(file.size / (1024*1024)).toFixed(2)}MB, Compressed: ${(blobToUpload.size / (1024*1024)).toFixed(2)}MB`);
        } catch (compressionError: any) {
            console.warn(`ImageUploader: Compression failed for '${file.name}'. Uploading original. Error: ${compressionError.message}`);
            // If compression fails, upload the original file
            blobToUpload = file;
        }
      } else {
        console.log(`ImageUploader: File '${file.name}' (${(file.size / (1024*1024)).toFixed(2)}MB) is small and suitable type. Uploading directly.`);
      }
      
      const formData = new FormData();
      // Create a new File object from the blob if it was compressed, preserving the original name and type if possible
      const fileToUpload = new File([blobToUpload], originalFileName, { type: blobToUpload.type || file.type });
      formData.append('file', fileToUpload);
      formData.append('storagePath', storagePath);

      console.log(`ImageUploader: Calling uploadFileToStorage server action for file: '${fileToUpload.name}'.`);
      const result = await uploadFileToStorage(formData);
      setUploading(false);

      if (result.downloadURL) {
        // setProgress(100); // Progress bar temporarily removed
        setCurrentImageUrl(result.downloadURL);
        setPreview(result.downloadURL); // Update preview to final URL
        try {
          onUploadComplete(result.downloadURL);
        } catch (callbackError) {
          console.error("Error in onUploadComplete callback:", callbackError);
          toast({ title: "Аппликэйшний алдаа", description: "Зураг байршсан ч дараагийн үйлдэл алдаатай байна.", variant: "destructive" });
        }
        toast({ title: "Амжилттай", description: "Зураг амжилттай байршуулагдлаа." });
      } else {
        const errorMsg = result.error || "Зураг байршуулахад үл мэдэгдэх алдаа гарлаа.";
        setError(errorMsg);
        toast({ title: "Байршуулах Алдаа", description: errorMsg, variant: "destructive" });
        setPreview(initialUrlProp || null); // Revert preview if upload failed
        // setProgress(0); // Progress bar temporarily removed
      }
    } catch (processError: any) {
      console.error("Image processing/upload error:", processError);
      const errorMsg = `Зураг боловсруулах/байршуулахад алдаа гарлаа: ${processError.message}`;
      setError(errorMsg);
      toast({ title: "Боловсруулалтын Алдаа", description: errorMsg, variant: "destructive" });
      setUploading(false);
      setPreview(initialUrlProp || null);
      // setProgress(0); // Progress bar temporarily removed
    }  finally {
        if (tempPreviewUrl && preview !== tempPreviewUrl) {
             URL.revokeObjectURL(tempPreviewUrl);
        }
    }
  }, [storagePath, maxSizeMB, compressionQuality, maxDimension, onUploadComplete, toast, initialUrlProp, preview]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
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
      handleFileUpload(file);
    } else {
      setError("Зургийн файл сонгоно уу.");
      toast({title: "Буруу Файлын Төрөл", description: "Зөвхөн зургийн файл сонгоно уу.", variant: "destructive"})
    }
  }, [handleFileUpload, toast]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;
    const confirmation = window.confirm("Та энэ зургийг устгахдаа итгэлтэй байна уу? Энэ нь Firebase Storage-оос мөн устгах болно.");
    if (!confirmation) return;

    setUploading(true); // Indicate activity
    setError(null);

    try {
        const result = await deleteFileFromStorage(currentImageUrl);
        if (result.success) {
            toast({ title: "Зураг устгагдлаа", description: "Зураг амжилттай устгагдлаа." });
            setCurrentImageUrl(null);
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
            setPreview(null);
            onUploadComplete(null);
            // setProgress(0); // Progress bar temporarily removed
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
        } else {
            const errorMsg = result.error || "Зураг устгахад алдаа гарлаа.";
            setError(errorMsg);
            toast({ title: "Устгах Алдаа", description: errorMsg, variant: "destructive" });
        }
    } catch (e: any) {
        const errorMsg = `Зураг устгах явцад алдаа: ${e.message}`;
        setError(errorMsg);
        toast({ title: "Устгах Алдаа", description: errorMsg, variant: "destructive" });
    } finally {
        setUploading(false);
    }
  };
  
  useEffect(() => {
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
            {/* Progress component removed for server action simplicity
            <Progress value={progress} className="w-3/4" />
            <p className="text-xs text-muted-foreground">{progress}%</p> */}
          </div>
        ) : preview ? (
          <div className="relative group w-full max-w-xs mx-auto">
            <Image
              src={preview}
              alt="Сонгосон зураг"
              width={maxDimension}
              height={maxDimension * (9/16)}
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '192px' }}
              className="rounded-md object-contain"
              data-ai-hint="uploaded image preview"
              onError={(e) => {
                console.warn("Error loading preview image:", preview);
                setError("Урьдчилан харах зургийг ачааллахад алдаа гарлаа.");
                setPreview(null); 
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

