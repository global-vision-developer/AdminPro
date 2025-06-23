
"use client";

import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, password: string) => Promise<void>; 
  logout: () => Promise<void>;
  loading: boolean;
}

const ADMINS_COLLECTION = "admins";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserLocal] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, ADMINS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          let userRoleFromFirestore: UserRole = UserRole.SUB_ADMIN; 
          let profileName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin User';
          let profileAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(profileName).substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
          let allowedCategoryIdsFromFirestore: string[] = [];
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userRoleFromFirestore = userData.role as UserRole || UserRole.SUB_ADMIN; 
            profileName = userData.name || profileName; 
            profileAvatar = userData.avatar || profileAvatar;
            if (userRoleFromFirestore === UserRole.SUB_ADMIN) {
              allowedCategoryIdsFromFirestore = Array.isArray(userData.allowedCategoryIds) ? userData.allowedCategoryIds : [];
            }

            if (firebaseUser.displayName !== profileName || firebaseUser.photoURL !== profileAvatar) {
              try {
                  await updateProfile(firebaseUser, { displayName: profileName, photoURL: profileAvatar });
              } catch (profileUpdateError) {
                  console.warn(`AuthContext: Could not update Firebase Auth profile for ${firebaseUser.uid}:`, profileUpdateError);
              }
            }
          } else {
            const nameForDoc = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New Admin';
            const avatarForDoc = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${nameForDoc.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
            
            try {
              const newFirestoreDocData: any = { 
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: nameForDoc,
                role: UserRole.SUB_ADMIN, 
                avatar: avatarForDoc,
                createdAt: serverTimestamp(), 
                updatedAt: serverTimestamp(),
              };
              if (newFirestoreDocData.role === UserRole.SUB_ADMIN) {
                newFirestoreDocData.allowedCategoryIds = []; 
              }

              await setDoc(userDocRef, newFirestoreDocData);
              profileName = nameForDoc;
              profileAvatar = avatarForDoc;
              userRoleFromFirestore = UserRole.SUB_ADMIN; 
              allowedCategoryIdsFromFirestore = [];
              toast({title: "Admin Profile Initialized", description: `Your admin profile has been initialized in Firestore with role ${userRoleFromFirestore}.`, duration: 7000});
            } catch (firestoreSetError: any) {
                console.error(`AuthContext: FAILED to create Firestore document in '${ADMINS_COLLECTION}' for admin ${firebaseUser.uid}. Error:`, firestoreSetError);
                toast({ 
                    title: "Firestore Admin Profile Creation Error", 
                    description: `Admin account ${firebaseUser.email} exists in Auth, but failed to create Firestore profile in '${ADMINS_COLLECTION}'. Error: ${firestoreSetError.message}. Admin rights assignment might be needed. Displaying default access.`, 
                    variant: "destructive", 
                    duration: 20000 
                });
            }
          }

          const userProfile: UserProfile = {
            id: firebaseUser.uid,
            name: profileName,
            email: firebaseUser.email || '',
            role: userRoleFromFirestore, 
            avatar: profileAvatar,
            ...(userRoleFromFirestore === UserRole.SUB_ADMIN && { allowedCategoryIds: allowedCategoryIdsFromFirestore }),
          };
          setCurrentUserLocal(userProfile);

        } catch (error: any) {
          console.error(`AuthContext: Critical error processing admin data from Firestore ('${ADMINS_COLLECTION}') for UID ${firebaseUser.uid}. Error:`, error);
          let firestoreErrorMsg = "Error reading/saving admin role/data from Firestore. You might not have permissions or there's a system issue.";
          if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission-denied'))) {
            firestoreErrorMsg = `Firestore Permission Denied: Cannot read/save admin data from '${ADMINS_COLLECTION}'. Check Firestore Rules and the 'role' field in your logged-in admin's document within '${ADMINS_COLLECTION}'. Error: ${error.message}`;
          } else if (error.name === 'FirebaseError') {
             firestoreErrorMsg = `Firebase Firestore Error (code: ${error.code}): ${error.message}. UID: ${firebaseUser.uid}`;
          }
          toast({ title: "Error (AuthContext)", description: firestoreErrorMsg, variant: "destructive", duration: 20000 });
          setCurrentUserLocal(null); 
        }
      } else {
        setCurrentUserLocal(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    }
  }, [toast]); 

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("AuthContext: Firebase login error:", error);
      let friendlyMessage = "Login failed. Please check your email or password.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        friendlyMessage = "User not found or email is invalid. Please check your registered email address.";
      } else if (error.code === 'auth/wrong-password') {
        friendlyMessage = "Incorrect password. Please check your password.";
      } else if (error.code === 'auth/invalid-credential') {
        friendlyMessage = "Invalid email or password. Please ensure you have created a user in your Firebase project Authentication section and that Email/Password sign-in method is enabled.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Too many failed login attempts. Please try again later.";
      } else if (error.message) {
        friendlyMessage = `Error: ${error.message} (Code: ${error.code})`;
      }
      toast({ title: "Login Failed", description: friendlyMessage, variant: "destructive", duration: 10000 });
      setLoading(false); 
    }
  }, [toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
      toast({ title: "Logged Out", description: "You have been successfully logged out.", duration: 3000});
    } catch (error: any) {
      console.error("AuthContext: Firebase logout error:", error);
      toast({ title: "Logout Error", description: error.message, variant: "destructive" });
    }
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ currentUser: currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
