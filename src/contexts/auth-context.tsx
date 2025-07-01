/**
 * @fileoverview This file defines the authentication context for the application.
 * It provides a `AuthProvider` component that wraps the application and handles all
 * authentication logic, including login, logout, and maintaining the current user's state.
 * The `useAuth` hook is used to access this context from any client component.
 * 
 * Энэ файл нь аппликейшны authentication-ий контекстийг тодорхойлдог.
 * Энэ нь `AuthProvider` компонентоор дамжуулан аппликейшныг бүхэлд нь ороож, нэвтрэх, гарах,
 * одоогийн хэрэглэгчийн төлөвийг хадгалах зэрэг бүх authentication-ий логикийг хариуцдаг.
 * `useAuth` hook нь энэ контекст рүү дурын клиент компонентоос хандах боломжийг олгодог.
 */
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
  updateCurrentUserProfile: (data: Partial<UserProfile>) => void;
}

const ADMINS_COLLECTION = "admins";

// Апп даяар хэрэглэгчийн мэдээллийг дамжуулах Context үүсгэх
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Аппликейшнийг бүхэлд нь ороож, authentication-ий логикийг удирдах Provider компонент
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserLocal] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Хэрэглэгчийн профайлын мэдээллийг (нэр, аватар) клиент талд шинэчлэх функц
  const updateCurrentUserProfile = useCallback((data: Partial<UserProfile>) => {
    setCurrentUserLocal(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, ...data };
    });
  }, []);

  // Firebase-ийн нэвтрэлтийн төлөв өөрчлөгдөх бүрт ажиллах useEffect
  // Энэ нь хэрэглэгч нэвтрэх, гарах үед автоматаар ажиллаж, `currentUser`-г тохируулна.
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Хэрэглэгч нэвтэрсэн бол Firestore-оос админы дэлгэрэнгүй мэдээллийг (эрх, зөвшөөрөл) авах
        const userDocRef = doc(db, ADMINS_COLLECTION, firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          let userRoleFromFirestore: UserRole = UserRole.SUB_ADMIN; 
          let profileName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin User';
          let profileAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(profileName).substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
          let allowedCategoryIdsFromFirestore: string[] = [];
          let canSendNotificationsFromFirestore = false;
          
          if (userDocSnap.exists()) {
            // Firestore-д админ бүртгэлтэй бол мэдээллийг нь ашиглах
            const userData = userDocSnap.data();
            userRoleFromFirestore = userData.role as UserRole || UserRole.SUB_ADMIN; 
            profileName = userData.name || profileName; 
            profileAvatar = userData.avatar || profileAvatar;
            
            if (userRoleFromFirestore === UserRole.SUPER_ADMIN) {
              allowedCategoryIdsFromFirestore = [];
              canSendNotificationsFromFirestore = true;
            } else { // SUB_ADMIN
              allowedCategoryIdsFromFirestore = Array.isArray(userData.allowedCategoryIds) ? userData.allowedCategoryIds : [];
              canSendNotificationsFromFirestore = userData.canSendNotifications === true;
            }

            // Firebase Auth болон Firestore-ийн мэдээллийг синхрончлох
            if (firebaseUser.displayName !== profileName || firebaseUser.photoURL !== profileAvatar) {
              try {
                  await updateProfile(firebaseUser, { displayName: profileName, photoURL: profileAvatar });
              } catch (profileUpdateError) {
                  console.warn(`AuthContext: Could not update Firebase Auth profile for ${firebaseUser.uid}:`, profileUpdateError);
              }
            }
          } else {
            // Хэрэв админ нь Firestore-д бүртгэлгүй бол анхны өгөгдлийг үүсгэх (жишээ нь, Social login-оор орж ирсэн)
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
                allowedCategoryIds: [],
                canSendNotifications: false, // Default for new users
              };

              await setDoc(userDocRef, newFirestoreDocData);
              profileName = nameForDoc;
              profileAvatar = avatarForDoc;
              userRoleFromFirestore = UserRole.SUB_ADMIN; 
              allowedCategoryIdsFromFirestore = [];
              canSendNotificationsFromFirestore = false;
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

          // Апп-д ашиглах хэрэглэгчийн эцсийн профайлыг бүрдүүлэх
          const userProfile: UserProfile = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: profileName,
            email: firebaseUser.email || '',
            role: userRoleFromFirestore, 
            avatar: profileAvatar,
            allowedCategoryIds: allowedCategoryIdsFromFirestore,
            canSendNotifications: canSendNotificationsFromFirestore,
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
        // Хэрэглэгч нэвтрээгүй бол `currentUser`-г null болгох
        setCurrentUserLocal(null);
      }
      setLoading(false);
    });

    // Компонент unmount хийгдэхэд listener-г цэвэрлэх
    return () => {
      unsubscribe();
    }
  }, [toast]); 

  // Нэвтрэх функц
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("AuthContext: Firebase login error:", error);
      let friendlyMessage = "Нэвтрэхэд алдаа гарлаа. И-мэйл эсвэл нууц үгээ шалгана уу.";
      if (error.code === 'auth/invalid-credential') {
        friendlyMessage = "И-мэйл эсвэл нууц үг буруу байна. Та Firebase Authentication хэсэгт бүртгэлтэй эсэхээ шалгана уу.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Хэт олон удаа буруу оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.";
      } else if (error.message) {
        friendlyMessage = `Алдаа: ${error.message} (Код: ${error.code})`;
      }
      toast({ title: "Нэвтрэлт амжилтгүй", description: friendlyMessage, variant: "destructive", duration: 10000 });
      setLoading(false); 
    }
  }, [toast]);

  // Системээс гарах функц
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
      toast({ title: "Системээс гарлаа", description: "Та системээс амжилттай гарлаa.", duration: 3000});
    } catch (error: any) {
      console.error("AuthContext: Firebase logout error:", error);
      toast({ title: "Гарах үед алдаа гарлаа", description: error.message, variant: "destructive" });
    }
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ currentUser: currentUser, login, logout, loading, updateCurrentUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
