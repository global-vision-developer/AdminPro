
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { BannerForm } from '../../components/banner-form';
import { useToast } from '@/hooks/use-toast';
import type { Banner } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getBanner } from '@/lib/actions/bannerActions';

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const bannerId = params.id as string;
  
  const { toast } = useToast();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (bannerId) {
      setIsLoading(true);
      getBanner(bannerId)
        .then(fetchedBanner => {
          if (fetchedBanner) {
            setBanner(fetchedBanner);
          } else {
            toast({ title: "Алдаа", description: "Баннер олдсонгүй.", variant: "destructive" });
            router.push('/admin/banners');
          }
        })
        .catch(err => {
          console.error("Failed to fetch banner:", err);
          toast({ title: "Алдаа", description: "Баннерын мэдээллийг ачааллахад алдаа гарлаа.", variant: "destructive" });
          router.push('/admin/banners');
        })
        .finally(() => setIsLoading(false));
    }
  }, [bannerId, router, toast]);

  const handleFormSuccess = () => {
    router.push('/admin/banners');
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Баннер Засварлах" />
        <div className="space-y-4 p-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4 float-right mt-4" />
        </div>
      </>
    );
  }

  if (!banner) {
    return <PageHeader title="Баннер олдсонгүй" description="Энэ баннер ачаалагдах боломжгүй эсвэл байхгүй байна." />;
  }

  return (
    <>
      <PageHeader
        title={`Баннер засварлах: ${banner.description.substring(0,30)}...`}
        description="Баннерын зураг, тайлбар, линк болон статусыг өөрчлөх."
      />
      <BannerForm initialData={banner} onFormSubmitSuccess={handleFormSuccess} />
    </>
  );
}
