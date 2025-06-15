
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
          console.log(`AuthContext: Firestore docSnap exists for ${firebaseUser.uid}? ${userDocSnap.exists()}. Read by UID: ${auth.currentUser?.uid} (if different, problem!)`);

          let userRoleFromFirestore: UserRole = UserRole.SUB_ADMIN; // Default if new or no role field
          let profileName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
          let profileAvatar = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(profileName).substring(0,2).toUpperCase()}`;
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log(`AuthContext: Firestore data for ${firebaseUser.uid}:`, JSON.stringify(userData));
            userRoleFromFirestore = userData.role as UserRole || UserRole.SUB_ADMIN; 
            profileName = userData.name || profileName; 
            profileAvatar = userData.avatar || profileAvatar;
            console.log(`AuthContext: Role from Firestore for ${firebaseUser.uid}: '${userData.role}'. Parsed as: '${userRoleFromFirestore}'`);

            // Sync Auth profile if Firestore has different info (e.g., admin updated name)
            if (firebaseUser.displayName !== profileName || firebaseUser.photoURL !== profileAvatar) {
              try {
                  console.log(`AuthContext: Auth profile for ${firebaseUser.uid} out of sync (Auth: ${firebaseUser.displayName}, Firestore: ${profileName}). Updating Auth profile...`);
                  await updateProfile(firebaseUser, { displayName: profileName, photoURL: profileAvatar });
                  console.log(`AuthContext: Auth profile updated successfully for ${firebaseUser.uid}.`);
              } catch (profileUpdateError) {
                  console.warn(`AuthContext: Could not update Firebase Auth profile for ${firebaseUser.uid}:`, profileUpdateError);
              }
            }
          } else {
            // This is likely a new user signing in for the first time after admin created their Auth account.
            // Or a user whose Firestore document was deleted.
            console.log(`AuthContext: No Firestore document for ${firebaseUser.uid}. This user might be new or their Firestore doc is missing. Attempting to create one with default role '${UserRole.SUB_ADMIN}'.`);
            const nameForDoc = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
            const avatarForDoc = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${nameForDoc.substring(0,2).toUpperCase()}`;
            
            // IMPORTANT: Firestore rules must allow a user to create their OWN document, or this will fail.
            // Or, this logic should only run if it's a truly new user (e.g. check creationTime vs lastLoginTime).
            // For simplicity now, we assume if doc doesn't exist, we try to create with default role.
            // This creation attempt MIGHT fail if Firestore rules don't permit self-creation with a specific role.
            try {
              await setDoc(userDocRef, {
                uid: firebaseUser.uid, // Ensure uid is stored
                email: firebaseUser.email,
                name: nameForDoc,
                role: UserRole.SUB_ADMIN, // New users get Sub Admin by default, Super Admin must be set manually or by another Super Admin.
                avatar: avatarForDoc,
                createdAt: serverTimestamp(), 
                updatedAt: serverTimestamp(),
              });
              profileName = nameForDoc;
              profileAvatar = avatarForDoc;
              userRoleFromFirestore = UserRole.SUB_ADMIN; // Role that was attempted to be set
              console.log(`AuthContext: Firestore document CREATED for ${firebaseUser.uid} with default role: ${userRoleFromFirestore}. This attempt was made by UID: ${firebaseUser.uid} (self-creation).`);
              toast({title: "Profile Created", description: `Your user profile has been initialized in Firestore with role: ${userRoleFromFirestore}.`, duration: 5000});
            } catch (firestoreSetError: any) {
                console.error(`AuthContext: FAILED to create Firestore document for user ${firebaseUser.uid}. Error:`, firestoreSetError);
                toast({ 
                    title: "Firestore Profile Creation Failed", 
                    description: `User account for ${firebaseUser.email} exists in Auth, but Firestore profile creation failed (UID: ${firebaseUser.uid}). Error: ${firestoreSetError.message}. This might be due to Firestore rules. An admin may need to assign a role. Defaulting role display.`, 
                    variant: "destructive", 
                    duration: 15000 
                });
                // Proceed with a default role for the context, but user data is incomplete in Firestore.
            }
          }

          const userProfile: UserProfile = {
            id: firebaseUser.uid,
            name: profileName,
            email: firebaseUser.email || '',
            role: userRoleFromFirestore, // Use role derived from Firestore or default set
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
          try {
            // If critical data cannot be obtained, logging out might be safer to prevent inconsistent state.
            // However, this could lead to logout loops if the issue is persistent on login.
            // For now, we set currentUser to null and let UI redirect if necessary.
            console.warn("AuthContext: Critical error led to currentUser being set to null. User might be logged out or redirected.");
            // await firebaseSignOut(auth); // Consider if automatic sign out is desired here.
          } catch (signOutError) {
            console.error("AuthContext: Error signing out after Firestore error:", signOutError);
          }
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
      console.log(`AuthContext: Login successful for ${email}. onAuthStateChanged will handle setting user data and navigation is handled by AdminLayout/page logic.`);
      // router.push('/admin/dashboard'); // Let onAuthStateChanged and page logic handle redirect
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
    // setLoading(false) is handled by onAuthStateChanged after successful login or here on error
  }, [toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    const currentAuthUserBeforeLogout = auth.currentUser;
    console.log(`AuthContext: Attempting logout for user: ${currentAuthUserBeforeLogout?.email} (UID: ${currentAuthUserBeforeLogout?.uid})`);
    try {
      await firebaseSignOut(auth);
      // setCurrentUser(null); // onAuthStateChanged will set currentUser to null
      router.push('/'); 
      console.log("AuthContext: Logout successful. Navigated to /. onAuthStateChanged will confirm currentUser is null.");
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
    