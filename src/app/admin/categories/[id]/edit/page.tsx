
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm, type CategoryFormValues } from '../../components/category-form';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategory, updateCategory } from '@/lib/actions/categoryActions';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';

export default function EditCategoryPage() {
  const router = useRouter();
  const rawParams = useParams();
  const params = { ...rawParams };
  const categoryId = params.id as string;
  
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
      toast({
        title: "Хандалт хориглогдсон",
        description: "Зөвхөн Сүпер Админ категори засах боломжтой.",
        variant: "destructive"
      });
      router.push('/admin/dashboard');
    }
  }, [currentUser, authLoading, router, toast]);

  useEffect(() => {
    if (authLoading || (currentUser && currentUser.role !== UserRole.SUPER_ADMIN)) {
        setIsLoading(false);
        return;
    }

    if (categoryId) {
      setIsLoading(true);
      getCategory(categoryId)
        .then(fetchedCategory => {
          if (fetchedCategory) {
            setCategory(fetchedCategory);
          } else {
            toast({ title: "Алдаа", description: "Категори олдсонгүй.", variant: "destructive" });
            router.push('/admin/categories');
          }
        })
        .catch(err => {
          console.error("Failed to fetch category:", err);
          toast({ title: "Алдаа", description: "Категорийн мэдээллийг ачааллахад алдаа гарлаа.", variant: "destructive" });
          router.push('/admin/categories');
        })
        .finally(() => setIsLoading(false));
    }
  }, [categoryId, router, toast, currentUser, authLoading]);

  const handleSubmit = async (data: CategoryFormValues) => {
    if (!category) return { error: "Category data not loaded." };
    if (currentUser?.role !== UserRole.SUPER_ADMIN) {
        toast({ title: "Хандалт хориглогдсон", description: "Үйлдэл хийх эрхгүй байна.", variant: "destructive"});
        return { error: "Permission denied." };
    }
    
    setIsSubmitting(true);
    const { name, slug, description, fields, coverImageUrl } = data;
    const result = await updateCategory(categoryId, { name, slug, description, fields, coverImageUrl });
    setIsSubmitting(false);

    if (result && result.success) {
      router.push('/admin/categories');
      return { success: true };
    } else if (result && result.error) {
      return { error: result.error };
    }
    return {};
  };

  if (authLoading || isLoading) {
    return (
      <>
        <PageHeader title="Категори засварлах" />
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Card>
            <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-10 w-1/4 float-right" />
        </div>
      </>
    );
  }
  
  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
      return (
        <>
            <PageHeader title="Хандалт хориглогдсон" />
            <p className="p-4">Та энэ хуудсыг үзэх эрхгүй.</p>
        </>
      );
  }

  if (!category) {
    return <PageHeader title="Категори олдсонгүй" description="Энэ категори ачаалагдах боломжгүй эсвэл байхгүй байна." />;
  }

  return (
    <>
      <PageHeader
        title={`Категори засварлах: ${category.name}`}
        description="Категорийн бүтэц болон дэлгэрэнгүй мэдээллийг өөрчлөх."
      />
      <CategoryForm 
        initialData={category} 
        onSubmit={handleSubmit} 
        isSubmittingGlobal={isSubmitting}
        onFormSuccess={() => router.push('/admin/categories')}
      />
    </>
  );
}
