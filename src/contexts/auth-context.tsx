
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
import { auth } from '@/lib/firebase'; // Import your Firebase auth instance
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, password_or_name?: string, optional_name_for_signup?: string) => Promise<void>; // password can be optional if we allow magic links later
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Эрх хуваарилалт:
// Та энд нэмэлт имэйл хаягуудыг нэмж, тодорхой эрх оноож болно.
// Энд жагсаагдаагүй хэрэглэгчид нэвтрэх/бүртгүүлэх үед анхдагчаар SUB_ADMIN эрхтэй болно.
const initialMockRoles: Record<string, UserRole> = {
  'super@example.com': UserRole.SUPER_ADMIN,
  'sub@example.com': UserRole.SUB_ADMIN,
  // Жишээ: Өөр super admin нэмэх:
  // 'another-super-admin@example.com': UserRole.SUPER_ADMIN, 
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const role = initialMockRoles[firebaseUser.email?.toLowerCase() || ''] || UserRole.SUB_ADMIN;
        const userProfile: UserProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: role,
          avatar: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || firebaseUser.email || 'U').substring(0,2).toUpperCase()}`,
        };
        setCurrentUser(userProfile);
        localStorage.setItem('currentUser', JSON.stringify(userProfile)); // For persistence if needed, though onAuthStateChanged is primary
      } else {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password?: string, name?: string) => {
    if (!password) {
      toast({ title: "Нууц үг оруулаагүй байна", description: "Нэвтрэхийн тулд нууц үгээ оруулна уу.", variant: "destructive"});
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
      router.push('/admin/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (userCredential.user) {
            await updateProfile(userCredential.user, {
              displayName: name || email.split('@')[0],
              photoURL: `https://placehold.co/100x100.png?text=${(name || email).substring(0,2).toUpperCase()}`
            });
             // Reload the user to get the updated profile information
            await userCredential.user.reload();

            // onAuthStateChanged will set the user. Manually creating profile for immediate use might be an option.
             const role = initialMockRoles[userCredential.user.email?.toLowerCase() || ''] || UserRole.SUB_ADMIN;
             const userProfile: UserProfile = {
                id: userCredential.user.uid,
                name: userCredential.user.displayName || name || userCredential.user.email?.split('@')[0] || 'User',
                email: userCredential.user.email || '',
                role: role,
                avatar: userCredential.user.photoURL || `https://placehold.co/100x100.png?text=${(name || userCredential.user.email || 'U').substring(0,2).toUpperCase()}`,
              };
            setCurrentUser(userProfile); // Set user immediately after creation
            localStorage.setItem('currentUser', JSON.stringify(userProfile));

            toast({ title: "Бүртгэл амжилттай", description: `${name || email} нэрээр шинэ хэрэглэгч үүслээ.` });
          }
          router.push('/admin/dashboard');
        } catch (creationError: any) {
          console.error("Firebase user creation error:", creationError);
          toast({ title: "Бүртгэл үүсгэхэд алдаа гарлаа", description: creationError.message, variant: "destructive" });
        }
      } else {
        console.error("Firebase login error:", error);
        toast({ title: "Нэвтрэхэд алдаа гарлаа", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle clearing user
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
