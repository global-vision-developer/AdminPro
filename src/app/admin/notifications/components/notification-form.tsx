
"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ImageUploader from '@/components/admin/image-uploader';

const notificationFormSchema = z.object({
  title: z.string().min(1, "Гарчиг заавал бөглөнө үү."),
  body: z.string().min(1, "Агуулга заавал бөглөнө үү."),
  imageUrl: z.string().url("Зургийн линк буруу байна.").nullable().optional(),
  deepLink: z.string().url("Deep link буруу байна (жишээ: app://screen/id).").nullable().optional()
            .or(z.literal('').transform(() => null)), // Allow empty string to be treated as null
  scheduleAt: z.date().nullable().optional(),
});

export type NotificationFormValues = z.infer<typeof notificationFormSchema>;

interface NotificationFormProps {
  onSubmit: (data: NotificationFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function NotificationForm({ onSubmit, isSubmitting, onCancel }: NotificationFormProps) {
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: '',
      body: '',
      imageUrl: null,
      deepLink: null,
      scheduleAt: null,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Гарчиг <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Мэдэгдлийн гарчиг" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Агуулга <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Мэдэгдлийн агуулга" {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Зургийн URL (Сонголтоор)</FormLabel>
              <FormControl>
                <ImageUploader
                    initialImageUrl={field.value}
                    onUploadComplete={(url) => field.onChange(url)}
                    storagePath="notification-images"
                    label="Мэдэгдлийн зураг"
                />
              </FormControl>
               <FormDescription>Мэдэгдэлд харуулах зургийн линкийг оруулна уу эсвэл байршуулна уу.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deepLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deep Link (Сонголтоор)</FormLabel>
              <FormControl>
                <Input placeholder="app://your-app/screen/itemId" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>Хэрэглэгчийг аппын тодорхой хэсэг рүү чиглүүлэх deep link.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scheduleAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Илгээх Огноо/Цаг (Сонголтоор)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "yyyy-MM-dd HH:mm") : <span>Огноо, цаг сонгох</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                        if (date) {
                           // Preserve time if already set, otherwise default to current time
                           const existingTime = field.value || new Date();
                           date.setHours(existingTime.getHours(), existingTime.getMinutes(), existingTime.getSeconds(), existingTime.getMilliseconds());
                        }
                        field.onChange(date);
                    }}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } // Allow today
                    initialFocus
                  />
                  <div className="p-2 border-t">
                    <Input
                        type="time"
                        defaultValue={field.value ? format(field.value, "HH:mm") : format(new Date(), "HH:mm")}
                        onChange={(e) => {
                            const time = e.target.value;
                            const [hours, minutes] = time.split(':').map(Number);
                            const newDate = field.value ? new Date(field.value) : new Date();
                            if (!isNaN(hours) && !isNaN(minutes)) {
                                newDate.setHours(hours, minutes);
                                field.onChange(newDate);
                            }
                        }}
                        className="w-full"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>Хоосон үлдээвэл шууд илгээгдэнэ (Firebase Function-ийн логикоос хамаарна).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Цуцлах
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Илгээх Хүсэлт Тавих
          </Button>
        </div>
      </form>
    </Form>
  );
}
