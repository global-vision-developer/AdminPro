
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UiCardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { UserProfile, Category } from '@/types';
import { UserRole } from '@/types';
import { Save, Loader2, ListChecks, MailWarning } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCategories } from '@/lib/actions/categoryActions';
import { useToast } from '@/hooks/use-toast';


const userFormSchemaBase = z.object({
  name: z.string().min(1, "User name is required."),
  email: z.string().email("Invalid email address."),
  role: z.nativeEnum(UserRole),
  allowedCategoryIds: z.array(z.string()).optional(),
});

const newUserFormSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Please confirm your password."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const editUserFormSchema = userFormSchemaBase; // Password fields are not part of the edit schema directly here

export type UserFormValues = z.infer<typeof newUserFormSchema>; // Use the most inclusive for typing

interface UserFormProps {
  initialData?: UserProfile | null;
  onSubmit: (data: UserFormValues) => Promise<{error?: string, success?: boolean, message?: string}>; // Updated return type
  isSubmitting: boolean;
  isEditing?: boolean;
  onSendPasswordReset?: (email: string) => Promise<void>;
}

export function UserForm({ initialData, onSubmit, isSubmitting, isEditing = false, onSendPasswordReset }: UserFormProps) {
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
        toast({ title: "Error", description: "Failed to load categories for selection.", variant: "destructive" });
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
      password: '', // Not directly edited here, but part of type
      confirmPassword: '', // Not directly edited here
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

  const handleFormSubmit = async (data: UserFormValues) => {
    const dataToSubmit = {
      ...data,
      allowedCategoryIds: data.role === UserRole.SUB_ADMIN ? data.allowedCategoryIds || [] : [],
    };
    // Password fields are only relevant for new user creation schema
    // For editing, password is handled via reset, and not directly submitted through this form for changing.
    if (isEditing) {
        // @ts-ignore
        delete dataToSubmit.password; 
        // @ts-ignore
        delete dataToSubmit.confirmPassword;
    }
    const result = await onSubmit(dataToSubmit);
    if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    } else if (result.success) {
        toast({ title: "Success", description: result.message || `User ${isEditing ? 'updated' : 'created'} successfully.` });
        if (!isEditing) form.reset(); // Reset only on new user creation success
        router.push('/admin/users');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{isEditing ? 'Хэрэглэгч засах' : 'Шинэ Хэрэглэгч Нэмэх'}</CardTitle>
            <UiCardDescription>
              {isEditing ? 'Хэрэглэгчийн дэлгэрэнгүй мэдээлэл, эрхийг шинэчлэх.' : 'Шинэ хэрэглэгчийн дэлгэрэнгүй мэдээллийг оруулах'}
            </UiCardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Овог Нэр</FormLabel>
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
                  <FormLabel>Имейл Хаяг</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} disabled={isEditing && initialData?.email === 'super@example.com'} />
                  </FormControl>
                  {isEditing && <FormDescription>Firestore дахь имэйлийг шинэчилнэ. Firebase Authentication дахь имэйлийг Cloud Function ашиглан солих шаардлагатай.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEditing && initialData?.email && onSendPasswordReset && (
              <FormItem>
                <FormLabel>Нууц үг</FormLabel>
                <div className="flex items-center space-x-2">
                   <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSendPasswordReset(initialData.email)}
                    disabled={isSubmitting}
                  >
                    <MailWarning className="mr-2 h-4 w-4" />
                    Нууц үг сэргээх имэйл илгээх
                  </Button>
                </div>
                <FormDescription>Энэ товчийг дарснаар "{initialData.email}" хаяг руу нууц үг сэргээх заавар бүхий имэйл илгээгдэнэ.</FormDescription>
              </FormItem>
            )}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Хандах Эрх</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== UserRole.SUB_ADMIN) {
                        form.setValue('allowedCategoryIds', []);
                      }
                    }}
                    defaultValue={field.value}
                    // Disable role change for the super@example.com user or self
                    disabled={isEditing && (initialData?.email === 'super@example.com' || initialData?.id === form.control._options.context?.currentUser?.id)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Хэрэглэгчийн эрхийг сонгоно уу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(UserRole).map((roleValue) => {
                        let roleDisplay = '';
                        if (roleValue === UserRole.SUPER_ADMIN) roleDisplay = 'Сүпер Админ';
                        else if (roleValue === UserRole.SUB_ADMIN) roleDisplay = 'Дэд Админ';
                        else roleDisplay = roleValue;
                        return (
                          <SelectItem key={roleValue} value={roleValue}>{roleDisplay}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                   {(isEditing && (initialData?.email === 'super@example.com' || initialData?.id === form.control._options.context?.currentUser?.id)) && (
                    <FormDescription>Өөрийн болон үндсэн сүпер админы эрхийг өөрчлөх боломжгүй.</FormDescription>
                  )}
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
                      Дэд админд зөвшөөрсөн категориуд
                    </FormLabel>
                    <FormDescription>Энэ Дэд админы удирдаж болох бүртгэлийн категориудыг сонгоно уу.</FormDescription>
                    {loadingCategories ? (
                      <p>Категориудыг ачаалж байна...</p>
                    ) : allCategories.length === 0 ? (
                      <p className="text-muted-foreground">Оноох боломжтой категори алга. Эхлээд категори үүсгэнэ үү.</p>
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
                      <FormLabel>Нууц үг</FormLabel>
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
                      <FormLabel>Нууц үг баталгаажуулах</FormLabel>
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
            {isEditing ? 'Өөрчлөлтийг хадгалах' : 'Үүсгэх'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    