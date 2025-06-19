"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BannerImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  dataAiHint?: string;
}

export function BannerImage({ src, alt, width, height, className, dataAiHint }: BannerImageProps) {
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!src || error) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-muted rounded border text-xs text-muted-foreground", className)}
        style={{ width: `${width}px`, height: `${height}px` }}
        data-ai-hint={dataAiHint || "placeholder image"}
      >
        {error ? 'Зураг алдаатай' : 'Зураггүй'}
      </div>
    );
  }

  return (
    <Image
      data-ai-hint={dataAiHint}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(className, !imageLoaded && "bg-muted")}
      onError={() => setError(true)}
      onLoad={() => setImageLoaded(true)}
      priority={false} 
    />
  );
}
