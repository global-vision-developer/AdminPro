
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
import { Save, Loader2, ListChecks } from 'lucide-react'; 
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
            <CardTitle className="font-headline">{isEditing ? 'Edit User' : 'Шинэ Хэрэглэгч Нэмэх'}</CardTitle> 
            <UiCardDescription>
              {isEditing ? 'Update user details and role.' : 'Шинэ хэрэглэгчийн дэлгэрэнгүй мэдээллийг оруулах'} 
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
                    <Input type="email" placeholder="user@example.com" {...field} disabled={isEditing} />
                  </FormControl>
                  {isEditing && <FormDescription>Email cannot be changed after creation.</FormDescription>} 
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user role" /> 
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
                      Дэд админд зөвшөөрсөн ангиллууд
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
                      <FormLabel>Password</FormLabel> 
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
                      <FormLabel>Confirm Password</FormLabel> 
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
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button> 
          <Button type="submit" disabled={isSubmitting || loadingCategories}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? 'Save Changes' : 'Create User'} 
          </Button>
        </div>
      </form>
    </Form>
  );
}

