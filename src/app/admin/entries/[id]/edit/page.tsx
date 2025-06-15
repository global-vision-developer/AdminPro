"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import type { Category, Entry } from '@/types';
import { mockCategories, mockEntries } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  
  const { toast } = useToast();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entryId) {
      setIsLoading(true);
      // Simulate fetching data
      const fetchedEntry = mockEntries.find(e => e.id === entryId);
      const fetchedCategories = mockCategories;
      
      setTimeout(() => { // Simulate network delay
        if (fetchedEntry) {
          setEntry(fetchedEntry);
          setCategories(fetchedCategories);
        } else {
          toast({ title: "Error", description: "Entry not found.", variant: "destructive" });
          router.push('/admin/entries');
        }
        setIsLoading(false);
      }, 500);
    }
  }, [entryId, router, toast]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    if (!entry) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const updatedEntry: Entry = {
        ...entry,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      console.log("Entry updated (mock):", updatedEntry);

      toast({
        title: "Entry Updated",
        description: `Entry "${updatedEntry.title || 'Untitled'}" has been successfully updated.`,
      });
      router.push('/admin/entries');
    } catch (error) {
      console.error("Failed to update entry:", error);
      toast({
        title: "Error",
        description: "Failed to update entry. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit Entry" />
         <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-1/4 float-right" />
        </div>
      </>
    );
  }

  if (!entry) {
    return <PageHeader title="Entry Not Found" />;
  }

  return (
    <>
      <PageHeader
        title={`Edit Entry: ${entry.title || entry.data?.title || entry.data?.productName || 'Untitled'}`}
        description="Modify the details of this content entry."
      />
      <EntryForm initialData={entry} categories={categories} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </>
  );
}
