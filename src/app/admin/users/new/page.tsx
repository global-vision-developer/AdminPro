
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ADMINS_COLLECTION = "admins";

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
    addDebugMessage(`handleSubmit called with email: ${data.email}. Role: ${data.role}. AllowedCategories: ${JSON.stringify(data.allowedCategoryIds)}. Admin performing action: ${adminUser?.email}`);

    if (!adminUser || adminUser.role !== UserRole.SUPER_ADMIN) {
      addDebugMessage("Critical Error: handleSubmit - adminUser is not Super Admin or is null.");
      toast({ title: "Authorization Error", description: "Not authorized to create users.", variant: "destructive", duration: 7000 });
      setIsSubmitting(false);
      return;
    }

    if (!data.password) {
      addDebugMessage("Password is required error.");
      toast({ title: "Validation Error", description: "Password is required.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    let newUserAuth;
    const currentSuperAdminAuthUID = auth.currentUser?.uid; 

    try {
      addDebugMessage("Step 1: Creating user in Firebase Authentication...");
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      newUserAuth = userCredential.user;
      addDebugMessage(`Step 1 Success: Auth user created. UID: ${newUserAuth.uid}, Email: ${newUserAuth.email}.`);
      
      const photoURL = `https://placehold.co/100x100.png?text=${data.name.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF` data-ai-hint="avatar person";
      addDebugMessage(`Step 2: Updating Firebase Auth profile for new user (displayName: ${data.name}, photoURL: ${photoURL})...`);
      await updateProfile(newUserAuth, { displayName: data.name, photoURL: photoURL });
      addDebugMessage("Step 2 Success: Firebase Auth profile updated for new user.");

      const adminDocRef = doc(db, ADMINS_COLLECTION, newUserAuth.uid);
      const firestoreAdminData: any = {
        uid: newUserAuth.uid,
        email: newUserAuth.email,
        name: data.name,
        role: data.role,
        avatar: photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (data.role === UserRole.SUB_ADMIN) {
        firestoreAdminData.allowedCategoryIds = data.allowedCategoryIds || [];
      }
      
      addDebugMessage(`Step 3: Creating Firestore document in '${ADMINS_COLLECTION}' for new admin UID: ${newUserAuth.uid}. Data: ${JSON.stringify(firestoreAdminData)}`);
      await setDoc(adminDocRef, firestoreAdminData);
      addDebugMessage("Step 3 Success: Firestore document created for new admin.");
      
      toast({
        title: "Admin User Created",
        description: `Admin user "${data.name}" (${data.email}) created in Auth and Firestore. Current session is for the new user. You may need to log out the new user and log back in as Super Admin.`,
        duration: 15000,
      });
      
      addDebugMessage(`Step 4: IMPORTANT - Current Firebase Auth session is now for the new user: ${newUserAuth.email}. The Super Admin who performed this action (${adminUser.email}) is effectively signed out of THIS browser session's Firebase Auth instance.`);
      
      router.push('/admin/users'); 
      addDebugMessage("Step 5: Navigated to /admin/users. AuthContext will now reflect the new user's session.");


    } catch (error: any) {
      addDebugMessage(`Error during user creation: Name: ${error.name}, Code: ${error.code}, Message: ${error.message}`);
      console.error("Failed to create user:", error);

      let errorTitle = "Error Creating User";
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.name === "FirebaseError") {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorTitle = "Email Already In Use";
            errorMessage = "This email address is already in use. Please use a different email.";
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

      if (currentSuperAdminAuthUID && auth.currentUser?.uid !== currentSuperAdminAuthUID) {
        addDebugMessage(`Error handling: Attempting to sign out current user (${auth.currentUser?.email}) and restore Super Admin session logic might be needed if an error occurred after new user auth creation.`);
         toast({
            title: "Session Management",
            description: "An error occurred. The current user session might have changed. Please log out and log back in if you are not the Super Admin.",
            variant: "default",
            duration: 15000
        });
      }

    } finally {
      setIsSubmitting(false);
      addDebugMessage("handleSubmit finished.");
    }
  };
  
  if (adminAuthLoading) {
    return <div className="p-4"><p>Loading admin authentication...</p></div>;
  }

  if (!adminAuthLoading && adminUser && adminUser.role !== UserRole.SUPER_ADMIN && !isSubmitting) {
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
        description="Create a new Firebase Authentication user and corresponding Firestore admin document." 
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
