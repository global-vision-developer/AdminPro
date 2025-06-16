
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/types';
import { getCategories } from '@/lib/actions/categoryActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';


export default function NewEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);

        const categoryIdFromUrl = searchParams.get('category');
        if (categoryIdFromUrl && fetchedCategories.some(c => c.id === categoryIdFromUrl)) {
          setSelectedCategoryId(categoryIdFromUrl);
        } else if (fetchedCategories.length > 0) {
          setSelectedCategoryId(fetchedCategories[0].id);
        } else {
          setSelectedCategoryId(undefined); 
        }

      } catch (error) {
        console.error("Failed to load categories:", error);
        toast({ title: "Error", description: "Could not load categories.", variant: "destructive" });
        setCategories([]);
        setSelectedCategoryId(undefined);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [searchParams, toast]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return undefined;
    const category = categories.find(cat => cat.id === selectedCategoryId);
    // Ensure the found category has a name, otherwise treat as invalid
    return category && category.name ? category : undefined;
  }, [categories, selectedCategoryId]);

  const handleCategoryChange = (newCategoryId: string) => {
    setSelectedCategoryId(newCategoryId);
    const currentParams = new URLSearchParams(window.location.search);
    if (newCategoryId) {
      currentParams.set('category', newCategoryId);
    } else {
      currentParams.delete('category');
    }
    router.replace(`${window.location.pathname}?${currentParams.toString()}`);
  };
  
  const handleEntryFormSuccess = () => {
    if (selectedCategory) {
      router.push(`/admin/entries?category=${selectedCategory.id}`);
    } else {
      router.push('/admin/entries');
    }
  };


  if (isLoading) {
    return (
      <>
        <PageHeader title="Create New Entry" />
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-full sm:w-1/3 mb-4" /> {/* For Category Selector */}
          <Skeleton className="h-10 w-full" /> {/* For Entry Title */}
          <Skeleton className="h-20 w-full" /> {/* For a field */}
          <Skeleton className="h-20 w-full" /> {/* For another field */}
          <Skeleton className="h-10 w-1/4 mt-4 float-right" /> {/* For Submit Button */}
        </div>
      </>
    );
  }

  if (categories.length === 0) {
    return (
      <>
        <PageHeader title="Create New Entry" />
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
             <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Categories Available</h3>
            <p className="text-muted-foreground mb-4">
              You must create a category before you can add an entry.
            </p>
            <Button asChild>
              <Link href="/admin/categories/new">Create a Category</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Create New Entry"
        description={selectedCategory ? `For category: ${selectedCategory.name}` : "Select a category to begin."}
      />
      
      <div className="mb-6 max-w-md"> {/* Adjusted max-width */}
        <label htmlFor="category-select" className="block text-sm font-medium text-foreground mb-1">
          Selected Category <span className="text-destructive">*</span>
        </label>
        <Select value={selectedCategoryId || ""} onValueChange={handleCategoryChange} required>
          <SelectTrigger id="category-select" className="w-full">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              // Ensure category has a name before rendering it as an option
              cat.name && (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              )
            ))}
          </SelectContent>
        </Select>
        {!selectedCategoryId && categories.length > 0 && (
             <p className="text-sm text-destructive mt-1">Please select a category.</p>
        )}
      </div>

      {selectedCategory && selectedCategory.name ? ( // Double check selectedCategory and its name
        <EntryForm 
          categories={categories} 
          selectedCategory={selectedCategory}
          onSubmitSuccess={handleEntryFormSuccess}
        />
      ) : (
        categories.length > 0 && ( // Only show this if categories exist but none is selected properly
            <Card className="mt-6">
            <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Please select a valid category above to start creating an entry.</p>
            </CardContent>
            </Card>
        )
      )}
    </>
  );
}

