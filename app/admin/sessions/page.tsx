'use client';
// app/admin/sessions/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { TEAM_MEMBERS, getMemberById } from '@/lib/team';
import { subscribeToSessions, clockOut } from '@/lib/db';
import type { WorkSession } from '@/types';
import { format, differenceInMinutes } from 'date-fns';

export default function AdminSessionsPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [filterUser, setFilterUser] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [view, setView] = useState<'all' | 'active' | 'today'>('today');

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/dashboard');
  }, [isAdmin, loading, router]);

  useEffect(() => { return subscribeToSessions(setSessions); }, []);

  const today = new Date().toISOString().split('T')[0];

  const filtered = sessions.filter(s => {
    if (filterUser !== 'all' && s.userId !== filterUser) return false;
    if (view === 'active' && s.clockOut) return false;
    if (view === 'today' && s.date !== today) return false;
    if (filterDate && s.date !== filterDate) return false;
    return true;
  });

  // Aggregated hours per member
  const memberHours = TEAM_MEMBERS.map(tm => {
    const ms = sessions.filter(s => s.userId === tm.id && s.date === today);
    const mins = ms.reduce((a, s) => a + (s.duration || 0), 0);
    const active = ms.find(s => !s.clockOut);
    return { ...tm, todayMins: mins, active: !!active };
  });

  const totalHoursToday = Math.round(memberHours.reduce((a, m) => a + m.todayMins, 0) / 60 * 10) / 10;
  const activeSessions = sessions.filter(s => !s.clockOut).length;

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="flex items-center gap-3 mb-2">
          <span className="badge badge-purple">⚡ ADMIN</span>
        </div>
        <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#a855f7' }}>//SESSION LOGS</div>
        <h1 className="font-orbitron text-3xl font-black gradient-text mb-8">Login & Session Logs</h1>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '// ACTIVE NOW', val: activeSessions, color: '#00ff88' },
            { label: '// HOURS TODAY', val: `${totalHoursToday}h`, color: '#00d4ff' },
            { label: '// TOTAL SESSIONS', val: filtered.length, color: '#a855f7' },
            { label: '// TEAM MEMBERS', val: `${memberHours.filter(m => m.active).length}/6`, color: '#ff6b35' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 glow-border text-center">
              <div className="font-mono text-xs tracking-widest mb-2" style={{ color: s.color, fontSize: 10 }}>{s.label}</div>
              <div className="font-orbitron text-3xl font-black">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Today's member overview */}
        <div className="glass rounded-2xl p-5 mb-6 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#a855f7' }}>
            // TODAY'S HOURS — ALL MEMBERS
          </div>
          <div className="space-y-3">
            {memberHours.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-orbitron text-xs font-bold flex-shrink-0"
                  style={{ background: `${m.color}15`, color: m.color, fontSize: 9 }}>{m.avatar}</div>
                <div className="w-24 text-sm font-semibold truncate">{m.name}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min((m.todayMins / 480) * 100, 100)}%`,
                    background: m.active ? m.color : `${m.color}60`,
                    transition: 'width 0.8s ease'
                  }}/>
                </div>
                <div className="w-16 text-right font-mono text-sm" style={{ color: m.color }}>
                  {Math.floor(m.todayMins/60)}h {m.todayMins%60}m
                </div>
                {m.active && <span className="badge badge-green" style={{ fontSize: 9 }}>LIVE</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <div className="flex gap-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,212,255,0.12)' }}>
            {(['today', 'active', 'all'] as const).map(v => (
              <button key={v} className="px-4 py-2 text-xs font-orbitron tracking-widest transition-all"
                style={{
                  background: view === v ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: view === v ? '#00d4ff' : 'rgba(180,210,255,0.4)',
                }}
                onClick={() => setView(v)}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          <select className="tf-input" style={{ width: 'auto' }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="all">All Members</option>
            {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" className="tf-input" style={{ width: 'auto' }} value={filterDate}
            onChange={e => setFilterDate(e.target.value)} placeholder="Filter by date"/>
          {filterDate && <button className="btn-ghost btn-sm" onClick={() => setFilterDate('')}>✕ Clear</button>}
        </div>

        {/* Sessions table */}
        <div className="glass rounded-2xl overflow-hidden">
          <table className="tf-table">
            <thead>
              <tr>
                <th>MEMBER</th><th>DATE</th><th>TASK</th><th>CLOCK IN</th>
                <th>CLOCK OUT</th><th>DURATION</th><th>STATUS</th><th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'rgba(180,210,255,0.3)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                  No sessions found
                </td></tr>
              ) : (
                filtered.map(s => {
                  const tm = getMemberById(s.userId);
                  const liveElapsed = !s.clockOut ? differenceInMinutes(new Date(), new Date(s.clockIn)) : null;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          {tm && (
                            <span className="w-6 h-6 rounded flex items-center justify-center font-orbitron font-bold"
                              style={{ background: `${tm.color}20`, color: tm.color, fontSize: 9 }}>
                              {tm.avatar}
                            </span>
                          )}
                          <span className="font-semibold text-sm">{s.userName}</span>
                        </div>
                      </td>
                      <td className="font-mono text-sm">{s.date}</td>
                      <td className="text-sm max-w-xs" style={{ maxWidth: 200 }}>
                        <div className="truncate" style={{ color: 'rgba(180,210,255,0.7)' }}>{s.taskDescription || '—'}</div>
                      </td>
                      <td className="font-mono text-sm">{format(new Date(s.clockIn), 'HH:mm:ss')}</td>
                      <td className="font-mono text-sm">
                        {s.clockOut ? format(new Date(s.clockOut), 'HH:mm:ss') : '—'}
                      </td>
                      <td className="font-mono text-sm">
                        {s.duration ? `${Math.floor(s.duration/60)}h ${s.duration%60}m` :
                          liveElapsed !== null ? (
                            <span style={{ color: '#00d4ff' }}>{Math.floor(liveElapsed/60)}h {liveElapsed%60}m</span>
                          ) : '—'}
                      </td>
                      <td>
                        {!s.clockOut
                          ? <span className="badge badge-green">ACTIVE</span>
                          : <span className="badge badge-blue">DONE</span>}
                      </td>
                      <td>
                        {!s.clockOut && (
                          <button className="btn-danger btn-sm"
                            onClick={() => clockOut(s.id, s.userId)}>
                            Force Out
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
