
"use client";

import React, { useState, useEffect } from 'react';
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
import { updateAdminUser, sendAdminPasswordResetEmail } from '@/lib/actions/userActions';
import { Loader2, Save, KeyRound, UserCircle, Mail, Edit, Undo, Send } from 'lucide-react';
import ImageUploader from '@/components/admin/image-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  avatar: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser?.name || '',
      avatar: currentUser?.avatar || null,
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name || '',
        avatar: currentUser.avatar || null,
      });
    }
  }, [currentUser, form, isEditing]);
  
  const handleSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    // Call the unified server action which handles both Auth and Firestore updates via the Cloud Function
    const result = await updateAdminUser(currentUser.id, {
      name: data.name,
      avatar: data.avatar,
    });

    if (result.success) {
      toast({
        title: "Профайл Шинэчлэгдлээ",
        description: result.message || "Таны профайл амжилттай шинэчлэгдлээ.",
      });
      setIsEditing(false);
      // NOTE: The useAuth hook will eventually get the updated user data from onAuthStateChanged
      // but it can be slow. A page refresh might be needed for instant UI updates, or a more complex state management.
    } else {
       toast({
        title: "Шинэчлэлт Амжилтгүй",
        description: result.error || "Профайлын мэдээллийг шинэчилж чадсангүй.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) {
      toast({ title: "Алдаа", description: "И-мэйл хаяг олдсонгүй.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    const result = await sendAdminPasswordResetEmail(currentUser.email);
    if (result.success) {
        toast({
            title: "Нууц үг сэргээх и-мэйл илгээлээ",
            description: `${currentUser.email} хаяг руу нууц үг сэргээх и-мэйл илгээлээ. Ирсэн и-мэйлээ шалгана уу.`,
        });
    } else {
        toast({
            title: "И-мэйл илгээхэд алдаа гарлаа",
            description: result.error || "Нууц үг сэргээх и-мэйл илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
            variant: "destructive",
        });
    }
    setIsSubmitting(false);
  }
  
  if (loading || !currentUser) {
    return (
      <>
        <PageHeader title="Профайл" />
        <Card>
          <CardHeader className='flex-row justify-between items-center'>
             <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
             </div>
             <Skeleton className="h-10 w-24" />
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const fallbackName = currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : 'N/A';

  return (
    <>
      <PageHeader title="Профайл" description="Өөрийн хувийн мэдээллээ шинэчилж, нууц үгээ солино уу." />

      {!isEditing ? (
        // --- Read-Only View ---
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <div>
                <CardTitle className="font-headline">Хувийн мэдээлэл</CardTitle>
                <CardDescription>Таны бүртгэлтэй мэдээлэл.</CardDescription>
            </div>
            <Button onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/> Засварлах</Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
             <div className="flex items-center space-x-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} data-ai-hint="user avatar" />
                <AvatarFallback>{fallbackName}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-2xl font-semibold">{currentUser.name}</h3>
                <p className="text-muted-foreground">{currentUser.email}</p>
                <p className="text-sm text-muted-foreground">{currentUser.role}</p>
              </div>
            </div>
            <div className="pt-4">
                 <Button onClick={handlePasswordReset} variant="outline" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                     Нууц үг сэргээх и-мэйл илгээх
                </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // --- Edit View ---
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Профайл Засварлах</CardTitle>
                <CardDescription>Нэр болон аватараа эндээс өөрчилнө үү.</CardDescription>
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
                          storagePath="avatars/"
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
                <FormItem>
                   <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4" /> И-мэйл хаяг</FormLabel>
                   <FormControl>
                        <Input type="email" value={currentUser.email} disabled />
                   </FormControl>
                   <FormDescription>И-мэйл хаягийг өөрчлөх боломжгүй.</FormDescription>
                </FormItem>
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                <Undo className="mr-2 h-4 w-4" /> Цуцлах
              </Button>
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
      )}
    </>
  );
}
