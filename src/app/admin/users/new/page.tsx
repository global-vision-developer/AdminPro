
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { addAdminUser } from '@/lib/actions/userActions'; // Updated to use the new server action

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUser, loading: adminAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!adminAuthLoading && adminUser && adminUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Access Denied", description: "You do not have permission to add users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [adminUser, adminAuthLoading, router, toast]);

  const handleSubmit = async (data: UserFormValues): Promise<{error?: string, success?: boolean, message?: string}> => {
    setIsSubmitting(true);
    if (!adminUser || adminUser.role !== UserRole.SUPER_ADMIN) {
        toast({ title: "Authorization Error", description: "Not authorized to create users.", variant: "destructive"});
        setIsSubmitting(false);
        return { error: "Not authorized." };
    }

    const result = await addAdminUser(data);
    setIsSubmitting(false);

    // The form itself will handle the toast notifications based on the result.
    return result; 
  };
  
  if (adminAuthLoading) {
    return <div className="p-4"><p>Loading admin authentication...</p></div>;
  }

  if (!adminUser && !adminAuthLoading) {
     return <div className="p-4"><p>Admin user not authenticated. Please log in.</p></div>;
  }

  if (adminUser.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-4"><p>Access Denied. You do not have permission to view this page.</p></div>;
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
