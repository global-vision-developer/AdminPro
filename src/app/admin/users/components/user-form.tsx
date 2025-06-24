
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
import { Save, Loader2, ListChecks, MailWarning, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCategories } from '@/lib/actions/categoryActions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';


const userFormSchemaBase = z.object({
  name: z.string().min(1, "Хэрэглэгчийн нэр хоосон байж болохгүй."),
  email: z.string().email("И-мэйл хаяг буруу байна."),
  role: z.nativeEnum(UserRole),
  allowedCategoryIds: z.array(z.string()).optional(),
});

const newUserFormSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Нууц үгнүүд таарахгүй байна.",
  path: ["confirmPassword"],
});

const editUserFormSchema = userFormSchemaBase.extend({
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && data.newPassword.length > 0 && data.newPassword.length < 6) {
    return false;
  }
  return true;
}, {
  message: "Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.",
  path: ["newPassword"],
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Шинэ нууц үгнүүд таарахгүй байна.",
  path: ["confirmNewPassword"],
});


export type UserFormValues = z.infer<typeof newUserFormSchema> & z.infer<typeof editUserFormSchema>;

interface UserFormProps {
  initialData?: UserProfile | null;
  onSubmit: (data: UserFormValues) => Promise<{error?: string, success?: boolean, message?: string}>;
  isSubmitting: boolean;
  isEditing?: boolean;
  onSendPasswordReset?: (email: string) => Promise<void>;
}

export function UserForm({ initialData, onSubmit, isSubmitting, isEditing = false, onSendPasswordReset }: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
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
        toast({ title: "Алдаа", description: "Сонголт хийх категориудыг ачааллахад алдаа гарлаа.", variant: "destructive" });
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
      newPassword: '',
      confirmNewPassword: '',
    } : {
      name: '',
      email: '',
      role: UserRole.SUB_ADMIN,
      allowedCategoryIds: [],
      password: '',
      confirmPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const watchRole = form.watch('role');

  const handleFormSubmit = async (data: UserFormValues) => {
    const result = await onSubmit(data);

    if (result.error) {
        toast({ title: "Алдаа", description: result.error, variant: "destructive" });
    } else if (result.success) {
        toast({ title: "Амжилттай", description: result.message || `Хэрэглэгч ${isEditing ? 'шинэчлэгдлээ' : 'үүслээ'}.` });
        if (!isEditing) {
            form.reset();
        }
        router.push('/admin/users');
        router.refresh();
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
                  <FormLabel>И-мэйл Хаяг</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} disabled={isEditing && initialData?.email === 'super@example.com'} />
                  </FormControl>
                   {isEditing && <FormDescription>Энэ и-мэйлийг солих нь Firebase Authentication болон Firestore-г хоёуланг нь шинэчилнэ.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isEditing ? (
                 <>
                    <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />Шинэ нууц үг (Хоосон орхивол солихгүй)</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormDescription>Нууц үгээ солихыг хүсвэл энд шинэ нууц үгээ оруулна уу. Дор хаяж 6 тэмдэгт.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmNewPassword"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Шинэ нууц үгээ баталгаажуулна уу</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </>
            ): (
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
                    disabled={isEditing && (initialData?.email === 'super@example.com' || initialData?.id === currentUser?.id)}
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
                   {(isEditing && (initialData?.email === 'super@example.com' || initialData?.id === currentUser?.id)) && (
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
