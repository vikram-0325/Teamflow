'use client';
// components/layout/AppLayout.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030912' }}>
        <div className="font-orbitron text-2xl gradient-text animate-pulse">LOADING...</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen cyber-bg" style={{ background: '#030912' }}>
      <Sidebar />
      <main style={{ marginLeft: 240, minHeight: '100vh' }}>
        <div className="p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
