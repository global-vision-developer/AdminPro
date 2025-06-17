
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from '@/components/ui/card'; // Renamed CardDescription to UiCardDescription
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { UserProfile, Category } from '@/types'; // Added Category
import { UserRole } from '@/types';
import { Save, Loader2, ListChecks } from 'lucide-react'; // Added ListChecks
import { useRouter } from 'next/navigation'; 
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCategories } from '@/lib/actions/categoryActions'; // To fetch categories
import { useToast } from '@/hooks/use-toast';


const userFormSchemaBase = z.object({
  name: z.string().min(1, "Хэрэглэгчийн нэр шаардлагатай."),
  email: z.string().email("Имэйл хаяг буруу байна."),
  role: z.nativeEnum(UserRole),
  allowedCategoryIds: z.array(z.string()).optional(), // Array of category IDs
});

// Schema for creating a new user (includes password)
const newUserFormSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой."),
  confirmPassword: z.string().min(6, "Нууц үгээ баталгаажуулна уу."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Нууц үг таарахгүй байна.",
  path: ["confirmPassword"], 
});

// Schema for editing an existing user (password is not editable here)
const editUserFormSchema = userFormSchemaBase;


export type UserFormValues = z.infer<typeof newUserFormSchema>; 

interface UserFormProps {
  initialData?: UserProfile | null;
  onSubmit: (data: UserFormValues) => Promise<void>;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function UserForm({ initialData, onSubmit, isSubmitting, isEditing = false }: UserFormProps) {
  const router = useRouter(); 
  const { toast } = useToast();
  const currentSchema = isEditing ? editUserFormSchema : newUserFormSchema;
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    async function fetchAllCategories() {
      setLoadingCategories(true);
      try {
        const cats = await getCategories();
        setAllCategories(cats);
      } catch (error) {
        console.error("Failed to fetch categories for UserForm:", error);
        toast({ title: "Алдаа", description: "Failed to load categories for selection.", variant: "destructive" });
        setAllCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchAllCategories();
  }, [toast]);
  

  const form = useForm<UserFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: initialData ? {
      ...initialData,
      allowedCategoryIds: initialData.allowedCategoryIds || [],
      password: '', 
      confirmPassword: '',
    } : {
      name: '',
      email: '',
      role: UserRole.SUB_ADMIN,
      allowedCategoryIds: [],
      password: '',
      confirmPassword: '',
    },
  });

  const watchRole = form.watch('role');

  const handleFormSubmit = (data: UserFormValues) => {
    const dataToSubmit = {
      ...data,
      allowedCategoryIds: data.role === UserRole.SUB_ADMIN ? data.allowedCategoryIds || [] : [],
    };
    onSubmit(dataToSubmit);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{isEditing ? 'Хэрэглэгч Засах' : 'Шинэ Хэрэглэгч Нэмэх'}</CardTitle>
            <UiCardDescription>
              {isEditing ? 'Хэрэглэгчийн дэлгэрэнгүй мэдээлэл, эрхийг шинэчлэх.' : 'Шинэ хэрэглэгчийн дэлгэрэнгүй мэдээллийг оруулна уу.'}
            </UiCardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Бүтэн Нэр</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имэйл Хаяг</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} disabled={isEditing} />
                  </FormControl>
                  {isEditing && <FormDescription>Имэйлийг үүсгэсний дараа өөрчлөх боломжгүй.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Эрх</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== UserRole.SUB_ADMIN) {
                        form.setValue('allowedCategoryIds', []); // Clear categories if not Sub Admin
                      }
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Хэрэглэгчийн эрх сонгоно уу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchRole === UserRole.SUB_ADMIN && (
              <FormField
                control={form.control}
                name="allowedCategoryIds"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <ListChecks className="mr-2 h-5 w-5 text-primary" />
                      Allowed Categories for Sub Admin
                    </FormLabel>
                    <FormDescription>Select the entry categories this Sub Admin can manage.</FormDescription>
                    {loadingCategories ? (
                      <p>Loading categories...</p>
                    ) : allCategories.length === 0 ? (
                      <p className="text-muted-foreground">No categories available to assign. Please create categories first.</p>
                    ) : (
                      <ScrollArea className="h-48 rounded-md border p-3">
                        <div className="space-y-2">
                          {allCategories.map((category) => (
                            <FormField
                              key={category.id}
                              control={form.control}
                              name="allowedCategoryIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={category.id}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(category.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), category.id])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                  (value) => value !== category.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {category.name}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нууц Үг</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нууц Үг Баталгаажуулах</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Цуцлах</Button>
          <Button type="submit" disabled={isSubmitting || loadingCategories}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? 'Өөрчлөлтийг Хадгалах' : 'Хэрэглэгч Үүсгэх'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
