
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
import { db, auth } from '@/lib/firebase'; 
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const ADMINS_COLLECTION = "admins"; 

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string; 

  const { toast } = useToast();
  const { currentUser: superAdminUser } = useAuth(); 
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (superAdminUser && superAdminUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Хандах Эрхгүй", description: "Танд админ хэрэглэгч засах эрх байхгүй.", variant: "destructive" });
      router.push('/admin/dashboard');
      return;
    }
  }, [superAdminUser, router, toast]);

  const fetchUserToEdit = useCallback(async () => { 
    if (!userId || (superAdminUser && superAdminUser.role !== UserRole.SUPER_ADMIN)) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, ADMINS_COLLECTION, userId); 
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserToEdit({ 
          id: userDocSnap.id, 
          ...data,
          allowedCategoryIds: data.role === UserRole.SUB_ADMIN && Array.isArray(data.allowedCategoryIds) ? data.allowedCategoryIds : [] 
        } as UserProfile);
      } else {
        toast({ title: "Алдаа", description: `'${ADMINS_COLLECTION}' коллекцод админ хэрэглэгч олдсонгүй.`, variant: "destructive" });
        router.push('/admin/users');
      }
    } catch (error) {
      console.error("Error fetching admin user:", error);
      toast({ title: "Алдаа", description: "Админ хэрэглэгчийн мэдээлэл татахад алдаа гарлаа.", variant: "destructive" });
      router.push('/admin/users');
    } finally {
      setIsLoading(false);
    }
  }, [userId, superAdminUser, router, toast]);
  
  useEffect(() => {
    fetchUserToEdit();
  }, [fetchUserToEdit]);


  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    if (!userToEdit) return;

    if (superAdminUser?.id === userToEdit.id && data.role !== UserRole.SUPER_ADMIN && superAdminUser.role === UserRole.SUPER_ADMIN) {
        toast({ title: "Үйлдэл Хориглосон", description: "Супер Админууд өөрсдийн эрхийг өөрчлөх эсвэл бууруулах боломжгүй.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    try {
      const userDocRef = doc(db, ADMINS_COLLECTION, userToEdit.id); 
      const updateData: Partial<UserProfile> & { updatedAt: any } = {
        name: data.name,
        role: data.role,
        updatedAt: serverTimestamp(),
      };

      if (data.role === UserRole.SUB_ADMIN) {
        updateData.allowedCategoryIds = data.allowedCategoryIds || [];
      } else {
        // If role is changed from Sub Admin to Super Admin, remove allowedCategoryIds
        updateData.allowedCategoryIds = []; // Or delete field: firebase.firestore.FieldValue.delete() if using older sdk
      }
      
      await updateDoc(userDocRef, updateData);
      
      if (userToEdit.name !== data.name) {
         console.warn("Admin user's name updated in Firestore. Firebase Auth profile display name will update on their next login, or should be updated via a Cloud Function by an admin.");
      }

      toast({
        title: "Админ Хэрэглэгч Шинэчлэгдлээ",
        description: `Админ хэрэглэгч "${data.name}"-ийн мэдээлэл Firestore-т амжилттай шинэчлэгдлээ.`,
      });
      router.push('/admin/users');
    } catch (error) {
      console.error("Failed to update admin user:", error);
      toast({
        title: "Алдаа",
        description: "Админ хэрэглэгч шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (superAdminUser?.role !== UserRole.SUPER_ADMIN && !isLoading) {
    return <div className="p-4"><p>Хандах эрхгүй. Буцаж байна...</p></div>;
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Админ Хэрэглэгч Засах" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      </>
    );
  }

  if (!userToEdit) {
    return <PageHeader title="Админ Хэрэглэгч Олдсонгүй" description="Админ хэрэглэгчийн мэдээллийг ачаалах боломжгүй эсвэл байхгүй байна." />;
  }

  return (
    <>
      <PageHeader
        title={`Админ Хэрэглэгч Засах: ${userToEdit.name}`}
        description="Админ хэрэглэгчийн дэлгэрэнгүй мэдээлэл, эрх, болон Sub Admin-д оноогдсон ангилалуудыг шинэчлэх."
      />
      <UserForm initialData={userToEdit} onSubmit={handleSubmit} isSubmitting={isSubmitting} isEditing={true} />
    </>
  );
}
