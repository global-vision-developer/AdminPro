
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import type { Category, City } from '@/types'; // Added City
import { UserRole } from '@/types'; 
import { useAuth } from '@/hooks/use-auth'; 
import { getCategories } from '@/lib/actions/categoryActions';
import { getCities } from '@/lib/actions/cityActions'; // Added
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; 


export default function NewEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser } = useAuth(); 
  
  const [allCategories, setAllCategories] = useState<Category[]>([]); 
  const [allCities, setAllCities] = useState<City[]>([]); // Added state for cities
  const [selectableCategories, setSelectableCategories] = useState<Category[]>([]); 
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [fetchedCategories, fetchedCities] = await Promise.all([
          getCategories(),
          getCities() // Fetch cities
        ]);
        setAllCategories(fetchedCategories);
        setAllCities(fetchedCities); // Set cities state

        let filteredForSubAdmin: Category[] = fetchedCategories;
        if (currentUser && currentUser.role === UserRole.SUB_ADMIN) {
          if (currentUser.allowedCategoryIds && currentUser.allowedCategoryIds.length > 0) {
            filteredForSubAdmin = fetchedCategories.filter(cat => currentUser.allowedCategoryIds!.includes(cat.id));
          } else {
            filteredForSubAdmin = []; 
          }
        }
        setSelectableCategories(filteredForSubAdmin);

        const categoryIdFromUrl = searchParams.get('category');
        if (categoryIdFromUrl && filteredForSubAdmin.some(c => c.id === categoryIdFromUrl)) {
          setSelectedCategoryId(categoryIdFromUrl);
        } else if (filteredForSubAdmin.length > 0) {
          const firstValidCategory = filteredForSubAdmin.find(cat => cat.name);
          setSelectedCategoryId(firstValidCategory ? firstValidCategory.id : undefined);
        } else {
          setSelectedCategoryId(undefined); 
        }

      } catch (error) {
        console.error("Failed to load categories or cities:", error);
        toast({ title: "Error", description: "Failed to load categories or cities.", variant: "destructive" });
        setAllCategories([]);
        setAllCities([]); // Reset cities on error
        setSelectableCategories([]);
        setSelectedCategoryId(undefined);
      } finally {
        setIsLoading(false);
      }
    }
    if (currentUser) { 
        loadData();
    } else {
        setIsLoading(false); 
    }
  }, [searchParams, toast, currentUser]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return undefined;
    const category = allCategories.find(cat => cat.id === selectedCategoryId); 
    return category && category.name ? category : undefined;
  }, [allCategories, selectedCategoryId]);

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
        <PageHeader title="Шинэ Бүртгэл Үүсгэх" /> 
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

  if (!currentUser) { 
    return (
        <div className="p-4">
            <p>Verifying user authentication...</p> 
        </div>
    );
  }
  
  if (allCategories.length === 0) { 
    return (
      <>
        <PageHeader title="Шинэ Бүртгэл Үүсгэх" /> 
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
             <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Categories Available</h3>
            <p className="text-muted-foreground mb-4">
              To add an entry, a category must be created first. This action can only be performed by a Super Admin.
            </p>
            {currentUser.role === UserRole.SUPER_ADMIN && (
                <Button asChild>
                <Link href="/admin/categories/new">Create Category</Link>
                </Button>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  if (currentUser.role === UserRole.SUB_ADMIN && selectableCategories.length === 0) {
    return (
      <>
        <PageHeader title="Шинэ Бүртгэл Үүсгэх" /> 
        <Alert variant="default" className="mt-6 border-primary/50">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">No Assigned Categories</AlertTitle>
            <AlertDescription>
                You are currently not assigned any categories to manage entries. 
                Please contact a Super Admin to assign categories to your account.
            </AlertDescription>
        </Alert>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title="Шинэ Бүртгэл Үүсгэх" 
        description={selectedCategory ? `Категори: ${selectedCategory.name}` : "Эхлэхийн тулд категори сонгоно уу."}
      />
      
      <div className="mb-6 max-w-md"> 
        <label htmlFor="category-select" className="block text-sm font-medium text-foreground mb-1">
          Сонгогдсон категори <span className="text-destructive">*</span>
        </label>
        <Select value={selectedCategoryId || ""} onValueChange={handleCategoryChange} required>
          <SelectTrigger id="category-select" className="w-full">
            <SelectValue placeholder="Категори сонгоно уу..." />
          </SelectTrigger>
          <SelectContent>
            {selectableCategories.map(cat => (
              cat.name && (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              )
            ))}
          </SelectContent>
        </Select>
        {!selectedCategoryId && selectableCategories.length > 0 && (
             <p className="text-sm text-destructive mt-1">Категори сонгоно уу.</p> 
        )}
      </div>

      {selectedCategory && selectedCategory.name ? ( 
        <EntryForm 
          key={selectedCategory.id} 
          categories={allCategories} 
          selectedCategory={selectedCategory}
          cities={allCities} // Pass cities to EntryForm
          onSubmitSuccess={handleEntryFormSuccess}
        />
      ) : (
        selectableCategories.length > 0 && ( 
            <Card className="mt-6">
            <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Бүртгэл үүсгэж эхлэхийн тулд дээрээс хүчинтэй категори сонгоно уу.</p> 
            </CardContent>
            </Card>
        )
      )}
    </>
  );
}
