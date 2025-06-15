"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, type UserProfile } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Access Denied", description: "You do not have permission to add users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [currentUser, router, toast]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const newUser: UserProfile = {
        id: uuidv4(),
        name: data.name,
        email: data.email,
        role: data.role,
        avatar: `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}`
      };
      console.log("New user created (mock):", newUser);
      // In a real app, you'd save to a backend and handle password creation/invitation flow.

      toast({
        title: "User Created",
        description: `User "${data.name}" has been successfully created.`,
      });
      router.push('/admin/users');
    } catch (error) {
      console.error("Failed to create user:", error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };
  
  if (currentUser?.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-4"><p>Access Denied. Redirecting...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Add New User"
        description="Create a new administrator account and assign a role."
      />
      <UserForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </>
  );
}
