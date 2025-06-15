
"use client";

import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Import db from Firebase config
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Firestore imports

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, password_or_name?: string, optional_name_for_signup?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Эрх хуваарилалт Firestore-оос хийгдэнэ.
// Шинээр бүртгүүлсэн хэрэглэгчид анхдагчаар SUB_ADMIN эрхтэй болно.
// SUPER_ADMIN эрхийг Firestore-д гараар тохируулж өгнө.
// Жишээ: Firestore-д 'users/{uid}' document дотор 'role': 'Super Admin' гэж хадгална.

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
            userRole = userData.role as UserRole || UserRole.SUB_ADMIN; // Use Firestore role
            profileName = userData.name || profileName; // Prefer Firestore name
            profileAvatar = userData.avatar || profileAvatar; // Prefer Firestore avatar

            // Ensure Firebase Auth profile is up-to-date with Firestore data
            if (firebaseUser.displayName !== profileName || firebaseUser.photoURL !== profileAvatar) {
              await updateProfile(firebaseUser, { displayName: profileName, photoURL: profileAvatar });
            }
          } else {
            // Document doesn't exist, create it for new user or first-time setup for existing auth user
            const nameForDoc = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
            const avatarForDoc = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${nameForDoc.substring(0,2).toUpperCase()}`;
            
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: nameForDoc,
              role: userRole, // Default role (SUB_ADMIN)
              avatar: avatarForDoc,
              createdAt: new Date().toISOString(),
            });
            // Update local vars for UserProfile object that will be set
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
          // Fallback or force logout
          setCurrentUser(null);
          await firebaseSignOut(auth); // Optional: force logout on critical error
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]); // Added toast to dependency array

  const login = useCallback(async (email: string, password?: string, name?: string) => {
    if (!password) {
      toast({ title: "Нууц үг оруулаагүй байна", description: "Нэвтрэхийн тулд нууц үгээ оруулна уу.", variant: "destructive"});
      setLoading(false); // Ensure loading is false if we return early
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and Firestore interaction
      router.push('/admin/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (userCredential.user) {
            const displayName = name || email.split('@')[0];
            const photoURL = `https://placehold.co/100x100.png?text=${(displayName).substring(0,2).toUpperCase()}`;
            await updateProfile(userCredential.user, { displayName, photoURL });
            // onAuthStateChanged will now handle creating the Firestore document with default SUB_ADMIN role
            toast({ title: "Бүртгэл амжилттай", description: `${displayName} нэрээр шинэ хэрэглэгч үүслээ.` });
          }
          router.push('/admin/dashboard');
        } catch (creationError: any) {
          console.error("Firebase user creation error:", creationError);
          toast({ title: "Бүртгэл үүсгэхэд алдаа гарлаа", description: creationError.message, variant: "destructive" });
        }
      } else {
        console.error("Firebase login error:", error);
        let friendlyMessage = "Нэвтрэхэд алдаа гарлаа. Таны имэйл эсвэл нууц үг буруу байж магадгүй.";
        if (error.code === 'auth/too-many-requests') {
            friendlyMessage = "Хэт олон удаагийн буруу оролдлого. Түр хүлээгээд дахин оролдоно уу."
        } else if (error.message) {
            friendlyMessage = error.message;
        }
        toast({ title: "Нэвтрэхэд алдаа гарлаа", description: friendlyMessage, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null); // Explicitly set current user to null
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
