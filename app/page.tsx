'use client';
// app/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import LoginPage from './login/page';
export const dynamic = "force-dynamic";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030912' }}>
        <div className="text-center">
          <div className="font-orbitron text-3xl gradient-text mb-4">TEAMFLOW</div>
          <div className="flex gap-2 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-nb animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, background: '#00d4ff' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return null;
}
