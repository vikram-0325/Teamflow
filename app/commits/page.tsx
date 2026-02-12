'use client';
// app/commits/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { TEAM_MEMBERS } from '@/lib/team';
import { updateGitStats, getAllGitStats } from '@/lib/db';
import type { GitStats } from '@/types';

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

function CommitHeatBar({ activity }: { activity: { day: string; count: number }[] }) {
  const max = Math.max(...activity.map(a => a.count), 1);
  return (
    <div className="flex gap-1.5 items-end" style={{ height: 40 }}>
      {DAYS.map((day, i) => {
        const dayData = activity.find(a => a.day === day) || { day, count: 0 };
        const height = Math.max((dayData.count / max) * 100, 4);
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-sm transition-all"
              style={{
                height: `${height}%`,
                minHeight: 3,
                background: dayData.count > 0
                  ? `rgba(0,255,136,${Math.min(0.3 + (dayData.count/max)*0.7, 1)})`
                  : 'rgba(255,255,255,0.05)',
              }}
              title={`${day}: ${dayData.count} commits`}
            />
            <span className="font-mono" style={{ fontSize: 8, color: 'rgba(180,210,255,0.3)' }}>{day[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CommitsPage() {
  const { member, isAdmin } = useAuth();
  const [stats, setStats] = useState<GitStats[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    weeklyCommits: 0, totalCommits: 0, pullRequests: 0, mergedPRs: 0, repos: '', targetUserId: member?.id || ''
  });

  const loadStats = () => getAllGitStats().then(setStats);
  useEffect(() => { loadStats(); }, []);

  const handleSubmit = async () => {
    const target = isAdmin ? form.targetUserId : member?.id;
    if (!target) return;
    const existing = stats.find(s => s.userId === target);
    await updateGitStats(target, {
      weeklyCommits: Number(form.weeklyCommits),
      totalCommits: Number(form.totalCommits),
      pullRequests: Number(form.pullRequests),
      mergedPRs: Number(form.mergedPRs),
      repos: form.repos.split(',').map(r => r.trim()).filter(Boolean),
      weeklyActivity: DAYS.map(day => ({
        day,
        count: Math.floor(Math.random() * (Number(form.weeklyCommits) / 3))
      })),
    });
    await loadStats();
    setShowModal(false);
  };

  const totalTeamCommits = stats.reduce((a, s) => a + (s.weeklyCommits || 0), 0);
  const totalPRs = stats.reduce((a, s) => a + (s.pullRequests || 0), 0);
  const totalMerged = stats.reduce((a, s) => a + (s.mergedPRs || 0), 0);

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#00d4ff' }}>//GIT COMMITS</div>
            <h1 className="font-orbitron text-3xl font-black gradient-text">GitHub Activity</h1>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + LOG COMMITS
          </button>
        </div>

        {/* Team totals */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '// WEEKLY COMMITS', value: totalTeamCommits, color: '#00ff88' },
            { label: '// PULL REQUESTS', value: totalPRs, color: '#a855f7' },
            { label: '// MERGED PRs', value: totalMerged, color: '#00d4ff' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 glow-border text-center">
              <div className="font-mono text-xs tracking-widest mb-2" style={{ color: s.color }}>{s.label}</div>
              <div className="font-orbitron text-4xl font-black" style={{ color: '#fff' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(180,210,255,0.4)' }}>team this week</div>
            </div>
          ))}
        </div>

        {/* Per member cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TEAM_MEMBERS.map(tm => {
            const gs = stats.find(s => s.userId === tm.id);
            return (
              <div key={tm.id} className="glass rounded-2xl p-5 glow-border"
                style={{ borderColor: `${tm.color}20` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-orbitron text-xs font-bold"
                    style={{ background: `${tm.color}15`, border: `1px solid ${tm.color}30`, color: tm.color }}>
                    {tm.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{tm.name}</div>
                    <div className="text-xs" style={{ color: 'rgba(180,210,255,0.4)' }}>{tm.title}</div>
                  </div>
                </div>

                {gs ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: 'Weekly', val: gs.weeklyCommits || 0, color: '#00ff88' },
                        { label: 'Total', val: gs.totalCommits || 0, color: '#00d4ff' },
                        { label: 'PRs', val: gs.pullRequests || 0, color: '#a855f7' },
                        { label: 'Merged', val: gs.mergedPRs || 0, color: '#ff6b35' },
                      ].map(m => (
                        <div key={m.label} className="text-center p-2 rounded-lg"
                          style={{ background: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                          <div className="font-orbitron text-xl font-bold" style={{ color: m.color }}>{m.val}</div>
                          <div className="text-xs" style={{ color: 'rgba(180,210,255,0.4)', fontFamily: 'JetBrains Mono', fontSize: 10 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    {gs.weeklyActivity && gs.weeklyActivity.length > 0 && (
                      <CommitHeatBar activity={gs.weeklyActivity} />
                    )}
                    {gs.repos?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {gs.repos.slice(0, 3).map(r => (
                          <span key={r} className="badge badge-blue" style={{ fontSize: 9 }}>{r}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-xs font-mono" style={{ color: 'rgba(180,210,255,0.3)' }}>
                      Updated {gs.lastUpdated ? new Date(gs.lastUpdated).toLocaleDateString() : 'never'}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6" style={{ color: 'rgba(180,210,255,0.3)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                    No data yet
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Log Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#00d4ff' }}>
                // LOG GIT ACTIVITY
              </div>
              <h3 className="font-orbitron text-xl font-bold mb-6">Update GitHub Stats</h3>
              <div className="space-y-4">
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>FOR MEMBER</label>
                    <select className="tf-input" value={form.targetUserId}
                      onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}>
                      {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'weeklyCommits', label: 'WEEKLY COMMITS' },
                    { key: 'totalCommits', label: 'TOTAL COMMITS' },
                    { key: 'pullRequests', label: 'PULL REQUESTS' },
                    { key: 'mergedPRs', label: 'MERGED PRs' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>{f.label}</label>
                      <input type="number" min="0" className="tf-input"
                        value={(form as any)[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>REPOS (comma-separated)</label>
                  <input className="tf-input" placeholder="teamflow-app, backend-api" value={form.repos}
                    onChange={e => setForm(f => ({ ...f, repos: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-primary" onClick={handleSubmit}>SAVE STATS</button>
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
