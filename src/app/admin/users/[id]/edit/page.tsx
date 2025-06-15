"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { mockUsers } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Access Denied", description: "You do not have permission to edit users.", variant: "destructive" });
      router.push('/admin/dashboard');
      return;
    }

    if (userId) {
      setIsLoading(true);
      const fetchedUser = mockUsers.find(u => u.id === userId);
      setTimeout(() => { // Simulate network delay
        if (fetchedUser) {
          setUser(fetchedUser);
        } else {
          toast({ title: "Error", description: "User not found.", variant: "destructive" });
          router.push('/admin/users');
        }
        setIsLoading(false);
      }, 500);
    }
  }, [currentUser, userId, router, toast]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    if (!user) return;

    // Prevent self-demotion/role change for super admin
    if (currentUser?.id === user.id && data.role !== UserRole.SUPER_ADMIN && currentUser.role === UserRole.SUPER_ADMIN) {
        toast({ title: "Action Prohibited", description: "Super Admins cannot change their own role or demote themselves.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }


    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const updatedUser: UserProfile = {
        ...user,
        name: data.name,
        // Email is not editable per form logic
        role: data.role,
      };
      console.log("User updated (mock):", updatedUser);

      toast({
        title: "User Updated",
        description: `User "${data.name}" has been successfully updated.`,
      });
      router.push('/admin/users');
    } catch (error) {
      console.error("Failed to update user:", error);
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (currentUser?.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-4"><p>Access Denied. Redirecting...</p></div>;
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit User" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      </>
    );
  }

  if (!user) {
    return <PageHeader title="User Not Found" />;
  }

  return (
    <>
      <PageHeader
        title={`Edit User: ${user.name}`}
        description="Update the user's details and role."
      />
      <UserForm initialData={user} onSubmit={handleSubmit} isSubmitting={isSubmitting} isEditing={true} />
    </>
  );
}
