'use client';
// app/reports/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { TEAM_MEMBERS, getMemberById } from '@/lib/team';
import { submitReport, subscribeReports, updateReport } from '@/lib/db';
import type { WeeklyReport } from '@/types';
import { format, startOfWeek, endOfWeek } from 'date-fns';
export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: '#444', submitted: '#00d4ff', approved: '#00ff88', revision: '#ff6b35'
};

function XPBar({ score, level }: { score: number; level: string }) {
  const colors: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2', elite: '#00d4ff' };
  const color = colors[level] || '#00d4ff';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-xs" style={{ color }}>⚡ {level.toUpperCase()}</span>
        <span className="font-orbitron text-sm font-bold" style={{ color }}>{score} XP</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { member, isAdmin } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [form, setForm] = useState({
    completedTasksText: '',
    challenges: '',
    nextWeekGoals: '',
    totalHours: 0,
    githubCommits: 0,
  });

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => { return subscribeReports(setReports); }, []);

  const myCurrentReport = reports.find(r => r.userId === member?.id && r.weekStart === weekStart);

  const handleSubmit = async () => {
    if (!member) return;
    const reportData: Omit<WeeklyReport, 'id'> = {
      userId: member.id, userName: member.name, weekStart, weekEnd,
      completedTasks: form.completedTasksText.split('\n').filter(Boolean),
      challenges: form.challenges, nextWeekGoals: form.nextWeekGoals,
      totalHours: Number(form.totalHours), githubCommits: Number(form.githubCommits),
      status: 'submitted', submittedAt: new Date().toISOString(),
    };
    await submitReport(reportData);
    setShowForm(false);
  };

  const handleApprove = async (reportId: string) => {
    await updateReport(reportId, {
      status: 'approved', adminComment, approvedAt: new Date().toISOString()
    });
    setSelectedReport(null);
    setAdminComment('');
  };

  const handleRevision = async (reportId: string) => {
    await updateReport(reportId, { status: 'revision', adminComment });
    setSelectedReport(null);
    setAdminComment('');
  };

  const calcXP = (r: WeeklyReport) => {
    const base = r.totalHours * 10 + r.githubCommits * 15 + r.completedTasks.length * 20;
    const bonus = r.status === 'approved' ? 50 : 0;
    return Math.min(base + bonus, 100);
  };

  const calcLevel = (xp: number) => {
    if (xp >= 90) return 'elite';
    if (xp >= 70) return 'platinum';
    if (xp >= 50) return 'gold';
    if (xp >= 30) return 'silver';
    return 'bronze';
  };

  const myReports = reports.filter(r => r.userId === member?.id);
  const allReports = isAdmin ? reports : myReports;

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#00d4ff' }}>//WEEKLY REPORTS</div>
            <h1 className="font-orbitron text-3xl font-black gradient-text">Weekly Reports</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(180,210,255,0.4)' }}>
              Week of {format(new Date(weekStart), 'MMM d')} – {format(new Date(weekEnd), 'MMM d, yyyy')}
            </p>
          </div>
          {!myCurrentReport && !isAdmin && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + SUBMIT THIS WEEK
            </button>
          )}
        </div>

        {/* My XP Summary */}
        {myReports.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-6 glow-border">
            <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#a855f7' }}>
              ⚡ YOUR PERFORMANCE SCORE
            </div>
            {(() => {
              const latest = myReports[0];
              const xp = calcXP(latest);
              const level = calcLevel(xp);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                  <XPBar score={xp} level={level} />
                  <div className="text-center">
                    <div className="font-orbitron text-4xl font-black" style={{ color: '#fff' }}>
                      {latest.totalHours}h
                    </div>
                    <div className="text-xs font-mono mt-1" style={{ color: 'rgba(180,210,255,0.4)' }}>HOURS LOGGED</div>
                  </div>
                  <div className="text-center">
                    <div className="font-orbitron text-4xl font-black" style={{ color: '#00ff88' }}>
                      {latest.completedTasks.length}
                    </div>
                    <div className="text-xs font-mono mt-1" style={{ color: 'rgba(180,210,255,0.4)' }}>TASKS DONE</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Reports list */}
        <div className="space-y-4">
          {allReports.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="font-orbitron text-sm mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>NO REPORTS YET</div>
              <p className="text-sm" style={{ color: 'rgba(180,210,255,0.3)' }}>Submit your first weekly report to start tracking progress.</p>
            </div>
          ) : (
            allReports.map(report => {
              const tm = getMemberById(report.userId);
              const xp = calcXP(report);
              const level = calcLevel(xp);
              return (
                <div key={report.id} className="glass rounded-2xl p-5 glow-border"
                  style={{ borderColor: `${STATUS_COLORS[report.status]}20` }}>
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      {tm && (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-orbitron text-xs font-bold"
                          style={{ background: `${tm.color}15`, border: `1px solid ${tm.color}30`, color: tm.color }}>
                          {tm.avatar}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{report.userName}</div>
                        <div className="text-xs font-mono" style={{ color: 'rgba(180,210,255,0.4)' }}>
                          Week of {format(new Date(report.weekStart), 'MMM d')} – {format(new Date(report.weekEnd), 'MMM d')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge" style={{
                        background: `${STATUS_COLORS[report.status]}15`,
                        color: STATUS_COLORS[report.status],
                        border: `1px solid ${STATUS_COLORS[report.status]}30`,
                      }}>{report.status.toUpperCase()}</span>
                      <span className="font-orbitron text-lg font-bold" style={{ color: '#00d4ff' }}>{xp} XP</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[
                      { label: 'Hours', val: `${report.totalHours}h`, color: '#00d4ff' },
                      { label: 'Commits', val: report.githubCommits, color: '#00ff88' },
                      { label: 'Tasks Done', val: report.completedTasks.length, color: '#a855f7' },
                      { label: 'Level', val: level.toUpperCase(), color: '#ff6b35' },
                    ].map(s => (
                      <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: `${s.color}06`, border: `1px solid ${s.color}15` }}>
                        <div className="font-orbitron text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(180,210,255,0.4)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {report.completedTasks.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-mono mb-2" style={{ color: 'rgba(0,212,255,0.5)' }}>COMPLETED TASKS</div>
                      <ul className="space-y-1">
                        {report.completedTasks.map((t, i) => (
                          <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'rgba(180,210,255,0.7)' }}>
                            <span style={{ color: '#00ff88' }}>✓</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.challenges && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(255,107,53,0.05)', border: '1px solid rgba(255,107,53,0.1)' }}>
                      <div className="text-xs font-mono mb-1" style={{ color: '#ff6b35' }}>CHALLENGES</div>
                      <p className="text-sm" style={{ color: 'rgba(180,210,255,0.6)' }}>{report.challenges}</p>
                    </div>
                  )}

                  {report.adminComment && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.1)' }}>
                      <div className="text-xs font-mono mb-1" style={{ color: '#a855f7' }}>⚡ ADMIN FEEDBACK</div>
                      <p className="text-sm" style={{ color: 'rgba(180,210,255,0.6)' }}>{report.adminComment}</p>
                    </div>
                  )}

                  {isAdmin && report.status === 'submitted' && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
                      <div className="text-xs font-mono mb-2" style={{ color: '#a855f7' }}>ADMIN REVIEW</div>
                      <textarea className="tf-input mb-3" rows={2} placeholder="Add feedback comment..."
                        value={selectedReport?.id === report.id ? adminComment : ''}
                        onFocus={() => setSelectedReport(report)}
                        onChange={e => setAdminComment(e.target.value)} />
                      <div className="flex gap-3">
                        <button className="btn-primary btn-sm" onClick={() => handleApprove(report.id)}>✓ APPROVE</button>
                        <button className="btn-danger btn-sm" onClick={() => handleRevision(report.id)}>↩ REQUEST REVISION</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Submit Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#00d4ff' }}>
                // WEEKLY REPORT
              </div>
              <h3 className="font-orbitron text-xl font-bold mb-1">Submit Report</h3>
              <p className="text-xs font-mono mb-6" style={{ color: 'rgba(180,210,255,0.4)' }}>
                Week: {format(new Date(weekStart), 'MMM d')} – {format(new Date(weekEnd), 'MMM d')}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>
                    COMPLETED TASKS (one per line)
                  </label>
                  <textarea className="tf-input" rows={4} placeholder={"Finished homepage redesign\nFixed API authentication bug\nCompleted client presentation"}
                    value={form.completedTasksText} onChange={e => setForm(f => ({ ...f, completedTasksText: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#ff6b35' }}>CHALLENGES FACED</label>
                  <textarea className="tf-input" rows={2} placeholder="Any blockers or challenges this week..."
                    value={form.challenges} onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00ff88' }}>NEXT WEEK GOALS</label>
                  <textarea className="tf-input" rows={2} placeholder="Your focus and goals for next week..."
                    value={form.nextWeekGoals} onChange={e => setForm(f => ({ ...f, nextWeekGoals: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>TOTAL HOURS WORKED</label>
                    <input type="number" min="0" max="80" className="tf-input" value={form.totalHours}
                      onChange={e => setForm(f => ({ ...f, totalHours: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00ff88' }}>GITHUB COMMITS</label>
                    <input type="number" min="0" className="tf-input" value={form.githubCommits}
                      onChange={e => setForm(f => ({ ...f, githubCommits: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-primary" onClick={handleSubmit}>▶ SUBMIT REPORT</button>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
