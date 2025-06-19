
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { City } from '@/types';
import { CityType, CITY_TYPE_DISPLAY_NAMES } from '@/types';
import { addCity, updateCity } from '@/lib/actions/cityActions';

const cityFormSchema = z.object({
  name: z.string().min(1, "Монгол нэр заавал бөглөнө үү."),
  nameCN: z.string().min(1, "Хятад нэр заавал бөглөнө үү."),
  order: z.preprocess(
    (val) => (val === "" || val === undefined || val === null) ? undefined : String(val),
    z.string()
      .refine((val) => val === undefined || val === null || val === '' || !isNaN(parseFloat(val)), { message: "Эрэмбэ тоо байх ёстой." })
      .transform(val => (val === undefined || val === null || val === '') ? 0 : Number(val))
  ).default(0),
  cityType: z.nativeEnum(CityType, { required_error: "Хотын төрөл сонгоно уу."}),
  iataCode: z.string().length(3, "IATA код 3 үсэгтэй байна.").toUpperCase().optional().or(z.literal("").transform(() => undefined)),
});

export type CityFormValues = z.infer<typeof cityFormSchema>;

interface CityFormProps {
  initialData?: City | null;
  onFormSubmitSuccess?: () => void;
}

export function CityForm({ initialData, onFormSubmitSuccess }: CityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CityFormValues>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: initialData ? {
      name: initialData.name || '',
      nameCN: initialData.nameCN || '',
      order: initialData.order || 0,
      cityType: initialData.cityType || CityType.OTHER,
      iataCode: initialData.iataCode || '',
    } : {
      name: '',
      nameCN: '',
      order: 0,
      cityType: CityType.OTHER,
      iataCode: '',
    },
  });

  const handleFormSubmit = async (data: CityFormValues) => {
    setIsSubmitting(true);
    let result;

    const payload: Omit<City, "id" | "createdAt" | "updatedAt"> = {
        name: data.name,
        nameCN: data.nameCN,
        order: data.order,
        cityType: data.cityType,
        iataCode: data.iataCode || "", // Ensure empty string if undefined
    };

    if (initialData?.id) {
      result = await updateCity(initialData.id, payload);
    } else {
      result = await addCity(payload);
    }
    setIsSubmitting(false);

    if (result && "id" in result && result.id || result && "success" in result && result.success) {
      toast({ title: "Амжилттай", description: `Хот ${initialData ? 'шинэчлэгдлээ' : 'үүслээ'}.` });
      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      } else {
        router.push('/admin/cities');
      }
       if(!initialData) {
           form.reset({ name: '', nameCN: '', order: 0, cityType: CityType.OTHER, iataCode: '' });
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
            <CardTitle className="font-headline">{initialData ? 'Хот Засварлах' : 'Шинэ Хот Нэмэх'}</CardTitle>
            <UiCardDescription>
              Хотын монгол, хятад нэр, эрэмбэ, төрөл болон IATA кодыг оруулна уу.
            </UiCardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Монгол нэр <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Жишээ: Улаанбаатар" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameCN"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Хятад нэр <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Жишээ: 乌兰巴托" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Эрэмбэ <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                     <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        {...field}
                        value={field.value === undefined || field.value === null ? '' : String(field.value)}
                        onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : val);
                        }}
                    />
                  </FormControl>
                  <FormDescription>Бага тоо нь түрүүлж харагдана.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Хотын төрөл <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Хотын төрлийг сонгоно уу..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(CityType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {CITY_TYPE_DISPLAY_NAMES[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="iataCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IATA Код (Сонголтоор)</FormLabel>
                  <FormControl>
                    <Input placeholder="ULN" {...field} maxLength={3} style={{ textTransform: 'uppercase' }} />
                  </FormControl>
                  <FormDescription>Олон улсын нисэх онгоцны буудлын 3 үсэгт код.</FormDescription>
                  <FormMessage />
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
