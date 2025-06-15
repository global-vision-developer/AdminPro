
"use client";

import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  // createUserWithEmailAndPassword, // No longer creating user from login page
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Import db from Firebase config
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; // Firestore imports

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, password: string) => Promise<void>; // name parameter removed
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          let userRole: UserRole = UserRole.SUB_ADMIN; // Default role
          let profileName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
          let profileAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(profileName).substring(0,2).toUpperCase()}`;
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userRole = userData.role as UserRole || UserRole.SUB_ADMIN; 
            profileName = userData.name || profileName; 
            profileAvatar = userData.avatar || profileAvatar;

            if (firebaseUser.displayName !== profileName || firebaseUser.photoURL !== profileAvatar) {
              // Ensure Firebase Auth profile is up-to-date with Firestore data (name/avatar) if it was changed in Firestore
              try {
                  await updateProfile(firebaseUser, { displayName: profileName, photoURL: profileAvatar });
              } catch (profileUpdateError) {
                  console.warn("Could not update Firebase Auth profile:", profileUpdateError);
                  // Non-critical, proceed with Firestore data
              }
            }
          } else {
            // Document doesn't exist, create it for new user (e.g., created via Admin Panel, or first time Firebase Auth user logs into this app)
            // Note: User creation from login page is removed, so this branch is for users created elsewhere.
            const nameForDoc = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
            const avatarForDoc = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${nameForDoc.substring(0,2).toUpperCase()}`;
            
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: nameForDoc,
              role: userRole, // Default role (SUB_ADMIN)
              avatar: avatarForDoc,
              createdAt: serverTimestamp(), // Use server timestamp
              updatedAt: serverTimestamp(),
            });
            profileName = nameForDoc;
            profileAvatar = avatarForDoc;
          }

          const userProfile: UserProfile = {
            id: firebaseUser.uid,
            name: profileName,
            email: firebaseUser.email || '',
            role: userRole,
            avatar: profileAvatar,
          };
          setCurrentUser(userProfile);
        } catch (error) {
          console.error("Error fetching/setting user data from Firestore:", error);
          toast({ title: "Алдаа гарлаа", description: "Хэрэглэгчийн эрх, мэдээллийг Firestore-оос уншихад/хадгалахад алдаа гарлаа.", variant: "destructive" });
          setCurrentUser(null);
          try {
            await firebaseSignOut(auth);
          } catch (signOutError) {
            console.error("Error signing out after Firestore error:", signOutError);
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Login function now only accepts email and password, and only attempts to sign in.
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and Firestore interaction
      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error("Firebase login error:", error);
      let friendlyMessage = "Нэвтрэхэд алдаа гарлаа. Таны имэйл эсвэл нууц үг буруу байна.";
      if (error.code === 'auth/user-not-found') {
        friendlyMessage = "Хэрэглэгч олдсонгүй. Бүртгэлтэй имэйл хаягаа оруулна уу.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        friendlyMessage = "Имэйл эсвэл нууц үг буруу байна.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Хэт олон удаагийн буруу оролдлого. Түр хүлээгээд дахин оролдоно уу.";
      } else if (error.message) {
        friendlyMessage = error.message;
      }
      toast({ title: "Нэвтрэхэд алдаа гарлаа", description: friendlyMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null); 
      router.push('/');
    } catch (error: any) {
      console.error("Firebase logout error:", error);
      toast({ title: "Гарахад алдаа гарлаа", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
