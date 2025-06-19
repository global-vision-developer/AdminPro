
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CityForm } from '../../components/city-form';
import { useToast } from '@/hooks/use-toast';
import type { City } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getCity } from '@/lib/actions/cityActions';

export default function EditCityPage() {
  const router = useRouter();
  const params = useParams();
  const cityId = params.id as string;
  
  const { toast } = useToast();
  const [city, setCity] = useState<City | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cityId) {
      setIsLoading(true);
      getCity(cityId)
        .then(fetchedCity => {
          if (fetchedCity) {
            setCity(fetchedCity);
          } else {
            toast({ title: "Алдаа", description: "Хот олдсонгүй.", variant: "destructive" });
            router.push('/admin/cities');
          }
        })
        .catch(err => {
          console.error("Failed to fetch city:", err);
          toast({ title: "Алдаа", description: "Хотын мэдээллийг ачааллахад алдаа гарлаа.", variant: "destructive" });
          router.push('/admin/cities');
        })
        .finally(() => setIsLoading(false));
    }
  }, [cityId, router, toast]);

  const handleFormSuccess = () => {
    router.push('/admin/cities');
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Хот Засварлах" />
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-10 w-1/4 float-right mt-4" />
        </div>
      </>
    );
  }

  if (!city) {
    return <PageHeader title="Хот олдсонгүй" description="Энэ хот ачаалагдах боломжгүй эсвэл байхгүй байна." />;
  }

  return (
    <>
      <PageHeader
        title={`Хот засварлах: ${city.name}`}
        description="Хотын монгол, хятад нэр болон эрэмбийг өөрчлөх."
      />
      <CityForm initialData={city} onFormSubmitSuccess={handleFormSuccess} />
    </>
  );
}
