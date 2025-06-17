
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
      toast({ title: "Access Denied", description: "You do not have permission to edit admin users.", variant: "destructive" }); // Changed
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
        toast({ title: "Error", description: `Admin user not found in '${ADMINS_COLLECTION}' collection.`, variant: "destructive" }); // Changed
        router.push('/admin/users');
      }
    } catch (error) {
      console.error("Error fetching admin user:", error);
      toast({ title: "Error", description: "Failed to fetch admin user details.", variant: "destructive" }); // Changed
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
        toast({ title: "Action Prohibited", description: "Super Admins cannot change or downgrade their own role.", variant: "destructive"}); // Changed
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
        updateData.allowedCategoryIds = []; 
      }
      
      await updateDoc(userDocRef, updateData);
      
      if (userToEdit.name !== data.name) {
         console.warn("Admin user's name updated in Firestore. Firebase Auth profile display name will update on their next login, or should be updated via a Cloud Function by an admin.");
      }

      toast({
        title: "Admin User Updated", // Changed
        description: `Admin user "${data.name}" details successfully updated in Firestore.`, // Changed
      });
      router.push('/admin/users');
    } catch (error) {
      console.error("Failed to update admin user:", error);
      toast({
        title: "Error", // Changed
        description: "Failed to update admin user. Please try again.", // Changed
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (superAdminUser?.role !== UserRole.SUPER_ADMIN && !isLoading) {
    return <div className="p-4"><p>Access denied. Redirecting...</p></div>; // Changed
  }

  if (isLoading) {
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

  if (!userToEdit) {
    return <PageHeader title="Admin User Not Found" description="Could not load admin user details or user does not exist." />; // Changed
  }

  return (
    <>
      <PageHeader
        title={`Админ эрх өөрчлөх: ${userToEdit.name}`} 
        description="Админ хэрэглэгчийн дэлгэрэнгүй, хандах эрх, дэд админд оноосон ангиллыг шинэчлэх" 
      />
      <UserForm initialData={userToEdit} onSubmit={handleSubmit} isSubmitting={isSubmitting} isEditing={true} />
    </>
  );
}

