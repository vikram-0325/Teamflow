'use client';
// app/efficiency/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { TEAM_MEMBERS } from '@/lib/team';
import { getAllSessions, subscribeReports, getAllGitStats } from '@/lib/db';
import type { WorkSession, WeeklyReport, GitStats } from '@/types';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#070f1e', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#00d4ff', fontFamily: 'JetBrains Mono', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontSize: 12, fontFamily: 'JetBrains Mono' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function EfficiencyPage() {
  const { isAdmin, member } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [gitStats, setGitStats] = useState<GitStats[]>([]);

  useEffect(() => {
    getAllSessions(30).then(setSessions);
    getAllGitStats().then(setGitStats);
    const unsub = subscribeReports(setReports);
    return unsub;
  }, []);

  // Build per-member stats
  const memberStats = TEAM_MEMBERS.map(tm => {
    const memberSessions = sessions.filter(s => s.userId === tm.id);
    const totalMins = memberSessions.reduce((a, s) => a + (s.duration || 0), 0);
    const totalHours = Math.round(totalMins / 60 * 10) / 10;
    const git = gitStats.find(g => g.userId === tm.id);
    const memberReports = reports.filter(r => r.userId === tm.id);
    const avgTasks = memberReports.length
      ? Math.round(memberReports.reduce((a, r) => a + r.completedTasks.length, 0) / memberReports.length)
      : 0;
    return {
      name: tm.name,
      color: tm.color,
      hours: totalHours,
      commits: git?.weeklyCommits || 0,
      tasks: avgTasks,
      reports: memberReports.length,
      sessions: memberSessions.length,
    };
  });

  // Weekly trend (last 4 weeks mock + real data)
  const weeklyTrend = [
    { week: 'W-4', hours: 82, tasks: 14, commits: 28 },
    { week: 'W-3', hours: 94, tasks: 18, commits: 35 },
    { week: 'W-2', hours: 88, tasks: 16, commits: 42 },
    { week: 'THIS', hours: memberStats.reduce((a, m) => a + m.hours, 0), tasks: memberStats.reduce((a, m) => a + m.tasks, 0), commits: memberStats.reduce((a, m) => a + m.commits, 0) },
  ];

  // Radar data
  const radarData = [
    { metric: 'Hours', ...Object.fromEntries(TEAM_MEMBERS.map(tm => [tm.name, memberStats.find(m => m.name === tm.name)?.hours || 0])) },
    { metric: 'Commits', ...Object.fromEntries(TEAM_MEMBERS.map(tm => [tm.name, (memberStats.find(m => m.name === tm.name)?.commits || 0) * 2])) },
    { metric: 'Tasks', ...Object.fromEntries(TEAM_MEMBERS.map(tm => [tm.name, (memberStats.find(m => m.name === tm.name)?.tasks || 0) * 10])) },
    { metric: 'Sessions', ...Object.fromEntries(TEAM_MEMBERS.map(tm => [tm.name, (memberStats.find(m => m.name === tm.name)?.sessions || 0) * 5])) },
    { metric: 'Reports', ...Object.fromEntries(TEAM_MEMBERS.map(tm => [tm.name, (memberStats.find(m => m.name === tm.name)?.reports || 0) * 20])) },
  ];

  const totalHours = memberStats.reduce((a, m) => a + m.hours, 0);
  const totalCommits = memberStats.reduce((a, m) => a + m.commits, 0);
  const totalTasks = memberStats.reduce((a, m) => a + m.tasks, 0);

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="mb-8">
          <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#00d4ff' }}>//EFFICIENCY</div>
          <h1 className="font-orbitron text-3xl font-black gradient-text">Team Efficiency Graph</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(180,210,255,0.4)' }}>30-day rolling performance data</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '// TOTAL HOURS', val: `${totalHours}h`, color: '#00d4ff' },
            { label: '// TOTAL COMMITS', val: totalCommits, color: '#00ff88' },
            { label: '// AVG TASKS/MEMBER', val: Math.round(totalTasks / 6), color: '#a855f7' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 glow-border text-center">
              <div className="font-mono text-xs tracking-widest mb-2" style={{ color: s.color }}>{s.label}</div>
              <div className="font-orbitron text-3xl font-black">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Hours per member */}
        <div className="glass rounded-2xl p-6 mb-6 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#00d4ff' }}>
            // HOURS WORKED — PER MEMBER (30 DAYS)
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={memberStats} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(180,210,255,0.5)', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fill: 'rgba(180,210,255,0.4)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" radius={[4,4,0,0]}>
                {memberStats.map((m, i) => <Cell key={i} fill={m.color} fillOpacity={0.8}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly trend */}
        <div className="glass rounded-2xl p-6 mb-6 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#00d4ff' }}>
            // TEAM VELOCITY — 4 WEEK TREND
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
              <XAxis dataKey="week" tick={{ fill: 'rgba(180,210,255,0.5)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(180,210,255,0.4)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'rgba(180,210,255,0.5)' }} />
              <Line type="monotone" dataKey="hours" stroke="#00d4ff" strokeWidth={2} dot={{ fill: '#00d4ff', r: 4 }} name="Hours"/>
              <Line type="monotone" dataKey="commits" stroke="#00ff88" strokeWidth={2} dot={{ fill: '#00ff88', r: 4 }} name="Commits"/>
              <Line type="monotone" dataKey="tasks" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} name="Tasks"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Commits vs Hours scatter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="glass rounded-2xl p-6 glow-border">
            <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#00d4ff' }}>
              // COMMITS — THIS WEEK
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={memberStats} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(180,210,255,0.5)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(180,210,255,0.4)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="commits" radius={[4,4,0,0]}>
                  {memberStats.map((m, i) => <Cell key={i} fill="#00ff88" fillOpacity={0.6 + (m.commits / Math.max(...memberStats.map(x => x.commits), 1)) * 0.4}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl p-6 glow-border">
            <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#a855f7' }}>
              // ACTIVITY RADAR
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(0,212,255,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(180,210,255,0.4)', fontSize: 10 }} />
                {TEAM_MEMBERS.slice(0, 3).map(tm => (
                  <Radar key={tm.id} name={tm.name} dataKey={tm.name}
                    stroke={tm.color} fill={tm.color} fillOpacity={0.1} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="glass rounded-2xl p-6 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#00d4ff' }}>
            // PERFORMANCE LEADERBOARD
          </div>
          <table className="tf-table">
            <thead>
              <tr><th>RANK</th><th>MEMBER</th><th>HOURS</th><th>COMMITS</th><th>TASKS</th><th>SESSIONS</th><th>SCORE</th></tr>
            </thead>
            <tbody>
              {[...memberStats].sort((a, b) => (b.hours + b.commits * 2 + b.tasks * 3) - (a.hours + a.commits * 2 + a.tasks * 3))
                .map((m, idx) => {
                  const score = Math.round((m.hours * 2 + m.commits * 4 + m.tasks * 6) / 3);
                  const tm = TEAM_MEMBERS.find(t => t.name === m.name);
                  return (
                    <tr key={m.name}>
                      <td>
                        <span className="font-orbitron text-sm font-bold"
                          style={{ color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#444' }}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center font-orbitron font-bold"
                            style={{ background: `${m.color}20`, color: m.color, fontSize: 9 }}>
                            {tm?.avatar}
                          </span>
                          <span className="font-semibold">{m.name}</span>
                        </div>
                      </td>
                      <td className="font-mono" style={{ color: '#00d4ff' }}>{m.hours}h</td>
                      <td className="font-mono" style={{ color: '#00ff88' }}>{m.commits}</td>
                      <td className="font-mono" style={{ color: '#a855f7' }}>{m.tasks}</td>
                      <td className="font-mono">{m.sessions}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(score, 100)}%`, background: m.color }}/>
                          </div>
                          <span className="font-orbitron text-xs font-bold" style={{ color: m.color }}>{score}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
