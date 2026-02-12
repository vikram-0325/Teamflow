'use client';
// app/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { TEAM_MEMBERS } from '@/lib/team';
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/dashboard');
    } catch (err: any) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = TEAM_MEMBERS.find(m => m.email === email);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden cyber-bg"
      style={{ background: '#030912' }}>

      {/* Orbs */}
      <div className="fixed w-96 h-96 rounded-full pointer-events-none" style={{
        background: '#00d4ff', opacity: 0.05, filter: 'blur(100px)', top: '-100px', left: '-100px'
      }}/>
      <div className="fixed w-80 h-80 rounded-full pointer-events-none" style={{
        background: '#a855f7', opacity: 0.06, filter: 'blur(100px)', bottom: '-100px', right: '-100px'
      }}/>

      <div className="w-full max-w-md px-6 relative z-10 animate-fadeUp">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
            <span className="w-2 h-2 rounded-full status-online inline-block" style={{ background: '#00ff88' }}/>
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00d4ff' }}>SYSTEM ONLINE</span>
          </div>
          <h1 className="font-orbitron text-5xl font-black gradient-text mb-2" style={{ letterSpacing: '-2px' }}>
            TEAMFLOW
          </h1>
          <p className="text-sm tracking-widest" style={{ color: 'rgba(180,210,255,0.45)', fontFamily: 'JetBrains Mono' }}>
            TEAM OPERATING SYSTEM
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl p-8 glass glow-border">
          <h2 className="font-orbitron text-sm tracking-widest mb-6" style={{ color: '#00d4ff' }}>
            // ACCESS PORTAL
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Member Select */}
            <div>
              <label className="block text-xs tracking-widest mb-2 font-mono" style={{ color: '#00d4ff' }}>
                SELECT MEMBER
              </label>
              <select
                className="tf-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              >
                <option value="">— Choose your profile —</option>
                <optgroup label="⚡ Founders">
                  {TEAM_MEMBERS.filter(m => m.isAdmin).map(m => (
                    <option key={m.id} value={m.email}>{m.name} · {m.title}</option>
                  ))}
                </optgroup>
                <optgroup label="◆ Team">
                  {TEAM_MEMBERS.filter(m => !m.isAdmin).map(m => (
                    <option key={m.id} value={m.email}>{m.name} · {m.title}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Selected member preview */}
            {selectedMember && (
              <div className="flex items-center gap-3 p-3 rounded-xl animate-fadeIn"
                style={{ background: selectedMember.accentColor, border: `1px solid ${selectedMember.color}30` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-orbitron text-xs font-bold"
                  style={{ background: `${selectedMember.color}20`, border: `1px solid ${selectedMember.color}40`, color: selectedMember.color }}>
                  {selectedMember.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm">{selectedMember.name}</div>
                  <div className="text-xs" style={{ color: 'rgba(180,210,255,0.5)' }}>{selectedMember.title}</div>
                </div>
                {selectedMember.isAdmin && (
                  <span className="ml-auto badge badge-purple">ADMIN</span>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs tracking-widest mb-2 font-mono" style={{ color: '#00d4ff' }}>
                ACCESS CODE
              </label>
              <input
                type="password"
                className="tf-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-xs p-3 rounded-lg animate-fadeIn"
                style={{ background: 'rgba(255,64,96,0.1)', border: '1px solid rgba(255,64,96,0.3)', color: '#ff4060', fontFamily: 'JetBrains Mono' }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"/>
                  AUTHENTICATING...
                </>
              ) : (
                '→ ENTER SYSTEM'
              )}
            </button>
          </form>

          <p className="text-center mt-5 font-mono" style={{ fontSize: '10px', color: 'rgba(180,210,255,0.3)' }}>
            Access restricted to authorized TeamFlow members
          </p>
        </div>
      </div>
    </div>
  );
}
