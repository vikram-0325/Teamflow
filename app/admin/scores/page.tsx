'use client';
// app/admin/scores/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { TEAM_MEMBERS } from '@/lib/team';
import { subscribeReports, getAllGitStats, getAllSessions } from '@/lib/db';
import type { WeeklyReport, GitStats, WorkSession } from '@/types';

export default function AdminScoresPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [gitStats, setGitStats] = useState<GitStats[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/dashboard');
  }, [isAdmin, loading]);

  useEffect(() => {
    getAllSessions(30).then(setSessions);
    getAllGitStats().then(setGitStats);
    const unsub = subscribeReports(setReports);
    return unsub;
  }, []);

  const membersData = TEAM_MEMBERS.map(tm => {
    const ms = sessions.filter(s => s.userId === tm.id);
    const gs = gitStats.find(g => g.userId === tm.id);
    const rs = reports.filter(r => r.userId === tm.id);
    const hours = Math.round(ms.reduce((a, s) => a + (s.duration || 0), 0) / 60 * 10) / 10;
    const commits = gs?.weeklyCommits || 0;
    const tasks = rs.reduce((a, r) => a + r.completedTasks.length, 0);
    const approved = rs.filter(r => r.status === 'approved').length;

    // TF Score formula
    const maxHours = 40, maxCommits = 30, maxTasks = 20;
    const hoursScore   = Math.min((hours / maxHours) * 25, 25);
    const commitsScore = Math.min((commits / maxCommits) * 20, 20);
    const tasksScore   = Math.min((tasks / maxTasks) * 30, 30);
    const reportScore  = Math.min((approved / Math.max(rs.length, 1)) * 10, 10);
    const speedScore   = Math.min(ms.length * 1.5, 15);
    const totalScore = Math.round(hoursScore + commitsScore + tasksScore + reportScore + speedScore);

    return {
      ...tm,
      hours, commits, tasks, reports: rs.length, approvedReports: approved,
      hoursScore, commitsScore, tasksScore, reportScore, speedScore, totalScore,
      xp: Math.round(hours * 15 + commits * 25 + tasks * 30 + rs.length * 50),
    };
  }).sort((a, b) => b.totalScore - a.totalScore).map((m, i) => ({ ...m, rank: i + 1 }));

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="flex items-center gap-3 mb-2"><span className="badge badge-purple">⚡ ADMIN</span></div>
        <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#a855f7' }}>//LEADERBOARD</div>
        <h1 className="font-orbitron text-3xl font-black gradient-text mb-8">TF Score Leaderboard</h1>

        {/* Formula explanation */}
        <div className="glass rounded-2xl p-5 mb-6 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-3" style={{ color: '#00d4ff' }}>// TF SCORE™ FORMULA</div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Tasks %', val: '30pts', color: '#a855f7' },
              { label: 'Active Hours', val: '25pts', color: '#00d4ff' },
              { label: 'Commits', val: '20pts', color: '#00ff88' },
              { label: 'Task Speed', val: '15pts', color: '#ff6b35' },
              { label: 'Report Quality', val: '10pts', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="px-3 py-2 rounded-xl flex items-center gap-2"
                style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                <span className="font-orbitron text-sm font-bold" style={{ color: s.color }}>{s.val}</span>
                <span className="text-xs" style={{ color: 'rgba(180,210,255,0.5)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div className="glass rounded-2xl p-6 mb-6 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-6" style={{ color: '#ffd700' }}>// TOP 3</div>
          <div className="flex items-end justify-center gap-4">
            {[membersData[1], membersData[0], membersData[2]].filter(Boolean).map((m, i) => {
              const heights = [120, 160, 100];
              const medals = ['🥈', '🥇', '🥉'];
              const colors = ['#c0c0c0', '#ffd700', '#cd7f32'];
              return (
                <div key={m.id} className="flex flex-col items-center gap-2" style={{ width: 100 }}>
                  <div className="font-mono text-lg">{medals[i]}</div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-orbitron text-sm font-black"
                    style={{ background: `${m.color}20`, border: `2px solid ${m.color}40`, color: m.color }}>
                    {m.avatar}
                  </div>
                  <div className="text-xs font-semibold text-center">{m.name}</div>
                  <div className="font-orbitron text-xl font-black text-center" style={{ color: colors[i] }}>
                    {m.totalScore}
                  </div>
                  <div className="w-full rounded-t-lg flex items-end justify-center"
                    style={{ height: heights[i], background: `${colors[i]}15`, border: `1px solid ${colors[i]}30` }}>
                    <div className="font-mono text-xs p-2 text-center" style={{ color: colors[i] }}>
                      #{m.rank}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
            <div className="font-orbitron text-xs tracking-widest" style={{ color: '#a855f7' }}>
              // FULL RANKINGS
            </div>
          </div>
          <table className="tf-table">
            <thead>
              <tr>
                <th>RANK</th><th>MEMBER</th>
                <th>TASKS <span style={{ color: '#a855f7' }}>30</span></th>
                <th>HOURS <span style={{ color: '#00d4ff' }}>25</span></th>
                <th>COMMITS <span style={{ color: '#00ff88' }}>20</span></th>
                <th>SPEED <span style={{ color: '#ff6b35' }}>15</span></th>
                <th>REPORT <span style={{ color: '#f59e0b' }}>10</span></th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {membersData.map(m => (
                <tr key={m.id}>
                  <td>
                    <span className="font-orbitron text-lg font-black"
                      style={{ color: m.rank === 1 ? '#ffd700' : m.rank === 2 ? '#c0c0c0' : m.rank === 3 ? '#cd7f32' : '#555' }}>
                      #{m.rank}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center font-orbitron font-black"
                        style={{ background: `${m.color}20`, color: m.color, fontSize: 10 }}>{m.avatar}</span>
                      <div>
                        <div className="font-semibold text-sm">{m.name}</div>
                        <div className="text-xs" style={{ color: 'rgba(180,210,255,0.4)', fontSize: 10 }}>{m.xp.toLocaleString()} XP</div>
                      </div>
                    </div>
                  </td>
                  {[
                    { val: m.tasksScore.toFixed(1), max: 30, color: '#a855f7' },
                    { val: m.hoursScore.toFixed(1), max: 25, color: '#00d4ff' },
                    { val: m.commitsScore.toFixed(1), max: 20, color: '#00ff88' },
                    { val: m.speedScore.toFixed(1), max: 15, color: '#ff6b35' },
                    { val: m.reportScore.toFixed(1), max: 10, color: '#f59e0b' },
                  ].map((s, i) => (
                    <td key={i}>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(parseFloat(s.val)/s.max)*100}%`, background: s.color }}/>
                        </div>
                        <span className="font-mono text-xs font-bold" style={{ color: s.color }}>{s.val}</span>
                      </div>
                    </td>
                  ))}
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron text-xl font-black" style={{ color: m.color }}>{m.totalScore}</span>
                      <span className="text-xs font-mono" style={{ color: 'rgba(180,210,255,0.3)' }}>/100</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
