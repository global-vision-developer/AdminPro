"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm, type CategoryFormValues } from '../../components/category-form';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/types';
import { mockCategories } from '@/lib/mock-data'; // Using mock data
import { Skeleton } from '@/components/ui/skeleton';

// In a real app:
// import { getCategory, updateCategory } from '@/lib/api/categories';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  
  const { toast } = useToast();
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categoryId) {
      setIsLoading(true);
      // Simulate fetching category data
      const fetchedCategory = mockCategories.find(cat => cat.id === categoryId);
      setTimeout(() => { // Simulate network delay
        if (fetchedCategory) {
          setCategory(fetchedCategory);
        } else {
          toast({ title: "Error", description: "Category not found.", variant: "destructive" });
          router.push('/admin/categories');
        }
        setIsLoading(false);
      }, 500);
    }
  }, [categoryId, router, toast]);

  const handleSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    if (!category) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedCategory: Category = {
        ...category,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      console.log("Category updated (mock):", updatedCategory);
      // In a real app: await updateCategory(categoryId, data);

      toast({
        title: "Category Updated",
        description: `Category "${data.name}" has been successfully updated.`,
      });
      router.push('/admin/categories');
    } catch (error) {
      console.error("Failed to update category:", error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit Category" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    );
  }

  if (!category) {
    return <PageHeader title="Category Not Found" />; // Or a more specific error component
  }

  return (
    <>
      <PageHeader
        title={`Edit Category: ${category.name}`}
        description="Modify the structure and details of this category."
      />
      <CategoryForm initialData={category} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </>
  );
}
