'use client';
// app/dashboard/page.tsx
import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { TEAM_MEMBERS, getMemberById } from '@/lib/team';
import { clockIn, clockOut, subscribeToSessions, subscribePresence, getAllGitStats } from '@/lib/db';
import type { WorkSession, GitStats } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5 glow-border">
      <div className="text-xs font-mono tracking-widest mb-3" style={{ color: color }}>
        {label}
      </div>
      <div className="font-orbitron text-3xl font-black mb-1" style={{ color: '#fff' }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: 'rgba(180,210,255,0.45)' }}>{sub}</div>}
    </div>
  );
}

function MemberCard({ member, session, presence, gitStats }: {
  member: any; session?: WorkSession; presence?: any; gitStats?: GitStats;
}) {
  const statusColor = { online: '#00ff88', working: '#00d4ff', idle: '#ff6b35', offline: '#444' };
  const status = presence?.status || 'offline';

  return (
    <div className="glass rounded-2xl p-5 glow-border transition-all hover:scale-[1.01]"
      style={{ borderColor: `${member.color}20` }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-orbitron text-sm font-bold flex-shrink-0 relative"
          style={{ background: `${member.color}15`, border: `1px solid ${member.color}30`, color: member.color }}>
          {member.avatar}
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2"
            style={{ background: (statusColor as any)[status] || '#444', borderColor: '#030912' }}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">{member.name}</span>
            {member.isAdmin && <span className="badge badge-purple">ADMIN</span>}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: 'rgba(180,210,255,0.45)' }}>{member.title}</div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono" style={{ color: (statusColor as any)[status] || '#444' }}>
              ● {status.toUpperCase()}
            </span>
            {session && (
              <span className="text-xs" style={{ color: 'rgba(180,210,255,0.45)' }}>
                ⏱ {formatDistanceToNow(new Date(session.clockIn))} ago
              </span>
            )}
          </div>
          {session?.taskDescription && (
            <div className="mt-2 text-xs px-2 py-1 rounded" style={{
              background: 'rgba(0,212,255,0.06)', color: 'rgba(180,210,255,0.6)',
              border: '1px solid rgba(0,212,255,0.1)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {session.taskDescription}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {gitStats && (
            <div className="text-xs font-mono" style={{ color: 'rgba(180,210,255,0.45)' }}>
              <div style={{ color: '#00ff88' }}>{gitStats.weeklyCommits || 0}</div>
              <div>commits</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { member, isAdmin } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [presence, setPresence] = useState<any[]>([]);
  const [gitStats, setGitStats] = useState<GitStats[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [taskDesc, setTaskDesc] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [showClockIn, setShowClockIn] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const unsubSessions = subscribeToSessions(setSessions);
    const unsubPresence = subscribePresence(setPresence);
    getAllGitStats().then(setGitStats);
    return () => { unsubSessions(); };
  }, []);

  // Timer
  useEffect(() => {
    if (activeSessionId && clockInTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSessionId, clockInTime]);

  const handleClockIn = async () => {
    if (!member || !taskDesc.trim()) return;
    const id = await clockIn(member.id, member.name, taskDesc);
    setActiveSessionId(id);
    setClockInTime(new Date().toISOString());
    setShowClockIn(false);
    setTaskDesc('');
  };

  const handleClockOut = async () => {
    if (!member || !activeSessionId) return;
    await clockOut(activeSessionId, member.id);
    setActiveSessionId(null);
    setClockInTime(null);
    setElapsed(0);
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Stats
  const mySessionsToday = sessions.filter(s =>
    s.userId === member?.id && s.date === new Date().toISOString().split('T')[0]
  );
  const myHoursToday = mySessionsToday.reduce((acc, s) => acc + (s.duration || 0), 0);
  const teamActive = presence.filter(p => ['online', 'working'].includes(p.status)).length;
  const totalCommitsWeek = gitStats.reduce((acc, g) => acc + (g.weeklyCommits || 0), 0);

  const activeSessions = sessions.filter(s => !s.clockOut);
  const activeByUser = Object.fromEntries(activeSessions.map(s => [s.userId, s]));
  const presenceByUser = Object.fromEntries(presence.map(p => [p.userId, p]));
  const gitByUser = Object.fromEntries(gitStats.map(g => [g.userId, g]));

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="font-mono text-xs tracking-widest mb-2" style={{ color: '#00d4ff' }}>
              // {format(today, "EEEE, MMMM d yyyy").toUpperCase()}
            </div>
            <h1 className="font-orbitron text-3xl font-black gradient-text">
              {member ? `Welcome, ${member.name}` : 'Dashboard'}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(180,210,255,0.45)' }}>
              {member?.title}
            </p>
          </div>
          {/* Clock In/Out */}
          <div>
            {activeSessionId ? (
              <div className="flex items-center gap-3">
                <div className="text-center px-5 py-3 rounded-xl"
                  style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
                  <div className="font-mono text-xs" style={{ color: 'rgba(180,210,255,0.45)' }}>ACTIVE SESSION</div>
                  <div className="font-orbitron text-2xl font-bold" style={{ color: '#00d4ff', fontVariantNumeric: 'tabular-nums' }}>
                    {formatElapsed(elapsed)}
                  </div>
                </div>
                <button className="btn-danger btn-sm" onClick={handleClockOut}>⏹ CLOCK OUT</button>
              </div>
            ) : (
              <button className="btn-primary" onClick={() => setShowClockIn(true)}>
                ▶ CLOCK IN
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="// HOURS TODAY" value={`${Math.round(myHoursToday / 60 * 10) / 10}h`}
            sub="Your tracked time" color="#00d4ff"/>
          <StatCard label="// TEAM ONLINE" value={`${teamActive}/6`}
            sub="Active right now" color="#00ff88"/>
          <StatCard label="// WEEKLY COMMITS" value={`${totalCommitsWeek}`}
            sub="Team total" color="#a855f7"/>
          <StatCard label="// ACTIVE TASKS" value={`${sessions.filter(s => !s.clockOut).length}`}
            sub="Sessions running" color="#ff6b35"/>
        </div>

        {/* Time Tracker — Your personal log */}
        <div className="glass rounded-2xl p-6 mb-8 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#00d4ff' }}>
            // YOUR SESSION LOG — TODAY
          </div>
          {mySessionsToday.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'rgba(180,210,255,0.3)', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
              No sessions logged today yet. Clock in to start tracking.
            </div>
          ) : (
            <table className="tf-table">
              <thead>
                <tr>
                  <th>TASK</th><th>CLOCK IN</th><th>CLOCK OUT</th><th>DURATION</th><th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {mySessionsToday.map(s => (
                  <tr key={s.id}>
                    <td className="text-sm">{s.taskDescription || '—'}</td>
                    <td className="font-mono text-sm">{format(new Date(s.clockIn), 'HH:mm:ss')}</td>
                    <td className="font-mono text-sm">{s.clockOut ? format(new Date(s.clockOut), 'HH:mm:ss') : '—'}</td>
                    <td className="font-mono text-sm">
                      {s.duration ? `${Math.floor(s.duration/60)}h ${s.duration%60}m` : '—'}
                    </td>
                    <td>
                      {!s.clockOut
                        ? <span className="badge badge-green">ACTIVE</span>
                        : <span className="badge badge-blue">DONE</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Team Status Grid */}
        <div className="mb-8">
          <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#00d4ff' }}>
            // TEAM STATUS — LIVE
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {TEAM_MEMBERS.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                session={activeByUser[m.id]}
                presence={presenceByUser[m.id]}
                gitStats={gitByUser[m.id]}
              />
            ))}
          </div>
        </div>

        {/* Admin: All active sessions */}
        {isAdmin && (
          <div className="glass rounded-2xl p-6 glow-border">
            <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#a855f7' }}>
              ⚡ ADMIN — ALL ACTIVE SESSIONS
            </div>
            {activeSessions.length === 0 ? (
              <div className="text-center py-6" style={{ color: 'rgba(180,210,255,0.3)', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                No active sessions right now.
              </div>
            ) : (
              <table className="tf-table">
                <thead>
                  <tr><th>MEMBER</th><th>TASK</th><th>STARTED</th><th>ELAPSED</th></tr>
                </thead>
                <tbody>
                  {activeSessions.map(s => {
                    const m = getMemberById(s.userId);
                    const elapsed = Math.floor((Date.now() - new Date(s.clockIn).getTime()) / 60000);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded flex items-center justify-center font-orbitron text-xs font-bold"
                              style={{ background: `${m?.color}20`, color: m?.color, fontSize: 9 }}>
                              {m?.avatar}
                            </span>
                            <span className="font-semibold text-sm">{s.userName}</span>
                          </div>
                        </td>
                        <td className="text-sm max-w-xs truncate" style={{ color: 'rgba(180,210,255,0.7)' }}>
                          {s.taskDescription || '—'}
                        </td>
                        <td className="font-mono text-sm">{format(new Date(s.clockIn), 'HH:mm')}</td>
                        <td className="font-mono text-sm" style={{ color: '#00d4ff' }}>
                          {Math.floor(elapsed/60)}h {elapsed%60}m
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Clock In Modal */}
        {showClockIn && (
          <div className="modal-overlay" onClick={() => setShowClockIn(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#00d4ff' }}>
                // START SESSION
              </div>
              <h3 className="font-orbitron text-xl font-bold mb-6">Clock In</h3>
              <label className="block text-xs tracking-widest mb-2 font-mono" style={{ color: '#00d4ff' }}>
                WHAT ARE YOU WORKING ON?
              </label>
              <textarea
                className="tf-input mb-5"
                rows={3}
                placeholder="Describe your current task..."
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
              />
              <div className="flex gap-3">
                <button className="btn-primary" onClick={handleClockIn} disabled={!taskDesc.trim()}>
                  ▶ START TRACKING
                </button>
                <button className="btn-ghost" onClick={() => setShowClockIn(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
