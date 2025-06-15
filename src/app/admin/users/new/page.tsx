
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { auth } from '@/lib/firebase'; // db removed as we are not writing to Firestore here
import { createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut } from 'firebase/auth';
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

    let newUserAuth;
    try {
      addDebugMessage("Step 1: Attempting to create user in Firebase Authentication...");
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      newUserAuth = userCredential.user;
      addDebugMessage(`Step 1 Success: Auth user created. UID: ${newUserAuth.uid}, Email: ${newUserAuth.email}.`);
      
      addDebugMessage("Step 2: Attempting to update Firebase Auth profile (displayName, photoURL) for new user...");
      const photoURL = `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
      await updateProfile(newUserAuth, { displayName: data.name, photoURL: photoURL });
      addDebugMessage("Step 2 Success: Firebase Auth profile updated for new user.");

      addDebugMessage("Step 3: Firestore document creation for the new user is SKIPPED in NewUserPage.tsx. It will be handled on the new user's first login via AuthContext, or by an admin manually.");

      toast({
        title: "User Authentication Created",
        description: `User "${data.name}" (${data.email}) created in Firebase Auth. Auth state has now switched to this new user. You might be redirected if this new user lacks permissions for the current page.`,
        duration: 10000,
      });
      
      addDebugMessage("Step 4: Navigating to /admin/users. The AuthContext will now reflect the new user. If they are not an admin, AdminLayout will redirect them.");
      router.push('/admin/users'); // Navigate away. AdminLayout will handle redirect if new user has no permission.

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
    // This check might be too late if auth state already switched
    return (
      <div className="p-4">
        <p>Access Denied. You do not have permission to view this page.</p>
         <Card className="mt-4">
          <CardHeader><CardTitle className="text-sm font-headline">Debug Information (Access Denied State)</CardTitle></CardHeader>
          <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre></CardContent>
        </Card>
      </div>
    );
  }
  
  if (!adminUser && !adminAuthLoading) {
     // This state occurs if admin was signed out, or if new user session is active but not yet processed by AuthContext fully
     return (
      <div className="p-4">
        <p>Admin user not authenticated or session has changed. Redirecting to login might be in progress...</p>
         <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm font-headline">Debug Information (No Admin User State)</CardTitle></CardHeader>
            <CardContent><pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap break-all">{debugMessages.join("\n")}</pre></CardContent>
        </Card>
      </div>);
  }

  return (
    <>
      <PageHeader
        title="Add New User"
        description="Create a new user account. Firestore document will be created upon the new user's first login."
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
    