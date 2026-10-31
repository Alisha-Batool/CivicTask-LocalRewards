import React, { createContext, useContext, useMemo, useState } from 'react';
import { DEMO_ROLE_STORAGE_KEY, demoProfile, updateDemoProfile } from '../lib/demo-data.ts';
import { isDemoMode } from '../lib/demo-mode.ts';
import type { UserProfile, UserRole } from '../lib/types.ts';

const GUEST_ID_STORAGE_KEY = 'civictask-guest-id';
const GUEST_NAME_STORAGE_KEY = 'civictask-guest-name';

interface ApplicationUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: ApplicationUser;
  profile: UserProfile;
  role: UserRole;
  pointsBalance: number;
  loading: boolean;
  isDemoMode: boolean;
  isGuestMode: boolean;
  switchDemoRole: (role: UserRole) => void;
  updateGuestName: (name: string) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, n: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function storedRole(): UserRole {
  if (typeof window === 'undefined') return 'student';
  const role = window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
  return role === 'student' || role === 'shopkeeper' || role === 'admin' ? role : 'student';
}

function createGuestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `guest_${crypto.randomUUID()}`
    : `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function guestId(): string {
  if (typeof window === 'undefined') return 'guest_server';
  const savedId = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (savedId) return savedId;
  const id = createGuestId();
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, id);
  return id;
}

function unavailableAuthentication(): Promise<void> {
  return Promise.reject(new Error('Authentication is disabled. Continue using the guest prototype.'));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(storedRole);
  const [uid, setUid] = useState<string>(guestId);
  const [name, setName] = useState<string>(() =>
    typeof window === 'undefined' ? 'Guest' : window.localStorage.getItem(GUEST_NAME_STORAGE_KEY) || 'Guest',
  );

  const profile = useMemo<UserProfile>(() => ({
    ...(isDemoMode ? demoProfile(role) : {
      uid,
      name,
      email: '',
      role,
      pointsBalance: 0,
      accountStatus: 'active' as const,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    }),
  }), [uid, name, role]);

  const user = useMemo<ApplicationUser>(() => ({
    uid: profile.uid,
    email: profile.email || null,
    displayName: profile.name,
  }), [profile]);

  const switchDemoRole = (nextRole: UserRole) => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, nextRole);
    setRole(nextRole);
  };

  const updateGuestName = (nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) return;
    if (isDemoMode) {
      updateDemoProfile({ name: trimmedName });
    } else {
      window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, trimmedName);
    }
    setName(trimmedName);
  };

  const signOutUser = async () => {
    window.localStorage.removeItem(GUEST_ID_STORAGE_KEY);
    setUid(createGuestId());
    switchDemoRole('student');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        pointsBalance: profile.pointsBalance,
        loading: false,
        isDemoMode,
        isGuestMode: true,
        switchDemoRole,
        updateGuestName,
        signInWithGoogle: unavailableAuthentication,
        signInWithEmail: unavailableAuthentication,
        signUpWithEmail: unavailableAuthentication,
        signOutUser,
        refreshProfile: async () => undefined,
        sendPasswordReset: unavailableAuthentication,
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
