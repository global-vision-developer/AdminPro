
"use client"; // Keep client for form interactions and useEffect

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm, type CategoryFormValues } from '../../components/category-form';
// import { useToast } from '@/hooks/use-toast'; // Toast is handled within CategoryForm
import type { Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategory, updateCategory } from '@/lib/actions/categoryActions';
import { Card, CardHeader, CardContent } from '@/components/ui/card'; // Added import

export default function EditCategoryPage() {
  const router = useRouter();
  const rawParams = useParams();
  const params = { ...rawParams }; // Ensure params is a plain object by spreading
  const categoryId = params.id as string;
  
  // const { toast } = useToast(); // Handled by CategoryForm
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categoryId) {
      setIsLoading(true);
      getCategory(categoryId)
        .then(fetchedCategory => {
          if (fetchedCategory) {
            setCategory(fetchedCategory);
          } else {
            // toast({ title: "Error", description: "Category not found.", variant: "destructive" });
            alert("Category not found. Returning to list..."); // Simple alert for now
            router.push('/admin/categories');
          }
        })
        .catch(err => {
          console.error("Failed to fetch category:", err);
          // toast({ title: "Error", description: "Failed to load category data.", variant: "destructive" });
          alert("Failed to load category data. Returning to list...");
          router.push('/admin/categories');
        })
        .finally(() => setIsLoading(false));
    }
  }, [categoryId, router]);

  const handleSubmit = async (data: CategoryFormValues) => {
    if (!category) return { error: "Category data not loaded." };
    setIsSubmitting(true);
    // Only pass fields that can be updated, id is from URL param.
    // Timestamps are handled by the server action.
    const { name, slug, description, fields } = data;
    const result = await updateCategory(categoryId, { name, slug, description, fields });
    setIsSubmitting(false);

    if (result && result.success) {
      // Success toast is handled by CategoryForm or action.
      router.push('/admin/categories');
      return { success: true };
    } else if (result && result.error) {
      // Error toast is handled by CategoryForm or action.
      return { error: result.error };
    }
    return {};
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit Category" />
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

  if (!category) {
    return <PageHeader title="Category Not Found" description="This category could not be loaded or does not exist." />;
  }

  return (
    <>
      <PageHeader
        title={`Edit Category: ${category.name}`}
        description="Modify the structure and details of this category."
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

    