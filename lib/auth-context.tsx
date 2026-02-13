'use client';
// lib/auth-context.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { TEAM_MEMBERS, type TeamMember } from './team';
import { updatePresence } from './db';

interface AuthContextType {
  user: User | null;
  member: TeamMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const m = TEAM_MEMBERS.find(t => t.email === u.email) || null;
        setMember(m);
        if (m) await updatePresence(m.id, 'online');
      } else {
        setMember(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);
  // Fallback: stop loading after 5 seconds no matter what
useEffect(() => {
  const timeout = setTimeout(() => setLoading(false), 5000);
  return () => clearTimeout(timeout);
}, []);


  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

const signOut = async () => {
  if (member) {
    try {
      await updatePresence(member.id, 'online');
      console.log('Presence updated for', member.id);
    } catch (err) {
      console.error('Presence failed:', err);
    }
  }
  await firebaseSignOut(auth);
};

  return (
    <AuthContext.Provider value={{
      user, member, loading,
      signIn, signOut,
      isAdmin: member?.isAdmin ?? false,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
