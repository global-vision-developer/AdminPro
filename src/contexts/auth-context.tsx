
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
    console.log("AuthContext: useEffect triggered for onAuthStateChanged subscription.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log(`AuthContext: onAuthStateChanged callback. FirebaseUser UID: ${firebaseUser ? firebaseUser.uid : 'null'}. Email: ${firebaseUser?.email}`);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        console.log(`AuthContext: Attempting to get Firestore doc for UID: ${firebaseUser.uid} from path: ${userDocRef.path}`);
        try {
          const userDocSnap = await getDoc(userDocRef);
          console.log(`AuthContext: Firestore docSnap exists for ${firebaseUser.uid}? ${userDocSnap.exists()}. Read by UID: ${auth.currentUser?.uid}`);

          let userRoleFromFirestore: UserRole = UserRole.SUB_ADMIN; // Default if new or no role field
          let profileName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
          let profileAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(profileName).substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log(`AuthContext: Firestore data for ${firebaseUser.uid}:`, JSON.stringify(userData));
            userRoleFromFirestore = userData.role as UserRole || UserRole.SUB_ADMIN; 
            profileName = userData.name || profileName; 
            profileAvatar = userData.avatar || profileAvatar;
            console.log(`AuthContext: Role from Firestore for ${firebaseUser.uid}: '${userData.role}'. Parsed as: '${userRoleFromFirestore}'`);

            if (firebaseUser.displayName !== profileName || firebaseUser.photoURL !== profileAvatar) {
              try {
                  console.log(`AuthContext: Auth profile for ${firebaseUser.uid} out of sync (Auth DisplayName: ${firebaseUser.displayName}, Firestore Name: ${profileName}; Auth PhotoURL: ${firebaseUser.photoURL}, Firestore Avatar: ${profileAvatar}). Updating Auth profile...`);
                  await updateProfile(firebaseUser, { displayName: profileName, photoURL: profileAvatar });
                  console.log(`AuthContext: Auth profile updated successfully for ${firebaseUser.uid}.`);
              } catch (profileUpdateError) {
                  console.warn(`AuthContext: Could not update Firebase Auth profile for ${firebaseUser.uid}:`, profileUpdateError);
              }
            }
          } else {
            console.log(`AuthContext: No Firestore document for ${firebaseUser.uid}. This user might be new or their Firestore doc is missing. Attempting to create one with default role '${UserRole.SUB_ADMIN}'.`);
            const nameForDoc = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User';
            const avatarForDoc = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${nameForDoc.substring(0,2).toUpperCase()}&bg=FF5733&txt=FFFFFF`;
            
            try {
              const newFirestoreDocData = {
                uid: firebaseUser.uid, // Explicitly store UID
                email: firebaseUser.email,
                name: nameForDoc,
                role: UserRole.SUB_ADMIN, 
                avatar: avatarForDoc,
                createdAt: serverTimestamp(), 
                updatedAt: serverTimestamp(),
              };
              await setDoc(userDocRef, newFirestoreDocData);
              profileName = nameForDoc;
              profileAvatar = avatarForDoc;
              userRoleFromFirestore = UserRole.SUB_ADMIN; 
              console.log(`AuthContext: Firestore document CREATED for ${firebaseUser.uid} with default role: ${userRoleFromFirestore} by user ${firebaseUser.uid} (self-creation). Data:`, JSON.stringify(newFirestoreDocData));
              toast({title: "Profile Initialized", description: `Your user profile has been initialized in Firestore with role: ${userRoleFromFirestore}.`, duration: 7000});
            } catch (firestoreSetError: any) {
                console.error(`AuthContext: FAILED to create Firestore document for user ${firebaseUser.uid} during self-creation attempt. Error:`, firestoreSetError);
                toast({ 
                    title: "Firestore Profile Creation Failed", 
                    description: `User account for ${firebaseUser.email} exists in Auth, but Firestore profile creation attempt failed (UID: ${firebaseUser.uid}). Error: ${firestoreSetError.message}. This might be due to Firestore rules not allowing self-creation for new users. An admin may need to assign a role. Defaulting role display.`, 
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
          };
          setCurrentUser(userProfile);
          console.log(`AuthContext: currentUser set in context for ${firebaseUser.uid}:`, JSON.stringify(userProfile));

        } catch (error: any) {
          console.error(`AuthContext: Critical error processing user data from Firestore for UID ${firebaseUser.uid}. Error:`, error);
          let firestoreErrorMsg = "Хэрэглэгчийн эрх, мэдээллийг Firestore-оос уншихад/хадгалахад алдаа гарлаа. Таны эрх хүрэхгүй байж магадгүй эсвэл системд доголдол гарсан байх.";
          if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission-denied'))) {
            firestoreErrorMsg = `Firestore Permission Denied: Хэрэглэгчийн мэдээллийг унших/хадгалах зөвшөөрөлгүй байна (UID: ${firebaseUser.uid}, performing as UID: ${auth.currentUser?.uid}). Firebase Console дээрх Firestore Rules болон таны нэвтэрсэн хэрэглэгчийн Firestore document дахь 'role' талбарыг шалгана уу. Error: ${error.message}`;
          } else if (error.name === 'FirebaseError') {
             firestoreErrorMsg = `Firebase Firestore Error (code: ${error.code}): ${error.message}. UID: ${firebaseUser.uid}`;
          }
          toast({ title: "Алдаа гарлаа (AuthContext)", description: firestoreErrorMsg, variant: "destructive", duration: 20000 });
          setCurrentUser(null); 
          console.warn("AuthContext: Critical error led to currentUser being set to null. User might be logged out or redirected.");
        }
      } else {
        setCurrentUser(null);
        console.log("AuthContext: No FirebaseUser in onAuthStateChanged. currentUser set to null.");
      }
      setLoading(false);
      console.log("AuthContext: setLoading(false). Auth state processing complete.");
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    }
  }, [toast]); 

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    console.log(`AuthContext: Attempting login for ${email}`);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log(`AuthContext: Login successful for ${email}. onAuthStateChanged will handle setting user data.`);
    } catch (error: any) {
      console.error("AuthContext: Firebase login error:", error);
      let friendlyMessage = "Нэвтрэхэд алдаа гарлаа. Таны имэйл эсвэл нууц үг буруу байна.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email' || error.code === 'auth/invalid-credential') {
        friendlyMessage = "Хэрэглэгч олдсонгүй эсвэл имэйл/нууц үг буруу байна. Бүртгэлтэй имэйл хаягаа оруулна уу.";
      } else if (error.code === 'auth/wrong-password') {
        friendlyMessage = "Имэйл эсвэл нууц үг буруу байна.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Хэт олон удаагийн буруу оролдлого. Түр хүлээгээд дахин оролдоно уу.";
      } else if (error.message) {
        friendlyMessage = `Алдаа: ${error.message} (Код: ${error.code})`;
      }
      toast({ title: "Нэвтрэхэд алдаа гарлаа", description: friendlyMessage, variant: "destructive", duration: 7000 });
      setLoading(false); 
    }
  }, [toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    const currentAuthUserBeforeLogout = auth.currentUser;
    console.log(`AuthContext: Attempting logout for user: ${currentAuthUserBeforeLogout?.email} (UID: ${currentAuthUserBeforeLogout?.uid})`);
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
      console.log("AuthContext: Logout successful. Navigated to /. onAuthStateChanged will confirm currentUser is null.");
      toast({ title: "Системээс гарлаа", description: "Та амжилттай системээс гарлаа.", duration: 3000});
    } catch (error: any) {
      console.error("AuthContext: Firebase logout error:", error);
      toast({ title: "Гарахад алдаа гарлаа", description: error.message, variant: "destructive" });
    }
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

    