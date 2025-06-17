
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

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  initialImageUrl: initialUrlProp,
  storagePath = "general-uploads",
  maxSizeMB = 5,
  maxDimension = 1200,
  compressionQuality = 0.8,
  label = "Upload Image", 
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
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB.`); 
      return;
    }

    setUploading(true);
    setProgress(0);
    setPreview(URL.createObjectURL(file)); 

    try {
      const compressedBlob = await handleImageCompression(file);
      const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
      const imageRef = ref(storage, `${storagePath}/${fileName}`);
      const uploadTask = uploadBytesResumable(imageRef, compressedBlob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(prog);
        },
        (uploadError) => {
          console.error("Upload error:", uploadError);
          setError(`Image upload failed: ${uploadError.message}`); 
          setUploading(false);
          setPreview(currentImageUrl); 
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setCurrentImageUrl(downloadURL);
          setPreview(downloadURL);
          onUploadComplete(downloadURL);
          setUploading(false);
          toast({ title: "Success", description: "Image uploaded successfully." }); 
        }
      );
    } catch (compressionError: any) {
      console.error("Compression error:", compressionError);
      setError(`Image compression failed: ${compressionError.message}`); 
      setUploading(false);
      setPreview(currentImageUrl); 
    }
  }, [storagePath, maxSizeMB, compressionQuality, maxDimension, onUploadComplete, toast, currentImageUrl]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };
  
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else {
      setError("Please select an image file."); 
    }
  }, [handleFileUpload]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;
    const confirmation = window.confirm("Are you sure you want to delete this image? This will also attempt to delete it from Firebase Storage if possible."); // Changed
    if (!confirmation) return;

    if (currentImageUrl.includes('firebasestorage.googleapis.com')) {
        try {
            const imageRef = ref(storage, currentImageUrl);
            await deleteObject(imageRef);
            toast({ title: "Image deleted from Storage."}); 
        } catch (deleteError: any) {
            console.warn("Failed to delete image from Firebase Storage:", deleteError);
            if (deleteError.code === 'storage/object-not-found') {
            } else {
                toast({ title: "Storage Deletion Error", description: "Image was not deleted from Storage, but will be cleared from UI.", variant: "destructive"}); // Changed
            }
        }
    }
    
    setCurrentImageUrl(null);
    setPreview(null);
    onUploadComplete(null); 
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium text-foreground block">{label}</label>}
      <div 
        className="w-full p-4 border-2 border-dashed border-muted-foreground/50 rounded-md flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors min-h-[150px] bg-muted/20"
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
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
            <p className="text-sm text-muted-foreground">Uploading image...</p> 
            <Progress value={progress} className="w-3/4" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        ) : preview ? (
          <div className="relative group w-full max-w-xs mx-auto">
            <Image
              src={preview}
              alt="Selected image" 
              width={maxDimension}
              height={maxDimension * (9/16)} 
              className="rounded-md object-contain max-h-48"
              data-ai-hint="uploaded image preview"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
              aria-label="Remove image" 
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1">
            <UploadCloud className="h-10 w-10 text-muted-foreground/70" />
            <p className="text-sm font-medium text-foreground">Drag & drop your image here</p> 
            <p className="text-xs text-muted-foreground">or click to select</p> 
            <p className="text-xs text-muted-foreground mt-1">(Max {maxSizeMB}MB, JPEG/PNG/WEBP/GIF)</p>
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center text-destructive text-sm mt-1">
          <AlertTriangle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
