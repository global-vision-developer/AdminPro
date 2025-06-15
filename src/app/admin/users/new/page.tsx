
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
      addDebugMessage(`Access Denied. Current role: ${adminUser.role}. Redirecting.`);
      toast({ title: "Access Denied", description: "You do not have permission to add users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [adminUser, router, toast, addDebugMessage]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    addDebugMessage(`handleSubmit called with email: ${data.email}`);
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
      addDebugMessage(`Step 1 Success: Auth user created. UID: ${newUserAuth.uid}`);

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
      addDebugMessage(`Step 2 Success: Firestore profile data prepared: ${JSON.stringify(userProfileForFirestore)}`);
      
      addDebugMessage("Step 3: Attempting to update Firebase Auth profile (displayName, photoURL)...");
      await updateProfile(newUserAuth, {
          displayName: data.name,
          photoURL: userAvatar
      });
      addDebugMessage("Step 3 Success: Firebase Auth profile updated.");

      addDebugMessage(`Step 4: Attempting to create user document in Firestore for UID: ${newUserAuth.uid}...`);
      await setDoc(doc(db, "users", newUserAuth.uid), userProfileForFirestore);
      addDebugMessage("Step 4 Success: Firestore document created.");

      toast({
        title: "User Created",
        description: `User "${data.name}" has been successfully created in Auth and Firestore.`,
      });
      router.push('/admin/users');

    } catch (error: any) {
      addDebugMessage(`Error during user creation process: Name: ${error.name}, Code: ${error.code}, Message: ${error.message}`);
      console.error("Failed to create user:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      let errorTitle = "Error Creating User";

      if (error.name === "FirebaseError") { 
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
          // This case is for Firestore permission denied AFTER auth user is created
          case 'permission-denied': 
             errorTitle = "Firestore Permission Denied";
             errorMessage = `Failed to save user profile to database for ${data.email}. User might be created in Auth, but profile not saved. Please check Firestore rules for 'create' on '/users/{userId}'.`;
             if (newUserAuth) {
               errorMessage += ` Auth User UID: ${newUserAuth.uid}.`;
               addDebugMessage(`Firestore permission-denied for UID ${newUserAuth.uid} after Auth success.`);
             } else {
               addDebugMessage(`Firestore permission-denied, and newUserAuth object is null. This might be an Auth error re-interpreted or Firestore rules for a different operation.`);
             }
            break;
          default:
            errorMessage = `Firebase error (${error.code}): ${error.message}`;
        }
      } else {
        errorMessage = error.message || "An unknown error occurred.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 9000, 
      });
    } finally {
        setIsSubmitting(false);
        addDebugMessage("handleSubmit finished.");
    }
  };
  
  if (adminUser && adminUser.role !== UserRole.SUPER_ADMIN && !isSubmitting) {
     // This state should ideally not be reached if routing from useEffect works
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
            <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto">{debugMessages.join("\n")}</pre>
        </CardContent>
      </Card>
    </>
  );
}
