
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import type { Category, Entry } from '@/types';
import { getCategories } from '@/lib/actions/categoryActions';
import { getEntry } from '@/lib/actions/entryActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button'; // Added Button import


export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  
  const { toast } = useToast();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (entryId) {
        setIsLoading(true);
        try {
          const [fetchedEntry, fetchedCategories] = await Promise.all([
            getEntry(entryId),
            getCategories()
          ]);
          
          if (fetchedEntry) {
            setEntry(fetchedEntry);
            setCategories(fetchedCategories);
          } else {
            toast({ title: "Error", description: "Entry not found.", variant: "destructive" });
            router.push('/admin/entries');
          }
        } catch (error) {
          console.error("Failed to load entry or categories:", error);
          toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
          router.push('/admin/entries');
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadData();
  }, [entryId, router, toast]);

  const selectedCategory = useMemo(() => {
    if (!entry || categories.length === 0) return undefined;
    const category = categories.find(cat => cat.id === entry.categoryId);
    // Ensure the found category has a name to be considered valid
    return category && category.name ? category : undefined;
  }, [entry, categories]);

  const handleEntryFormSuccess = () => {
    if (entry) {
      router.push(`/admin/entries?category=${entry.categoryId}`);
    } else {
      router.push('/admin/entries');
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit Entry" />
         <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-full sm:w-1/3 mb-4" />
          <Skeleton className="h-10 w-full" /> 
          <Skeleton className="h-20 w-full" /> 
          <Skeleton className="h-20 w-full" /> 
          <Skeleton className="h-10 w-1/4 mt-4 float-right" /> 
        </div>
      </>
    );
  }

  if (!entry || !selectedCategory) {
    return (
        <>
         <PageHeader title="Error Loading Entry" description="The entry or its category could not be loaded." />
         <Button onClick={() => router.push('/admin/entries')} variant="outline">Back to Entries</Button>
        </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit Entry: ${entry.title || 'Untitled'}`}
        description={`Modifying content for category: ${selectedCategory.name}`}
      />
      <EntryForm 
        key={entry.categoryId} // Use categoryId to ensure form re-initializes if category definition context changes
        initialData={entry} 
        categories={categories} 
        selectedCategory={selectedCategory}
        onSubmitSuccess={handleEntryFormSuccess} 
      />
    </>
  );
}
