
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { EntryForm } from '../components/entry-form';
import { useToast } from '@/hooks/use-toast';
import type { Category, City, Anket, Entry } from '@/types';
import { UserRole } from '@/types'; 
import { useAuth } from '@/hooks/use-auth'; 
import { getCategories } from '@/lib/actions/categoryActions';
import { getCities } from '@/lib/actions/cityActions';
import { getAnket } from '@/lib/actions/anketActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Loader2 } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; 

const TARGET_TRANSLATOR_CATEGORY_SLUG = "orchluulagchid";

function mapAnketToEntryData(anket: Anket, category: Category): Record<string, any> {
    const entryData: Record<string, any> = {};

    const keyMap: Record<string, keyof Anket> = {
        'name': 'name',
        'email': 'email',
        'phone_number': 'chinaPhoneNumber',
        'wechat_id': 'wechatId',
        'nationality': 'nationality',
        'speaking_level': 'speakingLevel',
        'writing_level': 'writingLevel',
        'daily_rate': 'dailyRate',
        'years_in_china': 'yearsInChina',
        'in_china_now': 'inChinaNow',
        'cover-image': 'photoUrl',
        'worked_as_translator': 'workedAsTranslator',
        'chinese_exam_taken': 'chineseExamTaken',
        'translation_fields': 'translationFields',
        'main_city': 'currentCityInChina',
        'workable_cities': 'canWorkInOtherCities',
        'selfie_image_url': 'selfieImageUrl',
        'id_card_front_image_url': 'idCardFrontImageUrl',
        'id_card_back_image_url': 'idCardBackImageUrl',
        'wechat_qr_image_url': 'wechatQrImageUrl',
    };
    
    category.fields.forEach(field => {
        let value: any;
        if (keyMap[field.key]) {
            const anketKey = keyMap[field.key];
            value = anket[anketKey];
        } else if ((anket as Record<string, any>)[field.key] !== undefined) {
            value = (anket as Record<string, any>)[field.key];
        }

        if (value !== undefined && value !== null) {
            entryData[field.key] = value;
        }
    });
    
    return entryData;
}


export default function NewEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser } = useAuth(); 
  
  const [allCategories, setAllCategories] = useState<Category[]>([]); 
  const [allCities, setAllCities] = useState<City[]>([]); 
  const [selectableCategories, setSelectableCategories] = useState<Category[]>([]); 
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloningAnket, setIsCloningAnket] = useState(false);
  const [templateEntry, setTemplateEntry] = useState<Entry | null>(null);

  const anketIdToClone = searchParams.get('fromAnket');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setIsCloningAnket(!!anketIdToClone);

      try {
        const [fetchedCategories, fetchedCities] = await Promise.all([
          getCategories(),
          getCities()
        ]);
        setAllCategories(fetchedCategories);
        setAllCities(fetchedCities);

        let filteredForSubAdmin: Category[] = fetchedCategories;
        if (currentUser?.role === UserRole.SUB_ADMIN) {
          filteredForSubAdmin = currentUser.allowedCategoryIds 
            ? fetchedCategories.filter(cat => currentUser.allowedCategoryIds!.includes(cat.id))
            : [];
        }
        setSelectableCategories(filteredForSubAdmin);

        if (anketIdToClone) {
          const translatorCategory = fetchedCategories.find(c => c.slug === TARGET_TRANSLATOR_CATEGORY_SLUG);
          if (!translatorCategory) {
            toast({ title: "Алдаа", description: `"${TARGET_TRANSLATOR_CATEGORY_SLUG}" slug-тай категори олдсонгүй.`, variant: "destructive" });
            setIsCloningAnket(false);
            return;
          }

          setSelectedCategoryId(translatorCategory.id);
          const anket = await getAnket(anketIdToClone);
          if (anket) {
            const entryData = mapAnketToEntryData(anket, translatorCategory);
            setTemplateEntry({
              id: '', 
              categoryId: translatorCategory.id,
              categoryName: translatorCategory.name,
              title: anket.name,
              data: entryData,
              status: 'draft',
              createdAt: '', 
            });
          } else {
            toast({ title: "Алдаа", description: "Анкетын мэдээлэл олдсонгүй.", variant: "destructive" });
          }
          setIsCloningAnket(false);
        } else {
          const categoryIdFromUrl = searchParams.get('category');
          if (categoryIdFromUrl && filteredForSubAdmin.some(c => c.id === categoryIdFromUrl)) {
            setSelectedCategoryId(categoryIdFromUrl);
          } else if (filteredForSubAdmin.length > 0) {
            setSelectedCategoryId(filteredForSubAdmin[0]?.id);
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast({ title: "Алдаа", description: "Мэдээлэл ачааллахад алдаа гарлаа.", variant: "destructive" });
      } finally {
        setIsLoading(false);
        if (anketIdToClone) setIsCloningAnket(false);
      }
    }
    if (currentUser) { 
        loadData();
    } else {
        setIsLoading(false); 
    }
  }, [searchParams, toast, currentUser, anketIdToClone]);

  const selectedCategory = useMemo(() => {
    return allCategories.find(cat => cat.id === selectedCategoryId);
  }, [allCategories, selectedCategoryId]);

  const handleCategoryChange = (newCategoryId: string) => {
    setSelectedCategoryId(newCategoryId);
    setTemplateEntry(null);
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('category', newCategoryId);
    currentParams.delete('fromAnket');
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
    return <div className="p-4"><p>Хэрэглэгчийн нэвтрэлтийг шалгаж байна...</p></div>;
  }
  
  if (allCategories.length === 0) { 
    return (
      <>
        <PageHeader title="Шинэ Бүртгэл Үүсгэх" /> 
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
             <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Категори олдсонгүй</h3>
            <p className="text-muted-foreground mb-4">Бүртгэл нэмэхийн тулд эхлээд категори үүсгэх шаардлагатай.</p>
            {currentUser.role === UserRole.SUPER_ADMIN && (
                <Button asChild><Link href="/admin/categories/new">Категори үүсгэх</Link></Button>
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
            <AlertTitle className="font-semibold text-primary">Оноосон категори байхгүй</AlertTitle>
            <AlertDescription>Танд бүртгэл удирдах категори оноогоогүй байна.</AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={anketIdToClone ? "Анкетаас бүртгэл үүсгэх" : "Шинэ Бүртгэл Үүсгэх"} 
        description={selectedCategory ? `Категори: ${selectedCategory.name}` : "Эхлэхийн тулд категори сонгоно уу."}
      />
      
      <div className="mb-6 max-w-md"> 
        <label htmlFor="category-select" className="block text-sm font-medium text-foreground mb-1">
          Сонгогдсон категори <span className="text-destructive">*</span>
        </label>
        <Select value={selectedCategoryId || ""} onValueChange={handleCategoryChange} required disabled={!!anketIdToClone}>
          <SelectTrigger id="category-select" className="w-full">
            <SelectValue placeholder="Категори сонгоно уу..." />
          </SelectTrigger>
          <SelectContent>
            {selectableCategories.map(cat => (
              cat.name && <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!!anketIdToClone && <p className="text-sm text-muted-foreground mt-1">Анкетаас бүртгэл үүсгэж байгаа тул категори солих боломжгүй.</p>}
      </div>

      {isCloningAnket && (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Анкетын мэдээллийг ачаалж байна...</p>
        </div>
      )}

      {!isCloningAnket && selectedCategory ? ( 
        <EntryForm 
          key={selectedCategory.id} 
          initialData={templateEntry}
          categories={allCategories} 
          selectedCategory={selectedCategory}
          cities={allCities}
          onSubmitSuccess={handleEntryFormSuccess}
          sourceAnketId={anketIdToClone || undefined}
        />
      ) : !isCloningAnket && (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Бүртгэл үүсгэж эхлэхийн тулд дээрээс хүчинтэй категори сонгоно уу.</p> 
          </CardContent>
        </Card>
      )}
    </>
  );
}
