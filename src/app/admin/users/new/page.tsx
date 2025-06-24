
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { addAdminUser } from '@/lib/actions/userActions';

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUser, loading: adminAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!adminAuthLoading && adminUser && adminUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Хандалт хориглогдсон", description: "Та хэрэглэгч нэмэх эрхгүй байна.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [adminUser, adminAuthLoading, router, toast]);

  const handleSubmit = async (data: UserFormValues): Promise<{error?: string, success?: boolean, message?: string}> => {
    setIsSubmitting(true);
    if (!adminUser || adminUser.role !== UserRole.SUPER_ADMIN) {
        toast({ title: "Эрхийн алдаа", description: "Хэрэглэгч үүсгэх эрхгүй байна.", variant: "destructive"});
        setIsSubmitting(false);
        return { error: "Not authorized." };
    }

    const result = await addAdminUser(data);
    setIsSubmitting(false);

    return result; 
  };
  
  if (adminAuthLoading) {
    return <div className="p-4"><p>Админы нэвтрэлтийг шалгаж байна...</p></div>;
  }

  if (!adminUser && !adminAuthLoading) {
     return <div className="p-4"><p>Админ нэвтрээгүй байна. Нэвтэрнэ үү.</p></div>;
  }

  if (adminUser.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-4"><p>Хандалт хориглогдсон. Та энэ хуудсыг үзэх эрхгүй байна.</p></div>;
  }


  return (
    <>
      <PageHeader
        title="Шинэ Хэрэглэгч нэмэх"
        description="Firebase-д хэрэглэгч үүсгээд, Firestore дээрх админ мэдээллийг бүртгэх"
      />
      <UserForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        isEditing={false} 
      />
    </>
  );
}
