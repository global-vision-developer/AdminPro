
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, type UserProfile } from '@/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const addDebugMessage = useCallback((message: string) => {
    console.log("DEBUG (NewUserPage):", message);
    setDebugMessages(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);


  useEffect(() => {
    if (adminUser && adminUser.role !== UserRole.SUPER_ADMIN) {
      addDebugMessage(`Access Denied. Current admin role: ${adminUser.role}. Redirecting.`);
      toast({ title: "Access Denied", description: "You do not have permission to add users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [adminUser, router, toast, addDebugMessage]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    addDebugMessage(`handleSubmit called with email: ${data.email} by admin: ${adminUser?.email} (Role: ${adminUser?.role})`);
    if (!data.password) {
        addDebugMessage("Password is required error triggered.");
        toast({ title: "Error", description: "Password is required to create a new user.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    let newUserAuth: FirebaseUser | null = null;

    try {
      addDebugMessage("Step 1: Attempting to create user in Firebase Authentication...");
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      newUserAuth = userCredential.user;
      addDebugMessage(`Step 1 Success: Auth user created. UID: ${newUserAuth.uid}, Email: ${newUserAuth.email}`);

      // Note: createUserWithEmailAndPassword signs in the new user.
      // We will redirect the admin, and the admin's session should persist.
      // The new user won't be using this client session immediately.

      addDebugMessage("Step 2: Preparing user profile for Firestore...");
      const userAvatar = `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
      const userProfileForFirestore: Omit<UserProfile, 'id'> & { createdAt: any, updatedAt: any, uid: string } = {
        uid: newUserAuth.uid,
        name: data.name,
        email: data.email,
        role: data.role, 
        avatar: userAvatar,
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };
      addDebugMessage(`Step 2 Success: Firestore profile data prepared for UID ${newUserAuth.uid}: ${JSON.stringify(userProfileForFirestore)}`);
      
      addDebugMessage("Step 3: Attempting to update Firebase Auth profile (displayName, photoURL) for new user...");
      await updateProfile(newUserAuth, {
          displayName: data.name,
          photoURL: userAvatar
      });
      addDebugMessage("Step 3 Success: Firebase Auth profile updated for new user.");

      addDebugMessage(`Step 4: Attempting to create user document in Firestore for UID: ${newUserAuth.uid}... (Admin: ${adminUser?.email}, Admin Role: ${adminUser?.role})`);
      await setDoc(doc(db, "users", newUserAuth.uid), userProfileForFirestore);
      addDebugMessage(`Step 4 Success: Firestore document created for UID ${newUserAuth.uid}.`);

      toast({
        title: "User Created Successfully",
        description: `User "${data.name}" has been created in Auth and Firestore.`,
      });
      router.push('/admin/users'); // Redirect admin to users list

    } catch (error: any) {
      addDebugMessage(`Error during user creation process: Name: ${error.name}, Code: ${error.code}, Message: ${error.message}`);
      console.error("Failed to create user:", error); // Keep detailed console log
      
      let errorTitle = "Error Creating User";
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.name === "FirebaseError") { 
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorTitle = "Email Already In Use";
            errorMessage = "This email address is already in use by another account. Please use a different email.";
            // No need to clean up Auth user here as it wasn't created if this error occurs early.
            break;
          case 'auth/weak-password':
            errorTitle = "Weak Password";
            errorMessage = "The password is too weak. Please choose a stronger password (at least 6 characters).";
            break;
          case 'auth/invalid-email':
            errorTitle = "Invalid Email";
            errorMessage = "The email address is not valid. Please enter a correct email format.";
            break;
          // This case is for Firestore permission denied AFTER auth user is created
          case 'permission-denied': 
             errorTitle = "Firestore Permission Denied";
             errorMessage = `Failed to save user profile to database for ${data.email}. User created in Auth, but profile not saved. Please check Firestore rules and ensure the logged-in admin (${adminUser?.email}) has a 'Super Admin' role in their Firestore document.`;
             if (newUserAuth) {
               errorMessage += ` Auth User UID: ${newUserAuth.uid} (may need manual cleanup in Firebase Auth if profile cannot be saved).`;
               addDebugMessage(`Firestore permission-denied for creating doc for UID ${newUserAuth.uid}. Admin UID: ${adminUser?.uid}, Admin Role: ${adminUser?.role}.`);
             } else {
               addDebugMessage(`Firestore permission-denied, and newUserAuth object is null. This might be an Auth error re-interpreted or Firestore rules for a different operation.`);
             }
            break;
          default:
            errorMessage = `Firebase error (${error.code}): ${error.message}`;
            if (newUserAuth && error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password' && error.code !== 'auth/invalid-email') {
                // If Auth user was created but another error occurred (e.g., during Firestore setDoc but not permission-denied explicitly caught)
                errorMessage += ` Auth User UID: ${newUserAuth.uid} was created but an error occurred. Check logs.`;
            }
        }
      } else {
        errorMessage = error.message || "An unknown error occurred.";
         if (newUserAuth) {
            errorMessage += ` Auth User UID: ${newUserAuth.uid} was created but an error occurred. Check logs.`;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 15000, // Longer duration for important errors
      });
    } finally {
        setIsSubmitting(false);
        addDebugMessage("handleSubmit finished.");
    }
  };
  
  if (adminUser && adminUser.role !== UserRole.SUPER_ADMIN && !isSubmitting) {
    return <div className="p-4"><p>Access Denied. Redirecting...</p> <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto">{debugMessages.join("\n")}</pre></div>;
  }

  return (
    <>
      <PageHeader
        title="Add New User"
        description="Create a new administrator account and assign a role."
      />
      <UserForm onSubmit={handleSubmit} isSubmitting={isSubmitting} isEditing={false} />
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-sm font-headline">Debug Information (New User Page)</CardTitle></CardHeader>
        <CardContent>
            <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre>
        </CardContent>
      </Card>
    </>
  );
}

    