
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, type UserProfile } from '@/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUser } = useAuth();
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

    let newUserAuth: FirebaseUser | null = null;

    try {
      // Step 1: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      newUserAuth = userCredential.user;

      // Step 2: Prepare user profile for Firestore
      const userAvatar = `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`

      const userProfileForFirestore: Omit<UserProfile, 'id'> & { createdAt: any, updatedAt: any, uid: string } = {
        uid: newUserAuth.uid,
        name: data.name,
        email: data.email,
        role: data.role, // Role selected in the form
        avatar: userAvatar,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Step 3: Update Firebase Auth profile (displayName, photoURL)
      // This should happen after Firestore document is successfully created, or handled carefully
      await updateProfile(newUserAuth, {
          displayName: data.name,
          photoURL: userAvatar
      });

      // Step 4: Create user document in Firestore
      // This is the critical step that might be failing due to Firestore rules
      await setDoc(doc(db, "users", newUserAuth.uid), userProfileForFirestore);

      toast({
        title: "User Created",
        description: `User "${data.name}" has been successfully created in Auth and Firestore.`,
      });
      router.push('/admin/users');

    } catch (error: any) {
      console.error("Failed to create user:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      let errorTitle = "Error Creating User";

      if (error.name === "FirebaseError") { // Check if it's a FirebaseError
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email address is already in use by another account. Please use a different email.";
            errorTitle = "Email Already In Use";
            break;
          case 'auth/weak-password':
            errorMessage = "The password is too weak. Please choose a stronger password (at least 6 characters).";
            errorTitle = "Weak Password";
            break;
          case 'auth/invalid-email':
            errorMessage = "The email address is not valid. Please enter a correct email format.";
            errorTitle = "Invalid Email";
            break;
          // Firestore specific errors (though setDoc might not throw these directly in a way that's easy to catch by code here without more granular try-catch)
          // The "Missing or insufficient permissions" for Firestore usually comes from the operation itself failing, not from createUserWithEmailAndPassword
          case 'permission-denied': // This could be from Firestore if setDoc fails
             errorTitle = "Firestore Permission Denied";
             errorMessage = `Failed to save user profile to database for ${data.email}. User created in Auth, but profile not saved. Please check Firestore rules.`;
             // Potentially attempt to delete the Auth user if Firestore save fails, though this adds complexity.
             // if (newUserAuth) {
             //   try { await deleteUser(newUserAuth); } catch (delErr) { console.error("Failed to clean up Auth user after Firestore error", delErr); }
             // }
            break;
          default:
            errorMessage = `Firebase error (${error.code}): ${error.message}`;
        }
      } else {
        // Non-Firebase error
        errorMessage = error.message || "An unknown error occurred.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 9000, // Longer duration for more complex errors
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (adminUser && adminUser.role !== UserRole.SUPER_ADMIN && !isSubmitting) {
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
