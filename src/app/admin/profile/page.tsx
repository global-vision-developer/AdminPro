
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateAdminUser } from '@/lib/actions/userActions';
import { Loader2, Save, KeyRound, UserCircle, Mail } from 'lucide-react';
import ImageUploader from '@/components/admin/image-uploader';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
  avatar: z.string().nullable().optional(),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && data.newPassword.length > 0 && data.newPassword.length < 6) {
    return false;
  }
  return true;
}, {
  message: "New password must be at least 6 characters.",
  path: ["newPassword"],
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match.",
  path: ["confirmNewPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      avatar: currentUser?.avatar || null,
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  React.useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name || '',
        email: currentUser.email || '',
        avatar: currentUser.avatar || null,
        newPassword: '',
        confirmNewPassword: '',
      });
    }
  }, [currentUser, form]);
  
  const handleSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const updatePayload: any = {
      name: data.name,
    };
    
    if (data.email !== currentUser.email) {
      updatePayload.email = data.email;
    }
    
    if (data.newPassword) {
      updatePayload.newPassword = data.newPassword;
    }
    
    if (data.avatar !== currentUser.avatar) {
      updatePayload.avatar = data.avatar;
    }

    const result = await updateAdminUser(currentUser.id, updatePayload);
    
    if (result.success) {
      toast({
        title: "Profile Updated",
        description: result.message || "Your profile has been successfully updated.",
      });
      form.reset({ ...form.getValues(), newPassword: '', confirmNewPassword: ''});
    } else {
      toast({
        title: "Update Failed",
        description: result.error || "An unknown error occurred.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };
  
  if (loading || !currentUser) {
    return (
      <>
        <PageHeader title="Профайл" />
        <Card>
          <CardHeader>
             <Skeleton className="h-8 w-1/4" />
             <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Профайл" description="Өөрийн хувийн мэдээллээ шинэчилж, нууц үгээ солино уу." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Хувийн мэдээлэл</CardTitle>
              <CardDescription>Нэр, и-мэйл хаяг, аватараа эндээс өөрчилнө үү.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Профайлын зураг</FormLabel>
                    <FormControl>
                      <ImageUploader
                        initialImageUrl={field.value}
                        onUploadComplete={(url) => field.onChange(url)}
                        label="Avatar"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4" /> Нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Таны нэр" {...field} />
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
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4" /> И-мэйл хаяг</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={currentUser.email === 'super@example.com'} />
                    </FormControl>
                     {currentUser.email === 'super@example.com' && <FormDescription>Үндсэн сүпер админы и-мэйлийг солих боломжгүй.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Нууц үг солих</CardTitle>
              <CardDescription>Нууц үгээ солихыг хүсвэл доорх талбаруудыг бөглөнө үү. Хоосон орхивол солихгүй.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4" /> Шинэ нууц үг</FormLabel>
                      <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormDescription>Дор хаяж 6 тэмдэгттэй байна.</FormDescription>
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
            </CardContent>
          </Card>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Хадгалах
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
