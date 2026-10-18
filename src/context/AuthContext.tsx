import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { UserProfile, UserRole } from '../lib/types.ts';
import { handleFirestoreError, OperationType } from '../lib/error-handler.ts';
import { apiFetch } from '../lib/api-client.ts';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  pointsBalance: number;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, n: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile with authoritative server
  const syncProfile = useCallback(async (firebaseUser: User) => {
    try {
      const res = await apiFetch<{ profile: UserProfile }>('/api/auth/profile', {
        method: 'POST',
      });
      if (res?.profile) {
        setProfile(res.profile);
      }
    } catch (err) {
      console.warn('Profile sync note:', err);
    }
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync profile with authoritative backend server
        try {
          await syncProfile(currentUser);
        } catch (err) {
          console.warn('Initial sync warning:', err);
        }

        // Attach real-time Firestore listener for live point balance & role updates
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(prev => ({
                ...(prev || {}),
                ...data,
                uid: currentUser.uid,
              }));
            } else {
              // Default fallback profile while backend persists document
              const isAdminEmail = currentUser.email?.toLowerCase() === 'alishabatool838@gmail.com';
              setProfile(prev => prev || ({
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                email: currentUser.email || '',
                role: isAdminEmail ? 'admin' : 'student',
                pointsBalance: 0,
                accountStatus: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }));
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [syncProfile]);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      await syncProfile(result.user);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      await syncProfile(result.user);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(result.user, { displayName });
      await syncProfile(result.user);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await syncProfile(auth.currentUser);
    }
  };

  const sendPasswordReset = async (emailToReset: string) => {
    await sendPasswordResetEmail(auth, emailToReset);
  };

  const role: UserRole | null = profile?.role || null;
  const pointsBalance = profile?.pointsBalance ?? 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        pointsBalance,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        refreshProfile,
        sendPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
