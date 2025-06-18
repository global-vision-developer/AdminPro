
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
    if (!entryId) {
      toast({ title: "Алдаа", description: "Бүртгэлийн ID дутуу байна.", variant: "destructive" });
      router.push('/admin/entries');
      setIsLoading(false); 
      return;
    }

    if (!currentUser) {
      setIsLoading(false); 
      return;
    }

    async function loadData() {
      setIsLoading(true); 
      setAccessDenied(false);
      try {
        const [fetchedEntry, fetchedCategories] = await Promise.all([
          getEntry(entryId), 
          getCategories() 
        ]);

        if (fetchedEntry) {
          if (currentUser?.role === UserRole.SUB_ADMIN) {
            if (!currentUser.allowedCategoryIds || !currentUser.allowedCategoryIds.includes(fetchedEntry.categoryId)) {
              setAccessDenied(true);
              setEntry(null);
              setCategories([]);
              toast({ title: "Хандалт хориглогдсон", description: "Та энэ бүртгэлийг засах эрхгүй байна.", variant: "destructive" });
              setIsLoading(false); 
              return;
            }
          }
          setEntry(fetchedEntry);
          setCategories(fetchedCategories);
        } else {
          toast({ title: "Алдаа", description: "Бүртгэл олдсонгүй.", variant: "destructive" });
          router.push('/admin/entries');
        }
      } catch (error) {
        console.error("Failed to load entry or categories:", error);
        toast({ title: "Алдаа", description: "Засварлах мэдээллийг ачааллахад алдаа гарлаа.", variant: "destructive" });
      } finally {
        setIsLoading(false); 
      }
    }

    loadData();

  }, [entryId, currentUser, router, toast]); 

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
        <PageHeader title="Бүртгэл засварлах" /> 
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
            <PageHeader title="Бүртгэл засварлах" /> 
            <p className="mt-4">Хэрэглэгчийн нэвтрэлт эсвэл зөвшөөрлийг шалгаж байна...</p>  
        </div>
    );
  }

  if (accessDenied) {
    return (
        <>
         <PageHeader title="Хандалт хориглогдсон" /> 
         <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Зөвшөөрлийн алдаа</AlertTitle> 
            <AlertDescription>
              Та энэ категорийн бүртгэлийг засах эрхгүй байна.
              Хэрэв энэ нь алдаа гэж үзэж байвал Сүпер админтай холбогдоно уу.
            </AlertDescription>
         </Alert>
         <Button onClick={() => router.push('/admin/entries')} variant="outline" className="mt-4">Бүртгэл рүү буцах</Button> 
        </>
    );
  }


  if (!entry || !selectedCategory) {
    return (
        <>
         <PageHeader title="Бүртгэл ачаалахад алдаа гарлаа" description="Бүртгэл эсвэл түүний категори ачаалагдах боломжгүй байна." /> 
         <p className="mt-4 p-4">
            Бүртгэл байгаа эсэх, мөн танд категори руу хандах эрх байгаа эсэхийг шалгана уу.
            Хэрэв асуудал хэвээр байвал, дахин ачааллах эсвэл дэлгэрэнгүй мэдээллийг консолоос шалгана уу.
         </p>
         <Button onClick={() => router.push('/admin/entries')} variant="outline" className="ml-4">Бүртгэл рүү буцах</Button> 
        </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Бүртгэл засварлах: ${entry.title || 'Гарчиггүй'}`} 
        description={`категори контент засварлах: ${selectedCategory.name}`}
      />
      <EntryForm
        key={entry.categoryId}
        initialData={entry}
        categories={categories} 
        selectedCategory={selectedCategory}
        onSubmitSuccess={handleEntryFormSuccess}
      />
    </>
  );
}

