
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { UserForm, type UserFormValues } from '../../components/user-form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { db, auth } from '@/lib/firebase'; // Import auth as well if needed for profile updates
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';


export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const { toast } = useToast();
  const { currentUser: adminUser } = useAuth(); // Renamed to avoid conflict
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (adminUser && adminUser.role !== UserRole.SUPER_ADMIN) {
      toast({ title: "Access Denied", description: "You do not have permission to edit users.", variant: "destructive" });
      router.push('/admin/dashboard');
      return;
    }
  }, [adminUser, router, toast]);

  const fetchUser = useCallback(async () => {
    if (!userId || (adminUser && adminUser.role !== UserRole.SUPER_ADMIN)) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        setUserToEdit({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
      } else {
        toast({ title: "Error", description: "User not found in Firestore.", variant: "destructive" });
        router.push('/admin/users');
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      toast({ title: "Error", description: "Failed to fetch user data.", variant: "destructive" });
      router.push('/admin/users');
    } finally {
      setIsLoading(false);
    }
  }, [userId, adminUser, router, toast]);
  
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);


  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    if (!userToEdit) return;

    // Prevent self-demotion/role change for super admin
    if (adminUser?.id === userToEdit.id && data.role !== UserRole.SUPER_ADMIN && adminUser.role === UserRole.SUPER_ADMIN) {
        toast({ title: "Action Prohibited", description: "Super Admins cannot change their own role or demote themselves.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    try {
      const userDocRef = doc(db, "users", userToEdit.id);
      const updateData: Partial<UserProfile> & { updatedAt: any } = {
        name: data.name,
        role: data.role,
        updatedAt: serverTimestamp(),
      };
      // Email is not editable in this form

      await updateDoc(userDocRef, updateData);
      
      // Attempt to update Firebase Auth display name if it changed
      // This is tricky as we need the FirebaseUser object for the user being edited, not the admin.
      // The auth.currentUser is the admin. For robust updates of other users' Auth profiles,
      // a Cloud Function is the recommended approach.
      // For now, we rely on the auth-context to sync name/avatar on the edited user's next login.
      if (userToEdit.name !== data.name) {
         console.warn("User's name updated in Firestore. Firebase Auth profile display name will update on their next login, or should be updated via a Cloud Function by an admin.");
         // If you wanted to try updating the specific user (requires re-authentication or admin privileges via Admin SDK in backend):
         // const userToUpdateAuth = ??? // Need to get the FirebaseUser object for userToEdit.id
         // if (userToUpdateAuth) { await updateAuthProfile(userToUpdateAuth, { displayName: data.name }); }
      }


      toast({
        title: "User Updated",
        description: `User "${data.name}" has been successfully updated in Firestore.`,
      });
      router.push('/admin/users');
    } catch (error) {
      console.error("Failed to update user:", error);
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (adminUser?.role !== UserRole.SUPER_ADMIN && !isLoading) {
    return <div className="p-4"><p>Access Denied. Redirecting...</p></div>;
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit User" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      </>
    );
  }

  if (!userToEdit) {
    // fetchUser should have redirected if not found, but as a fallback:
    return <PageHeader title="User Not Found" description="The user data could not be loaded or does not exist." />;
  }

  return (
    <>
      <PageHeader
        title={`Edit User: ${userToEdit.name}`}
        description="Update the user's details and role."
      />
      <UserForm initialData={userToEdit} onSubmit={handleSubmit} isSubmitting={isSubmitting} isEditing={true} />
    </>
  );
}
