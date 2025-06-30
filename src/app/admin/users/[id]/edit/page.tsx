
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminUser, updateAdminUser, sendAdminPasswordResetEmail } from '@/lib/actions/userActions';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const { toast } = useToast();
  const { currentUser: superAdminUser, loading: authLoading } = useAuth(); 
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && superAdminUser && superAdminUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Хандалт хориглогдсон", description: "Та админ хэрэглэгчдийг засах эрхгүй байна.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [superAdminUser, authLoading, router, toast]);

  const fetchUserToEdit = useCallback(async () => {
    if (!userId || (superAdminUser && superAdminUser.role !== UserRole.SUPER_ADMIN)) {
      setIsLoading(false);
      return;
    };
    setIsLoading(true);
    const fetchedUser = await getAdminUser(userId);
    if (fetchedUser) {
      setUserToEdit(fetchedUser);
    } else {
      toast({ title: "Алдаа", description: "Админ хэрэглэгч олдсонгүй.", variant: "destructive" });
      router.push('/admin/users');
    }
    setIsLoading(false);
  }, [userId, superAdminUser, router, toast]);

  useEffect(() => {
    if (!authLoading) {
        fetchUserToEdit();
    }
  }, [fetchUserToEdit, authLoading]);


  const handleSubmit = async (data: UserFormValues): Promise<{error?: string, success?: boolean, message?: string}> => {
    setIsSubmitting(true);
    if (!userToEdit) {
        setIsSubmitting(false);
        return { error: "Хэрэглэгчийн мэдээлэл ачаалагдаагүй байна."};
    }

    if (superAdminUser?.id === userToEdit.id && data.role !== UserRole.SUPER_ADMIN && superAdminUser.role === UserRole.SUPER_ADMIN) {
        toast({ title: "Үйлдэл хориглогдсон", description: "Сүпер Админ өөрийн эрхийг өөрчлөх/доошлуулах боломжгүй.", variant: "destructive"});
        setIsSubmitting(false);
        return { error: "Сүпер Админ өөрийн эрхийг өөрчлөх/доошлуулах боломжгүй." };
    }
    if (userToEdit.email === 'admin@pro.com' && (data.email !== 'admin@pro.com' || data.role !== UserRole.SUPER_ADMIN)) {
      toast({ title: "Үйлдэл хориглогдсон", description: "Үндсэн сүпер админы (admin@pro.com) и-мэйл болон эрхийг өөрчлөх боломжгүй.", variant: "destructive" });
      setIsSubmitting(false);
      return { error: "Үндсэн сүпер админы и-мэйл болон эрхийг өөрчлөх боломжгүй." };
    }

    const updatePayload: Partial<Pick<UserProfile, "name" | "email" | "role" | "allowedCategoryIds" | "canSendNotifications">> & { newPassword?: string } = {
      name: data.name,
      email: data.email, 
      role: data.role,
      canSendNotifications: data.canSendNotifications,
      allowedCategoryIds: data.allowedCategoryIds,
    };

    if (data.newPassword && data.newPassword.length > 0) {
        if (data.newPassword.length < 6) {
             setIsSubmitting(false);
             return { error: "Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой."};
        }
        if (data.newPassword !== data.confirmNewPassword) {
            setIsSubmitting(false);
            return { error: "Шинэ нууц үгнүүд таарахгүй байна."};
        }
        updatePayload.newPassword = data.newPassword;
    }


    const result = await updateAdminUser(userToEdit.id, updatePayload);
    setIsSubmitting(false);
    return result; 
  };

  const handleSendPasswordReset = async (email: string) => {
    if (!email) {
        toast({ title: "Алдаа", description: "И-мэйл хаяг олдсонгүй.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true); 
    const result = await sendAdminPasswordResetEmail(email);
    if (result.success) {
        toast({
            title: "Нууц үг сэргээх и-мэйл илгээлээ",
            description: `${email} хаяг руу нууц үг сэргээх и-мэйл илгээлээ. Ирсэн и-мэйлээ шалгана уу.`,
        });
    } else {
        toast({
            title: "И-мэйл илгээхэд алдаа гарлаа",
            description: result.error || "Нууц үг сэргээх и-мэйл илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
            variant: "destructive",
        });
    }
    setIsSubmitting(false);
  };

  if (authLoading || isLoading) {
    return (
      <>
        <PageHeader title="Админ эрх өөрчлөх" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      </>
    );
  }

  if (!superAdminUser || superAdminUser.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-4"><p>Хандалт хориглогдсон. Хуудас руу шилжиж байна...</p></div>;
  }

  if (!userToEdit) {
    return <PageHeader title="Админ хэрэглэгч олдсонгүй" description="Админ хэрэглэгчийн мэдээллийг ачааллаж чадсангүй эсвэл хэрэглэгч байхгүй байна." />;
  }

  return (
    <>
      <PageHeader
        title={`Админ эрх өөрчлөх: ${userToEdit.name}`}
        description="Админ хэрэглэгчийн дэлгэрэнгүй, хандах эрх, дэд админд оноосон категориудыг шинэчлэх"
      />
      <UserForm 
        initialData={userToEdit} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        isEditing={true}
        onSendPasswordReset={handleSendPasswordReset}
      />
    </>
  );
}
