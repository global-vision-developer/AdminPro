
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/types';
import { UserRole } from '@/types'; // Import UserRole
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { getCategories } from '@/lib/actions/categoryActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react'; // Import Info
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components


export default function NewEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current user
  
  const [allCategories, setAllCategories] = useState<Category[]>([]); // Store all categories
  const [selectableCategories, setSelectableCategories] = useState<Category[]>([]); // Categories user can select
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const fetchedCategories = await getCategories();
        setAllCategories(fetchedCategories);

        let filteredForSubAdmin: Category[] = fetchedCategories;
        if (currentUser && currentUser.role === UserRole.SUB_ADMIN) {
          if (currentUser.allowedCategoryIds && currentUser.allowedCategoryIds.length > 0) {
            filteredForSubAdmin = fetchedCategories.filter(cat => currentUser.allowedCategoryIds!.includes(cat.id));
          } else {
            filteredForSubAdmin = []; // SubAdmin has no assigned categories
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
        console.error("Failed to load categories:", error);
        toast({ title: "Алдаа", description: "Ангилалуудыг ачааллахад алдаа гарлаа.", variant: "destructive" });
        setAllCategories([]);
        setSelectableCategories([]);
        setSelectedCategoryId(undefined);
      } finally {
        setIsLoading(false);
      }
    }
    if (currentUser) { // Only load data if currentUser is available
        loadData();
    } else {
        setIsLoading(false); // If no currentUser yet, stop loading, AuthProvider will redirect or update
    }
  }, [searchParams, toast, currentUser]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return undefined;
    // Find from allCategories to get full category details, even if it's not selectable for a SubAdmin (for display purposes if pre-selected via URL)
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
        <PageHeader title="Шинэ Бичлэг Үүсгэх" />
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

  if (!currentUser) { // If currentUser is still null after loading (e.g. redirecting)
    return (
        <div className="p-4">
            <p>Хэрэглэгчийн нэвтрэлтийг шалгаж байна...</p>
        </div>
    );
  }
  
  if (allCategories.length === 0) { // No categories exist in the system at all
    return (
      <>
        <PageHeader title="Шинэ Бичлэг Үүсгэх" />
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
             <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ангилал Байхгүй</h3>
            <p className="text-muted-foreground mb-4">
              Бичлэг нэмэхийн тулд эхлээд ангилал үүсгэх шаардлагатай. Энэ үйлдлийг зөвхөн Супер Админ хийх боломжтой.
            </p>
            {currentUser.role === UserRole.SUPER_ADMIN && (
                <Button asChild>
                <Link href="/admin/categories/new">Ангилал Үүсгэх</Link>
                </Button>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  // Sub Admin has no assigned categories
  if (currentUser.role === UserRole.SUB_ADMIN && selectableCategories.length === 0) {
    return (
      <>
        <PageHeader title="Шинэ Бичлэг Үүсгэх" />
        <Alert variant="default" className="mt-6 border-primary/50">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">Оноогдсон Ангилал Байхгүй</AlertTitle>
            <AlertDescription>
                Танд одоогоор бичлэг удирдах ангилал оноогоогүй байна. 
                Супер Админтай холбогдож дансандаа ангилал оноолгоно уу.
            </AlertDescription>
        </Alert>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title="Шинэ Бичлэг Үүсгэх"
        description={selectedCategory ? `Ангилал: ${selectedCategory.name}` : "Эхлэхийн тулд ангилал сонгоно уу."}
      />
      
      <div className="mb-6 max-w-md"> 
        <label htmlFor="category-select" className="block text-sm font-medium text-foreground mb-1">
          Сонгосон Ангилал <span className="text-destructive">*</span>
        </label>
        <Select value={selectedCategoryId || ""} onValueChange={handleCategoryChange} required>
          <SelectTrigger id="category-select" className="w-full">
            <SelectValue placeholder="Ангилал сонгоно уу..." />
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
             <p className="text-sm text-destructive mt-1">Ангилал сонгоно уу.</p>
        )}
      </div>

      {selectedCategory && selectedCategory.name ? ( 
        <EntryForm 
          key={selectedCategory.id} 
          categories={allCategories} // Pass all for form logic, but selection was based on selectable
          selectedCategory={selectedCategory}
          onSubmitSuccess={handleEntryFormSuccess}
        />
      ) : (
        selectableCategories.length > 0 && ( 
            <Card className="mt-6">
            <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Бичлэг үүсгэж эхлэхийн тулд дээрээс хүчинтэй ангилал сонгоно уу.</p>
            </CardContent>
            </Card>
        )
      )}
    </>
  );
}
