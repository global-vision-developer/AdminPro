
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
  const { currentUser: adminUser, loading: adminAuthLoading } = useAuth(); // Get admin's auth loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const addDebugMessage = useCallback((message: string) => {
    console.log("DEBUG (NewUserPage):", message);
    setDebugMessages(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);


  useEffect(() => {
    // Wait for admin auth state to resolve before checking role
    if (!adminAuthLoading && adminUser && adminUser.role !== UserRole.SUPER_ADMIN) {
      addDebugMessage(`Access Denied. Current admin role: ${adminUser.role}. Redirecting.`);
      toast({ title: "Access Denied", description: "You do not have permission to add users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [adminUser, adminAuthLoading, router, toast, addDebugMessage]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    addDebugMessage(`handleSubmit called with email: ${data.email} by admin: ${adminUser?.email} (Role: ${adminUser?.role}, UID: ${adminUser?.id})`);
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
      // The admin's session in *this client* is temporarily replaced.
      // The Firestore rules use request.auth which *should* still be the admin's original token for the write.

      addDebugMessage("Step 2: Preparing user profile for Firestore...");
      const userAvatar = `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
      const userProfileForFirestore: Omit<UserProfile, 'id'> & { createdAt: any, updatedAt: any, uid: string } = {
        uid: newUserAuth.uid, // Ensure UID is part of the Firestore document
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

      addDebugMessage(`Step 4: Attempting to create user document in Firestore for UID: ${newUserAuth.uid}... (Admin: ${adminUser?.email}, Admin Role: ${adminUser?.role}, Admin UID: ${adminUser?.id})`);
      await setDoc(doc(db, "users", newUserAuth.uid), userProfileForFirestore);
      addDebugMessage(`Step 4 Success: Firestore document created for UID ${newUserAuth.uid}.`);

      toast({
        title: "User Created Successfully",
        description: `User "${data.name}" has been created in Auth and Firestore. Redirecting to user list...`,
      });
      router.push('/admin/users'); // Redirect admin to users list

    } catch (error: any) {
      addDebugMessage(`Error during user creation process: Name: ${error.name}, Code: ${error.code}, Message: ${error.message}`);
      console.error("Failed to create user:", error); 
      
      let errorTitle = "Error Creating User";
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.name === "FirebaseError") { 
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorTitle = "Email Already In Use";
            errorMessage = "This email address is already in use by another account. Please use a different email.";
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
          case 'PERMISSION_DENIED': // Firestore sometimes returns this
             errorTitle = "Firestore Permission Denied";
             errorMessage = `Failed to save user profile to Firestore for ${data.email}. The currently logged-in admin (${adminUser?.email}, UID: ${adminUser?.id}) likely lacks permission. CRITICAL: 1. Verify Firestore Security Rules allow 'create' on '/users/{newUserId}' for Super Admins. 2. Ensure the admin user's document in Firestore (/users/${adminUser?.id}) has 'role: "Super Admin"'.`;
             if (newUserAuth) {
               errorMessage += ` Auth User UID: ${newUserAuth.uid} was created in Auth but Firestore profile save failed. Manual cleanup in Firebase Auth might be needed if profile cannot be saved.`;
               addDebugMessage(`Firestore permission-denied for creating doc for UID ${newUserAuth.uid}. Admin UID: ${adminUser?.id}, Admin Role from context: ${adminUser?.role}.`);
             } else {
               addDebugMessage(`Firestore permission-denied, and newUserAuth object is null. This might be an Auth error re-interpreted or Firestore rules for a different operation.`);
             }
            break;
          default:
            errorMessage = `Firebase error (${error.code}): ${error.message}`;
            if (newUserAuth && error.code !== 'auth/email-already-in-use' && error.code !== 'auth/weak-password' && error.code !== 'auth/invalid-email') {
                errorMessage += ` Auth User UID: ${newUserAuth.uid} was created but another error occurred. Check logs.`;
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
        duration: 20000, // Longer duration for important errors
      });
    } finally {
        setIsSubmitting(false);
        addDebugMessage("handleSubmit finished.");
        // IMPORTANT: Do not sign out the new user or try to re-sign in the admin here manually
        // as it can lead to complex race conditions with onAuthStateChanged.
        // The AdminLayout and AuthContext should handle the auth state after redirection.
    }
  };
  
  if (adminAuthLoading) {
    return <div className="p-4"><p>Loading admin authentication...</p></div>;
  }
  
  if (!adminAuthLoading && adminUser && adminUser.role !== UserRole.SUPER_ADMIN && !isSubmitting) {
     // This case should ideally be caught by useEffect redirect, but as a fallback render.
    return (
        <div className="p-4">
            <p>Access Denied. You do not have permission to view this page.</p>
             <Card className="mt-4">
                <CardHeader><CardTitle className="text-sm font-headline">Debug Information (Access Denied)</CardTitle></CardHeader>
                <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto">{debugMessages.join("\n")}</pre></CardContent>
            </Card>
        </div>
    );
  }
  
  if (!adminUser && !adminAuthLoading) {
    return (
      <div className="p-4">
        <p>Admin user not authenticated. Redirecting to login might be in progress...</p>
        <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm font-headline">Debug Information (No Admin User)</CardTitle></CardHeader>
            <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto">{debugMessages.join("\n")}</pre></CardContent>
        </Card>
      </div>);
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
