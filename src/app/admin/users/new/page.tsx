
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, type UserProfile } from '@/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUser } = useAuth(); // Renamed to avoid conflict
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (adminUser && adminUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Access Denied", description: "You do not have permission to add users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [adminUser, router, toast]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    if (!data.password) {
        toast({ title: "Error", description: "Password is required to create a new user.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUserAuth = userCredential.user;

      // Prepare user profile for Firestore
      const userAvatar = `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`

      const userProfileForFirestore: Omit<UserProfile, 'id'> & { createdAt: any, updatedAt: any, uid: string } = {
        uid: newUserAuth.uid, // Store uid explicitly if needed, though doc id is uid
        name: data.name,
        email: data.email,
        role: data.role,
        avatar: userAvatar,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Update Firebase Auth profile (displayName, photoURL)
      await updateProfile(newUserAuth, {
          displayName: data.name,
          photoURL: userAvatar
      });

      // Create user document in Firestore
      await setDoc(doc(db, "users", newUserAuth.uid), userProfileForFirestore);

      toast({
        title: "User Created",
        description: `User "${data.name}" has been successfully created.`,
      });
      router.push('/admin/users');
    } catch (error: any) {
      console.error("Failed to create user:", error);
      let errorMessage = "Failed to create user. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use by another account.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };
  
  if (adminUser?.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-4"><p>Access Denied. Redirecting...</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Add New User"
        description="Create a new administrator account and assign a role."
      />
      <UserForm onSubmit={handleSubmit} isSubmitting={isSubmitting} isEditing={false} />
    </>
  );
}
