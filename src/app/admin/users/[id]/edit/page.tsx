
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
import { sendPasswordResetEmail } from 'firebase/auth'; // Import sendPasswordResetEmail

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
      toast({ title: "Access Denied", description: "You do not have permission to edit admin users.", variant: "destructive" });
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
        toast({ title: "Error", description: `Admin user not found in '${ADMINS_COLLECTION}' collection.`, variant: "destructive" });
        router.push('/admin/users');
      }
    } catch (error) {
      console.error("Error fetching admin user:", error);
      toast({ title: "Error", description: "Failed to fetch admin user details.", variant: "destructive" });
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
        toast({ title: "Action Prohibited", description: "Super Admins cannot change or downgrade their own role.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    try {
      const userDocRef = doc(db, ADMINS_COLLECTION, userToEdit.id);
      const updateData: Partial<UserProfile> & { updatedAt: any } = {
        name: data.name,
        // Email is not directly updatable here for other users; Firestore copy might be updated if needed but Auth is source of truth
        role: data.role,
        updatedAt: serverTimestamp(),
      };

      if (data.role === UserRole.SUB_ADMIN) {
        updateData.allowedCategoryIds = data.allowedCategoryIds || [];
      } else {
        updateData.allowedCategoryIds = [];
      }
      
      // Note: We are NOT updating email in Firestore here to avoid inconsistency with Firebase Auth
      // If email change is required, it should be handled via a separate mechanism (e.g. Cloud Function)
      // or by the user themselves after logging in.

      await updateDoc(userDocRef, updateData);
      
      toast({
        title: "Admin User Updated",
        description: `Admin user "${data.name}" details successfully updated in Firestore. Email and password changes are handled separately.`,
      });
      router.push('/admin/users');
    } catch (error) {
      console.error("Failed to update admin user:", error);
      toast({
        title: "Error",
        description: "Failed to update admin user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    if (!email) {
        toast({ title: "Error", description: "Email address is missing.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true); // Disable form submit button while this is in progress
    try {
        await sendPasswordResetEmail(auth, email);
        toast({
            title: "Password Reset Email Sent",
            description: `A password reset email has been sent to ${email}. Please check the inbox.`,
        });
    } catch (error: any) {
        console.error("Error sending password reset email:", error);
        toast({
            title: "Error Sending Reset Email",
            description: error.message || "Failed to send password reset email. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (superAdminUser?.role !== UserRole.SUPER_ADMIN && !isLoading) {
    return <div className="p-4"><p>Access denied. Redirecting...</p></div>;
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
    return <PageHeader title="Admin User Not Found" description="Could not load admin user details or user does not exist." />;
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
        onSendPasswordReset={handleSendPasswordReset} // Pass the new handler
      />
    </>
  );
}
