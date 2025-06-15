
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
// import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Temporarily removed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUser, loading: adminAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const addDebugMessage = useCallback((message: string) => {
    console.log("DEBUG (NewUserPage):", message);
    setDebugMessages(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  useEffect(() => {
    if (!adminAuthLoading && adminUser && adminUser.role !== UserRole.SUPER_ADMIN) {
      addDebugMessage(`Access Denied. Current admin role: ${adminUser.role}. Redirecting.`);
      toast({ title: "Access Denied", description: "You do not have permission to add users.", variant: "destructive" });
      router.push('/admin/dashboard');
    }
  }, [adminUser, adminAuthLoading, router, toast, addDebugMessage]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    addDebugMessage(`handleSubmit called with email: ${data.email}. Admin context: ${adminUser?.email} (Role: ${adminUser?.role}, UID: ${adminUser?.id})`);

    if (!adminUser || adminUser.role !== UserRole.SUPER_ADMIN) {
      addDebugMessage("Critical Error: handleSubmit called but adminUser is not Super Admin or is null.");
      toast({ title: "Authorization Error", description: "Current user is not authorized to create users. Please re-login as Super Admin.", variant: "destructive", duration: 7000 });
      setIsSubmitting(false);
      return;
    }

    if (!data.password) {
      addDebugMessage("Password is required error triggered.");
      toast({ title: "Validation Error", description: "Password is required to create a new user.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      addDebugMessage("Step 1: Attempting to create user in Firebase Authentication...");
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUserAuth = userCredential.user;
      addDebugMessage(`Step 1 Success: Auth user created. UID: ${newUserAuth.uid}, Email: ${newUserAuth.email}.`);
      
      toast({
        title: "User Authentication Created",
        description: `User "${data.name}" (${data.email}) has been created in Firebase Authentication.`,
        duration: 5000,
      });

      // Firestore document creation for the new user is deferred.
      // AuthContext will attempt to create a basic doc when the new user eventually logs in.
      // Or an admin can create/update it via User Management if they can list users.
      addDebugMessage("Step 2: Firestore document creation for new user is deferred.");

      addDebugMessage("Step 3: Signing out the newly created user session to restore admin control flow...");
      await firebaseSignOut(auth); // This signs out the NEWLY created user
      addDebugMessage("Step 3 Success: New user session signed out.");

      toast({
        title: "Admin Session Management",
        description: "New user created. You've been signed out to ensure session integrity. Please log in again to continue.",
        variant: "default",
        duration: 10000,
      });
      
      router.push('/'); // Redirect admin to login page

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
            errorMessage = "The password is too weak. Please use a stronger password.";
            break;
          default:
            errorMessage = `Firebase Auth error (${error.code}): ${error.message}`;
        }
      } else {
        errorMessage = error.message || "An unknown error occurred.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
      addDebugMessage("handleSubmit finished.");
    }
  };

  if (adminAuthLoading) {
    return <div className="p-4"><p>Loading admin authentication...</p></div>;
  }

  if (!adminAuthLoading && adminUser && adminUser.role !== UserRole.SUPER_ADMIN && !isSubmitting) {
    // This should ideally not be reached if useEffect redirects.
    return (
      <div className="p-4">
        <p>Access Denied. You do not have permission to view this page.</p>
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-sm font-headline">Debug Information (Access Denied)</CardTitle></CardHeader>
          <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre></CardContent>
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
            <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre></CardContent>
        </Card>
      </div>);
  }

  return (
    <>
      <PageHeader
        title="Add New User"
        description="Create a new administrator account. You will be asked to log in again after creation."
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
