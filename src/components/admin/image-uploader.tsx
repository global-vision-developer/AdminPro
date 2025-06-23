
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onUploadComplete: (url: string | null) => void;
  initialImageUrl?: string | null;
  maxSizeMB?: number;
  label?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  initialImageUrl: initialUrlProp,
  maxSizeMB = 2, // Default max size 2MB for Cloudinary
  label = "Зураг байршуулах",
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrlProp || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cloudinary credentials from environment variables
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    setPreview(initialUrlProp || null);
  }, [initialUrlProp]);

  const handleFileSelected = useCallback(async (file: File) => {
    if (!file) return;
    setError(null);

    if (!cloudName || !uploadPreset) {
      const errorMsg = "Cloudinary тохируулагдаагүй байна. .env.local файл дотор cloud name болон upload preset-г тохируулна уу.";
      setError(errorMsg);
      toast({ title: "Тохиргооны Алдаа", description: errorMsg, variant: "destructive", duration: 8000 });
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      const errorMsg = `Файлын хэмжээ (${(file.size / (1024*1024)).toFixed(2)}MB) хэтэрхий том байна (хязгаар: ${maxSizeMB}MB).`;
      setError(errorMsg);
      toast({ title: "Файлын хэмжээ их байна", description: errorMsg, variant: "destructive"});
      return;
    }

    setProcessing(true);
    let tempPreviewUrl = URL.createObjectURL(file);
    setPreview(tempPreviewUrl);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Cloudinary-д файл хуулахад алдаа гарлаа');
      }

      const data = await response.json();
      const secureUrl = data.secure_url;
      
      onUploadComplete(secureUrl);
      setPreview(secureUrl); // Update preview to the final Cloudinary URL
      toast({ title: "Амжилттай", description: "Зураг Cloudinary-д амжилттай байршлаа." });

    } catch (processError: any) {
      console.error("Cloudinary upload error:", processError);
      const errorMsg = `Зураг байршуулахад алдаа гарлаа: ${processError.message}`;
      setError(errorMsg);
      toast({ title: "Байршуулалтын Алдаа", description: errorMsg, variant: "destructive", duration: 7000 });
      setPreview(initialUrlProp || null); // Revert preview
      onUploadComplete(initialUrlProp || null); // Revert to initial on error
    } finally {
      setProcessing(false);
       if (tempPreviewUrl && tempPreviewUrl.startsWith('blob:')) {
           URL.revokeObjectURL(tempPreviewUrl);
      }
    }
  }, [cloudName, uploadPreset, maxSizeMB, onUploadComplete, toast, initialUrlProp]);

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

  const handleRemoveImage = () => {
    setError(null);
    if (preview && preview.startsWith('blob:')) {
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
            <p className="text-sm text-muted-foreground">Зураг байршуулж байна...</p>
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
