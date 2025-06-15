
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
        addDebugMessage("Critical Error: handleSubmit called but adminUser is not Super Admin or is null. This should be caught by useEffect.");
        toast({ title: "Error", description: "Current user is not authorized to create users. Please re-login as Super Admin.", variant: "destructive", duration: 10000 });
        setIsSubmitting(false);
        return;
    }

    if (!data.password) {
        addDebugMessage("Password is required error triggered.");
        toast({ title: "Error", description: "Password is required to create a new user.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    let newUserAuth: FirebaseUser | null = null;
    const originalAdminUID = adminUser.id; // Capture admin UID before Auth state changes

    try {
      addDebugMessage("Step 1: Attempting to create user in Firebase Authentication...");
      // IMPORTANT: createUserWithEmailAndPassword will sign in the new user, changing auth.currentUser
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      newUserAuth = userCredential.user;
      addDebugMessage(`Step 1 Success: Auth user created. UID: ${newUserAuth.uid}, Email: ${newUserAuth.email}. Current auth.currentUser is now this new user.`);

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
      await updateProfile(newUserAuth, { displayName: data.name, photoURL: userAvatar });
      addDebugMessage("Step 3 Success: Firebase Auth profile updated for new user.");

      // CRITICAL STEP: Create Firestore document. This relies on Firestore Rules allowing
      // the 'originalAdminUID' (Super Admin) to create a document for 'newUserAuth.uid'.
      // However, auth.currentUser is now newUserAuth. This means the Firestore Rules for 'create'
      // on /users/{userId} must correctly identify the *actual* authenticated user (which is now the new user)
      // if it's based on request.auth.uid. Our rule `allow create: if isSuperAdmin()` uses request.auth.uid.
      // This operation will likely fail if executed by the new user unless they are also Super Admin (which they are not here).
      // This is a fundamental limitation of client-side user creation by an admin.
      
      addDebugMessage(`Step 4: Attempting to create user document in Firestore for UID: ${newUserAuth.uid}. The current Firebase SDK auth state is for this new user (UID: ${auth.currentUser?.uid}). Firestore rules will evaluate based on THIS user's token.`);
      
      try {
        // This setDoc will be attempted by the NEWLY CREATED AND SIGNED-IN USER.
        // For this to succeed with `allow create: if isSuperAdmin()`, the new user would have to be a super admin.
        // This will fail if the new user is Sub Admin.
        // If it fails, AuthContext will also try to create a doc when onAuthStateChanged runs for the new user.
        await setDoc(doc(db, "users", newUserAuth.uid), userProfileForFirestore);
        addDebugMessage(`Step 4 Success: Firestore document created for UID ${newUserAuth.uid}. This might indicate permissive rules or the new user coincidentally had rights.`);
        toast({
            title: "User Created (Auth & Firestore)",
            description: `User "${data.name}" created. Auth user is now signed in. Redirecting...`,
            duration: 7000,
        });
      } catch (firestoreError: any) {
          addDebugMessage(`Step 4 FAILED: Firestore document creation for UID ${newUserAuth.uid} failed. Error Code: ${firestoreError.code}, Message: ${firestoreError.message}`);
          if (firestoreError.code === 'permission-denied') {
              toast({
                title: "Firestore Write Failed (Permission Denied)",
                description: `Auth user "${data.name}" created, but saving profile to Firestore failed due to permissions. The active session is now the new user. A Super Admin might need to manually set the role in Firestore if the default creation by AuthContext also fails.`,
                variant: "destructive",
                duration: 20000,
              });
          } else {
              toast({
                title: "Firestore Write Failed",
                description: `Auth user "${data.name}" created, but saving profile to Firestore failed: ${firestoreError.message}`,
                variant: "destructive",
                duration: 20000,
              });
          }
      }
      // Redirect. AuthContext and AdminLayout will handle if the new user (now current) has access.
      // If not, they will be redirected to login. This is expected client-side behavior.
      router.push('/admin/dashboard'); 

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
          // Other auth errors...
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
      // Do not redirect on auth error, stay on page.
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
