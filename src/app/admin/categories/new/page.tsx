
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm, type CategoryFormValues } from '../components/category-form';
// import { useToast } from '@/hooks/use-toast'; // Toast is handled within CategoryForm after submit
import { addCategory } from '@/lib/actions/categoryActions';

export default function NewCategoryPage() {
  const router = useRouter();
  // const { toast } = useToast(); // Handled by CategoryForm or the action itself
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    const result = await addCategory(data);
    setIsSubmitting(false);

    if (result && "id" in result && result.id) {
      // Success toast is handled by CategoryForm or not needed if redirecting immediately
      // Toast is now handled in CategoryForm for consistency or by action.
      router.push('/admin/categories'); // Redirect after successful creation
      return { id: result.id }; // Propagate success for form reset or other logic
    } else if (result && "error" in result && result.error) {
      // Error toast is handled by CategoryForm or action.
      return { error: result.error }; // Propagate error
    }
     // Default return or handle cases where result is void
    return {};
  };

  return (
    <>
      <PageHeader
        title="Create New Category"
        description="Define a new content structure for your entries."
      />
      <CategoryForm 
        onSubmit={handleSubmit} 
        isSubmittingGlobal={isSubmitting} 
        onFormSuccess={() => router.push('/admin/categories')}
      />
    </>
  );
}
