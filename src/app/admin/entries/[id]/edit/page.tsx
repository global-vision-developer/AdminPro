
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import type { Category, Entry } from '@/types';
import { UserRole } from '@/types'; // Import UserRole
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { getCategories } from '@/lib/actions/categoryActions';
import { getEntry } from '@/lib/actions/entryActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';


export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current user
  const [entry, setEntry] = useState<Entry | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (entryId && currentUser) { // Ensure currentUser is available
        setIsLoading(true);
        setAccessDenied(false);
        try {
          const [fetchedEntry, fetchedCategories] = await Promise.all([
            getEntry(entryId),
            getCategories() // Fetch all categories for context
          ]);
          
          if (fetchedEntry) {
            // Access check for SubAdmin
            if (currentUser.role === UserRole.SUB_ADMIN) {
              if (!currentUser.allowedCategoryIds || !currentUser.allowedCategoryIds.includes(fetchedEntry.categoryId)) {
                setAccessDenied(true);
                setEntry(null);
                setCategories([]);
                toast({ title: "Access Denied", description: "You do not have permission to edit this entry.", variant: "destructive" });
                setIsLoading(false);
                return;
              }
            }
            setEntry(fetchedEntry);
            setCategories(fetchedCategories); // Set all categories for the form
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
      } else if (!currentUser && !isLoading) { // If currentUser is still null after initial load attempt
         setIsLoading(false); // Stop loading, AuthProvider might redirect
      }
    }
    loadData();
  }, [entryId, router, toast, currentUser, isLoading]); // Added isLoading to dependencies to prevent re-runs while loading

  const selectedCategory = useMemo(() => {
    if (!entry || categories.length === 0) return undefined;
    const category = categories.find(cat => cat.id === entry.categoryId);
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
  
  if (!currentUser && !isLoading) {
    return (
        <div className="p-4">
            <p>Authenticating user...</p> {/* Or a more specific loading/redirecting message */}
        </div>
    );
  }

  if (accessDenied) {
    return (
        <>
         <PageHeader title="Access Denied" />
         <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Permission Error</AlertTitle>
            <AlertDescription>
              You do not have permission to edit entries in this category. 
              Please contact a Super Admin if you believe this is an error.
            </AlertDescription>
         </Alert>
         <Button onClick={() => router.push('/admin/entries')} variant="outline" className="mt-4">Back to Entries</Button>
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
        key={entry.categoryId} 
        initialData={entry} 
        categories={categories} // Pass all categories for EntryForm context
        selectedCategory={selectedCategory}
        onSubmitSuccess={handleEntryFormSuccess} 
      />
    </>
  );
}
