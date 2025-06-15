"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Category, Entry } from '@/types';
import { mockCategories } from '@/lib/mock-data'; // Using mock data
import { Skeleton } from '@/components/ui/skeleton';

export default function NewEntryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    // Simulate fetching categories
    setTimeout(() => {
      setCategories(mockCategories);
      setIsLoadingCategories(false);
    }, 500);
  }, []);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const newEntry: Entry = {
        id: uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log("New entry created (mock):", newEntry);

      toast({
        title: "Entry Created",
        description: `Entry "${newEntry.title || 'Untitled'}" has been successfully created.`,
      });
      router.push('/admin/entries');
    } catch (error) {
      console.error("Failed to create entry:", error);
      toast({
        title: "Error",
        description: "Failed to create entry. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isLoadingCategories) {
    return (
      <>
        <PageHeader title="Create New Entry" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-1/4 float-right" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Create New Entry"
        description="Fill in the details for your new content entry."
      />
      {categories.length > 0 ? (
        <EntryForm categories={categories} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      ) : (
        <p className="text-muted-foreground">No categories available. Please create a category first.</p>
      )}
    </>
  );
}
