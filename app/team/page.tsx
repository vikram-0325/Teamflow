'use client';
// app/team/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { TEAM_MEMBERS } from '@/lib/team';
import { subscribeReports, getAllGitStats, getAllSessions } from '@/lib/db';
import type { WeeklyReport, GitStats, WorkSession } from '@/types';

const LEVEL_CONFIG = [
  { name: 'BRONZE',   minXP: 0,   maxXP: 500,  color: '#cd7f32', icon: '🥉' },
  { name: 'SILVER',   minXP: 500, maxXP: 1500, color: '#c0c0c0', icon: '🥈' },
  { name: 'GOLD',     minXP: 1500,maxXP: 3000, color: '#ffd700', icon: '🥇' },
  { name: 'PLATINUM', minXP: 3000,maxXP: 5000, color: '#e5e4e2', icon: '💎' },
  { name: 'ELITE',    minXP: 5000,maxXP: 10000,color: '#00d4ff', icon: '⚡' },
];

function getLevelInfo(xp: number) {
  return LEVEL_CONFIG.slice().reverse().find(l => xp >= l.minXP) || LEVEL_CONFIG[0];
}

function GamifiedCard({ member, xp, stats }: { member: any; xp: number; stats: any }) {
  const level = getLevelInfo(xp);
  const nextLevel = LEVEL_CONFIG[LEVEL_CONFIG.indexOf(level) + 1];
  const progress = nextLevel ? ((xp - level.minXP) / (nextLevel.minXP - level.minXP)) * 100 : 100;

  const achievements = [
    { icon: '⚡', label: 'First Clock-In', earned: stats.sessions > 0 },
    { icon: '🔥', label: '7-Day Streak', earned: stats.sessions >= 7 },
    { icon: '💻', label: '50+ Commits', earned: stats.commits >= 50 },
    { icon: '✅', label: '10 Tasks Done', earned: stats.tasks >= 10 },
    { icon: '📝', label: 'Report Streak', earned: stats.reports >= 4 },
    { icon: '🏆', label: '100h Logged', earned: stats.hours >= 100 },
  ];

  return (
    <div className="glass rounded-2xl p-6 glow-border relative overflow-hidden"
      style={{ borderColor: `${member.color}25` }}>
      {/* Subtle bg glow */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: member.color, opacity: 0.04, filter: 'blur(40px)' }}/>

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-orbitron text-base font-black flex-shrink-0 relative"
          style={{ background: `${member.color}15`, border: `2px solid ${member.color}40`, color: member.color }}>
          {member.avatar}
          <span className="absolute -top-2 -right-2 text-lg">{level.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-orbitron font-bold text-base">{member.name}</h3>
            {member.isAdmin && <span className="badge badge-purple">ADMIN</span>}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(180,210,255,0.4)' }}>{member.title}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-orbitron text-sm font-bold" style={{ color: level.color }}>{level.name}</span>
            <span className="font-mono text-xs" style={{ color: 'rgba(180,210,255,0.4)' }}>{xp.toLocaleString()} XP</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-orbitron text-2xl font-black" style={{ color: member.color }}>#{member.rank}</div>
          <div className="font-mono text-xs mt-0.5" style={{ color: 'rgba(180,210,255,0.35)' }}>RANK</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs font-mono mb-1.5" style={{ color: 'rgba(180,210,255,0.4)' }}>
          <span>{level.name}</span>
          <span>{nextLevel ? `${nextLevel.name} in ${(nextLevel.minXP - xp).toLocaleString()} XP` : 'MAX LEVEL'}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full relative overflow-hidden transition-all duration-1000"
            style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${level.color}88, ${level.color})` }}>
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }}/>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'HOURS', val: `${stats.hours}h`, color: '#00d4ff' },
          { label: 'COMMITS', val: stats.commits, color: '#00ff88' },
          { label: 'TASKS', val: stats.tasks, color: '#a855f7' },
        ].map(s => (
          <div key={s.label} className="text-center py-3 rounded-xl"
            style={{ background: `${s.color}06`, border: `1px solid ${s.color}15` }}>
            <div className="font-orbitron text-xl font-black" style={{ color: s.color }}>{s.val}</div>
            <div className="font-mono mt-0.5" style={{ fontSize: 9, color: 'rgba(180,210,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div>
        <div className="font-mono text-xs mb-3" style={{ color: 'rgba(0,212,255,0.4)', letterSpacing: 2 }}>ACHIEVEMENTS</div>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map(a => (
            <div key={a.label} className={`text-center p-2 rounded-lg transition-all ${a.earned ? '' : 'opacity-25 grayscale'}`}
              style={{ background: a.earned ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${a.earned ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)'}` }}>
              <div style={{ fontSize: 18 }}>{a.icon}</div>
              <div style={{ fontSize: 8, color: 'rgba(180,210,255,0.5)', fontFamily: 'JetBrains Mono', marginTop: 2, lineHeight: 1.2 }}>
                {a.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { member: currentMember } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [gitStats, setGitStats] = useState<GitStats[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);

  useEffect(() => {
    getAllSessions(30).then(setSessions);
    getAllGitStats().then(setGitStats);
    const unsub = subscribeReports(setReports);
    return unsub;
  }, []);

  const membersWithStats = TEAM_MEMBERS.map(tm => {
    const ms = sessions.filter(s => s.userId === tm.id);
    const gs = gitStats.find(g => g.userId === tm.id);
    const rs = reports.filter(r => r.userId === tm.id);
    const hours = Math.round(ms.reduce((a, s) => a + (s.duration || 0), 0) / 60 * 10) / 10;
    const commits = gs?.weeklyCommits || 0;
    const tasks = rs.reduce((a, r) => a + r.completedTasks.length, 0);
    const xp = Math.round(hours * 15 + commits * 25 + tasks * 30 + rs.length * 50);
    return { ...tm, stats: { hours, commits, tasks, reports: rs.length, sessions: ms.length }, xp };
  }).sort((a, b) => b.xp - a.xp).map((m, i) => ({ ...m, rank: i + 1 }));

  const topMember = membersWithStats[0];
  const totalXP = membersWithStats.reduce((a, m) => a + m.xp, 0);

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="mb-8">
          <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#00d4ff' }}>//TEAM</div>
          <h1 className="font-orbitron text-3xl font-black gradient-text">Team Progress</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(180,210,255,0.4)' }}>Gamified performance · XP system · Achievements</p>
        </div>

        {/* Top summary */}
        <div className="glass rounded-2xl p-6 mb-8 glow-border"
          style={{ borderColor: `${topMember?.color || '#00d4ff'}25` }}>
          <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#ffd700' }}>
            🏆 CURRENT LEADER
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            {topMember && (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-orbitron text-lg font-black"
                  style={{ background: `${topMember.color}20`, border: `2px solid ${topMember.color}50`, color: topMember.color }}>
                  {topMember.avatar}
                </div>
                <div>
                  <div className="font-orbitron text-xl font-bold">{topMember.name}</div>
                  <div className="text-sm" style={{ color: 'rgba(180,210,255,0.5)' }}>{topMember.title}</div>
                  <div className="font-orbitron mt-1" style={{ color: '#ffd700' }}>
                    {topMember.xp.toLocaleString()} XP · {getLevelInfo(topMember.xp).name}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-mono text-xs mb-1" style={{ color: 'rgba(180,210,255,0.4)' }}>TEAM TOTAL XP</div>
                  <div className="font-orbitron text-3xl font-black gradient-text">{totalXP.toLocaleString()}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Member cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {membersWithStats.map(m => (
            <GamifiedCard key={m.id} member={m} xp={m.xp} stats={m.stats} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </AppLayout>
  );
}
