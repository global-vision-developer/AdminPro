
"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Banner } from '@/types';
import ImageUploader from '@/components/admin/image-uploader'; 
import { addBanner, updateBanner } from '@/lib/actions/bannerActions';

const bannerFormSchema = z.object({
  imageUrl: z.string().nullable().refine(val => val !== null && val !== '', { message: "Баннерын зураг заавал оруулна уу." }),
  description: z.string().min(1, "Тайлбар заавал бөглөнө үү."),
  link: z.string().url("Линк буруу байна (жишээ: https://example.com).").nullable().optional().or(z.literal('').transform(() => null)),
  isActive: z.boolean().default(true),
});

export type BannerFormValues = z.infer<typeof bannerFormSchema>;

interface BannerFormProps {
  initialData?: Banner | null;
  onFormSubmitSuccess?: () => void;
}

export function BannerForm({ initialData, onFormSubmitSuccess }: BannerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: initialData ? {
      imageUrl: initialData.imageUrl || null,
      description: initialData.description || '',
      link: initialData.link || null,
      isActive: initialData.isActive === undefined ? true : initialData.isActive,
    } : {
      imageUrl: null,
      description: '',
      link: null,
      isActive: true,
    },
  });

  const handleFormSubmit = async (data: BannerFormValues) => {
    setIsSubmitting(true);
    let result;

    const payload: Omit<Banner, "id" | "createdAt" | "updatedAt"> = {
        imageUrl: data.imageUrl,
        description: data.description,
        link: data.link || null,
        isActive: data.isActive,
    };

    if (initialData?.id) {
      result = await updateBanner(initialData.id, payload);
    } else {
      result = await addBanner(payload);
    }
    setIsSubmitting(false);

    if (result && "id" in result && result.id || result && "success" in result && result.success) {
      toast({ title: "Амжилттай", description: `Баннер ${initialData ? 'шинэчлэгдлээ' : 'үүслээ'}.` });
      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      } else {
        router.push('/admin/banners');
      }
       if(!initialData) { // Reset form only on new creation
           form.reset({ imageUrl: null, description: '', link: null, isActive: true });
        }
    } else if (result && "error" in result && result.error) {
      toast({ title: "Алдаа", description: result.error, variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{initialData ? 'Баннер Засварлах' : 'Шинэ Баннер Нэмэх'}</CardTitle>
            <UiCardDescription>
              Баннерын зураг, тайлбар болон бусад мэдээллийг оруулна уу.
            </UiCardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Баннерын Зураг <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <ImageUploader
                      initialImageUrl={field.value}
                      onUploadComplete={(dataUri) => field.onChange(dataUri)}
                      label="Баннерын зураг"
                    />
                  </FormControl>
                  <FormDescription>
                    Энэ баннерт харуулах зургийг байршуулна уу. Base64 хэлбэрээр хадгалагдана.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тайлбар <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Баннерын тайлбар эсвэл гарчиг" {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Холбоос (Сонголтоор)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/target-page" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>Баннер дээр дарахад очих URL хаяг.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Идэвхтэй эсэх</FormLabel>
                    <FormDescription>
                      Энэ баннерыг сайт дээр харуулах эсэхийг тохируулна.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Цуцлах
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {initialData ? 'Хадгалах' : 'Үүсгэх'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
