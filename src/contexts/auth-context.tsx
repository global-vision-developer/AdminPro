
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    console.log("AuthContext: useEffect triggered for onAuthStateChanged.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("AuthContext: onAuthStateChanged callback fired. FirebaseUser:", firebaseUser ? firebaseUser.uid : 'null');
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        console.log(`AuthContext: Attempting to get Firestore doc for UID: ${firebaseUser.uid}`);
        try {
          const userDocSnap = await getDoc(userDocRef);
          console.log(`AuthContext: Firestore docSnap exists for ${firebaseUser.uid}?`, userDocSnap.exists());

          let userRole: UserRole = UserRole.SUB_ADMIN; // Default role if not found or new
          let profileName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
          let profileAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(profileName).substring(0,2).toUpperCase()}`;
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log(`AuthContext: Firestore data for ${firebaseUser.uid}:`, userData);
            userRole = userData.role as UserRole || UserRole.SUB_ADMIN; 
            profileName = userData.name || profileName; 
            profileAvatar = userData.avatar || profileAvatar;
            console.log(`AuthContext: Role from Firestore for ${firebaseUser.uid}: ${userData.role}. Parsed as: ${userRole}`);

            if (firebaseUser.displayName !== profileName || firebaseUser.photoURL !== profileAvatar) {
              try {
                  console.log(`AuthContext: Auth profile for ${firebaseUser.uid} out of sync. Updating Auth profile...`);
                  await updateProfile(firebaseUser, { displayName: profileName, photoURL: profileAvatar });
                  console.log(`AuthContext: Auth profile updated successfully for ${firebaseUser.uid}.`);
              } catch (profileUpdateError) {
                  console.warn(`AuthContext: Could not update Firebase Auth profile for ${firebaseUser.uid}:`, profileUpdateError);
              }
            }
          } else {
            console.log(`AuthContext: No Firestore document for ${firebaseUser.uid}. Attempting to create one (usually for a new user)... Role will be: ${userRole}`);
            const nameForDoc = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
            const avatarForDoc = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${nameForDoc.substring(0,2).toUpperCase()}`;
            
            try {
              await setDoc(userDocRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: nameForDoc,
                role: userRole, 
                avatar: avatarForDoc,
                createdAt: serverTimestamp(), 
                updatedAt: serverTimestamp(),
              });
              profileName = nameForDoc;
              profileAvatar = avatarForDoc;
              console.log(`AuthContext: Firestore document CREATED for ${firebaseUser.uid} with role: ${userRole}. This was attempted by user UID: ${firebaseUser.uid}.`);
            } catch (firestoreSetError: any) {
                console.error(`AuthContext: FAILED to create Firestore document for new user ${firebaseUser.uid}. Error:`, firestoreSetError);
                // This error often happens if Firestore rules prevent a new (non-SuperAdmin) user from creating their own document.
                // Or if isSuperAdmin() is incorrectly applied for self-creation.
                toast({ 
                    title: "Firestore Profile Incomplete", 
                    description: `User account for ${firebaseUser.email} created in Auth, but Firestore profile creation failed (UID: ${firebaseUser.uid}). Error: ${firestoreSetError.message}. An admin might need to assign a role manually.`, 
                    variant: "destructive", 
                    duration: 15000 
                });
                // We still proceed to set currentUser, as Auth user exists.
            }
          }

          const userProfile: UserProfile = {
            id: firebaseUser.uid,
            name: profileName,
            email: firebaseUser.email || '',
            role: userRole,
            avatar: profileAvatar,
          };
          setCurrentUser(userProfile);
          console.log(`AuthContext: currentUser set in context for ${firebaseUser.uid}:`, userProfile);

        } catch (error: any) {
          console.error(`AuthContext: Generic error fetching/setting user data from Firestore for UID ${firebaseUser.uid}:`, error);
          let firestoreErrorMsg = "Хэрэглэгчийн эрх, мэдээллийг Firestore-оос уншихад/хадгалахад алдаа гарлаа.";
          if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission-denied'))) {
            firestoreErrorMsg = `Firestore Permission Denied: Хэрэглэгчийн мэдээллийг унших/хадгалах зөвшөөрөлгүй байна (UID: ${firebaseUser.uid}). Firebase Console дээрх Firestore Rules болон таны нэвтэрсэн хэрэглэгчийн Firestore document дахь 'role' талбарыг шалгана уу. Error: ${error.message}`;
          } else if (error.name === 'FirebaseError') {
             firestoreErrorMsg = `Firebase Firestore Error (${error.code}): ${error.message}. UID: ${firebaseUser.uid}`;
          }
          toast({ title: "Алдаа гарлаа", description: firestoreErrorMsg, variant: "destructive", duration: 20000 });
          setCurrentUser(null); // If critical data fails, clear current user
          try {
            await firebaseSignOut(auth); // Sign out if crucial data cannot be fetched/set
          } catch (signOutError) {
            console.error("AuthContext: Error signing out after Firestore error:", signOutError);
          }
        }
      } else {
        setCurrentUser(null);
        console.log("AuthContext: No FirebaseUser. currentUser set to null.");
      }
      setLoading(false);
      console.log("AuthContext: setLoading(false). Loading complete.");
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    }
  }, [toast]); // Removed router from dependencies as redirect is handled elsewhere or by layout

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    console.log(`AuthContext: Attempting login for ${email}`);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log(`AuthContext: Login successful for ${email}, onAuthStateChanged will handle setting user and redirect if necessary via AdminLayout.`);
      // router.push('/admin/dashboard'); // Let onAuthStateChanged and AdminLayout handle redirect
    } catch (error: any) {
      console.error("AuthContext: Firebase login error:", error);
      let friendlyMessage = "Нэвтрэхэд алдаа гарлаа. Таны имэйл эсвэл нууц үг буруу байна.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        friendlyMessage = "Хэрэглэгч олдсонгүй эсвэл имэйл буруу байна. Бүртгэлтэй имэйл хаягаа оруулна уу.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        friendlyMessage = "Имэйл эсвэл нууц үг буруу байна.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Хэт олон удаагийн буруу оролдлого. Түр хүлээгээд дахин оролдоно уу.";
      } else if (error.message) {
        friendlyMessage = `Алдаа: ${error.message} (Код: ${error.code})`;
      }
      toast({ title: "Нэвтрэхэд алдаа гарлаа", description: friendlyMessage, variant: "destructive", duration: 7000 });
      // setLoading(false) is handled by onAuthStateChanged or here if error
      setLoading(false); 
    }
  }, [toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    console.log("AuthContext: Attempting logout.");
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null); // Explicitly set currentUser to null
      router.push('/'); // Redirect to login page
      console.log("AuthContext: Logout successful. Navigated to /.");
      toast({ title: "Системээс гарлаа", description: "Та амжилттай системээс гарлаа.", duration: 3000});
    } catch (error: any) {
      console.error("AuthContext: Firebase logout error:", error);
      toast({ title: "Гарахад алдаа гарлаа", description: error.message, variant: "destructive" });
    } finally {
      // setLoading(false); // onAuthStateChanged will set loading to false after currentUser becomes null
    }
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
