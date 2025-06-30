
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm, type CategoryFormValues } from '../components/category-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { addCategory } from '@/lib/actions/categoryActions';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewCategoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
      toast({
        title: "Хандалт хориглогдсон",
        description: "Зөвхөн Сүпер Админ шинэ категори үүсгэх боломжтой.",
        variant: "destructive",
      });
      router.push('/admin/dashboard');
    }
  }, [currentUser, authLoading, router, toast]);

  const handleSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    if (currentUser?.role !== UserRole.SUPER_ADMIN) {
        toast({ title: "Хандалт хориглогдсон", description: "Үйлдэл хийх эрхгүй байна.", variant: "destructive"});
        setIsSubmitting(false);
        return { error: "Permission denied." };
    }
    const result = await addCategory(data);
    setIsSubmitting(false);

    if (result && "id" in result && result.id) {
      router.push('/admin/categories');
      return { id: result.id };
    } else if (result && "error" in result && result.error) {
      return { error: result.error };
    }
    return {};
  };

  if (authLoading || !currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <>
        <PageHeader title="Шинэ Категори Үүсгэх" />
        <div className="space-y-4 p-4">
          <p>Хандалтыг шалгаж байна...</p>
          <Skeleton className="h-10 w-full sm:w-1/3 mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Шинэ Категори Үүсгэх"
        description="Шинэ контентын бүтэц зохиож, бүртгэлд ашиглах"
      />
      <CategoryForm 
        onSubmit={handleSubmit} 
        isSubmittingGlobal={isSubmitting} 
        onFormSuccess={() => router.push('/admin/categories')}
      />
    </>
  );
}
