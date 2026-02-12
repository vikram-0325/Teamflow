'use client';
// app/milestones/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { subscribeMilestones, createMilestone, updateMilestone } from '@/lib/db';
import type { Milestone } from '@/types';
import { format, differenceInDays } from 'date-fns';

const STATUS_MAP = {
  on_track: { label: 'ON TRACK', color: '#00ff88' },
  at_risk:  { label: 'AT RISK',  color: '#f59e0b' },
  delayed:  { label: 'DELAYED',  color: '#ff4060' },
  completed:{ label: 'COMPLETE', color: '#00d4ff' },
};

function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const r = 36; const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x="44" y="44" textAnchor="middle" dominantBaseline="middle"
        style={{ fill: color, fontFamily: 'Orbitron', fontSize: 14, fontWeight: 900 }}>
        {progress}%
      </text>
    </svg>
  );
}

export default function MilestonesPage() {
  const { member, isAdmin } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', deadline: '',
    progress: 0, status: 'on_track' as Milestone['status'],
  });

  useEffect(() => { return subscribeMilestones(setMilestones); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', description: '', deadline: '', progress: 0, status: 'on_track' });
    setShowModal(true);
  };

  const openEdit = (m: Milestone) => {
    setEditingId(m.id);
    setForm({ title: m.title, description: m.description, deadline: m.deadline, progress: m.progress, status: m.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!member || !form.title) return;
    if (editingId) {
      await updateMilestone(editingId, { ...form });
    } else {
      await createMilestone({ ...form, linkedTasks: [], createdBy: member.id });
    }
    setShowModal(false);
  };

  const totalProgress = milestones.length
    ? Math.round(milestones.reduce((a, m) => a + m.progress, 0) / milestones.length)
    : 0;

  const onTrack = milestones.filter(m => m.status === 'on_track').length;
  const atRisk = milestones.filter(m => m.status === 'at_risk').length;
  const delayed = milestones.filter(m => m.status === 'delayed').length;

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#00d4ff' }}>//MILESTONES</div>
            <h1 className="font-orbitron text-3xl font-black gradient-text">Milestone Tracker</h1>
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={openCreate}>+ NEW MILESTONE</button>
          )}
        </div>

        {/* Overall progress */}
        <div className="glass rounded-2xl p-6 mb-6 glow-border">
          <div className="font-orbitron text-xs tracking-widest mb-5" style={{ color: '#00d4ff' }}>// OVERALL PROGRESS</div>
          <div className="flex items-center gap-8 flex-wrap">
            <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" strokeWidth="8"
                  strokeDasharray={2*Math.PI*42} strokeDashoffset={2*Math.PI*42*(1-totalProgress/100)}
                  strokeLinecap="round" transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}/>
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00d4ff"/>
                    <stop offset="100%" stopColor="#a855f7"/>
                  </linearGradient>
                </defs>
                <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
                  style={{ fill: '#fff', fontFamily: 'Orbitron', fontSize: 18, fontWeight: 900 }}>
                  {totalProgress}%
                </text>
              </svg>
            </div>
            <div className="flex gap-6 flex-wrap">
              {[
                { label: 'TOTAL', val: milestones.length, color: '#00d4ff' },
                { label: 'ON TRACK', val: onTrack, color: '#00ff88' },
                { label: 'AT RISK', val: atRisk, color: '#f59e0b' },
                { label: 'DELAYED', val: delayed, color: '#ff4060' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="font-orbitron text-3xl font-black" style={{ color: s.color }}>{s.val}</div>
                  <div className="font-mono text-xs mt-1" style={{ color: 'rgba(180,210,255,0.4)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestones grid */}
        {milestones.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="font-orbitron text-sm mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>NO MILESTONES</div>
            <p className="text-sm" style={{ color: 'rgba(180,210,255,0.3)' }}>
              {isAdmin ? 'Create your first milestone to track progress.' : 'No milestones have been set yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {milestones.map(m => {
              const status = STATUS_MAP[m.status];
              const daysLeft = differenceInDays(new Date(m.deadline), new Date());
              const isUrgent = daysLeft <= 7 && m.status !== 'completed';
              return (
                <div key={m.id} className="glass rounded-2xl p-5 glow-border"
                  style={{ borderColor: `${status.color}20` }}>
                  <div className="flex items-start gap-5">
                    <ProgressRing progress={m.progress} color={status.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-orbitron text-sm font-bold">{m.title}</h3>
                        <span className="badge flex-shrink-0" style={{
                          background: `${status.color}15`, color: status.color, border: `1px solid ${status.color}30`
                        }}>{status.label}</span>
                      </div>
                      <p className="text-xs mt-1 mb-3 leading-relaxed" style={{ color: 'rgba(180,210,255,0.5)' }}>
                        {m.description}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`font-mono text-xs ${isUrgent ? '' : ''}`}
                          style={{ color: isUrgent ? '#ff4060' : 'rgba(180,210,255,0.4)' }}>
                          {isUrgent ? '⚠ ' : ''}
                          {m.status === 'completed' ? 'Completed' :
                            daysLeft > 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}
                        </span>
                        <span className="font-mono text-xs" style={{ color: 'rgba(180,210,255,0.3)' }}>
                          Due {format(new Date(m.deadline), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${m.progress}%`, background: `linear-gradient(90deg, ${status.color}, ${status.color}aa)`, transition: 'width 1s ease' }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="mt-4 pt-3 border-t flex gap-2 items-center" style={{ borderColor: 'rgba(0,212,255,0.06)' }}>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(m)}>✎ Edit</button>
                      {[25, 50, 75, 100].map(p => (
                        <button key={p} className="text-xs px-2 py-1 rounded"
                          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)', color: 'rgba(0,212,255,0.6)' }}
                          onClick={() => updateMilestone(m.id, { progress: p, status: p === 100 ? 'completed' : m.status })}>
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#00d4ff' }}>
                {editingId ? '// EDIT MILESTONE' : '// NEW MILESTONE'}
              </div>
              <h3 className="font-orbitron text-xl font-bold mb-6">
                {editingId ? 'Edit Milestone' : 'Create Milestone'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>TITLE *</label>
                  <input className="tf-input" placeholder="Milestone title..." value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>DESCRIPTION</label>
                  <textarea className="tf-input" rows={2} placeholder="What does this milestone represent?"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>DEADLINE</label>
                    <input type="date" className="tf-input" value={form.deadline}
                      onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>PROGRESS %</label>
                    <input type="number" min="0" max="100" className="tf-input" value={form.progress}
                      onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>STATUS</label>
                    <select className="tf-input" value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                      <option value="on_track">On Track</option>
                      <option value="at_risk">At Risk</option>
                      <option value="delayed">Delayed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-primary" onClick={handleSave} disabled={!form.title}>
                  {editingId ? '✓ SAVE CHANGES' : '+ CREATE MILESTONE'}
                </button>
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
