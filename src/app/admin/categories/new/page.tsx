"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm, type CategoryFormValues } from '../components/category-form';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Category } from '@/types';
// In a real app, you'd import a function to save to your backend
// import { createCategory } from '@/lib/api/categories'; 

export default function NewCategoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCategory: Category = {
        id: uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log("New category created (mock):", newCategory);
      // In a real app, you would call: await createCategory(data);

      toast({
        title: "Category Created",
        description: `Category "${data.name}" has been successfully created.`,
      });
      router.push('/admin/categories');
    } catch (error) {
      console.error("Failed to create category:", error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
    // setIsSubmitting(false) is not needed if navigation occurs
  };

  return (
    <>
      <PageHeader
        title="Create New Category"
        description="Define a new content structure for your entries."
      />
      <CategoryForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </>
  );
}
