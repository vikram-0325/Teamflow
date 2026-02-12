'use client';
// app/tasks/page.tsx
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth-context';
import { TEAM_MEMBERS } from '@/lib/team';
import { subscribeTasks, createTask, updateTaskStatus, deleteTask } from '@/lib/db';
import type { Task } from '@/types';
import { format } from 'date-fns';
export const dynamic = "force-dynamic";

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'backlog', label: 'BACKLOG', color: '#444' },
  { id: 'todo', label: 'TO DO', color: '#a855f7' },
  { id: 'inprogress', label: 'IN PROGRESS', color: '#00d4ff' },
  { id: 'review', label: 'REVIEW', color: '#f59e0b' },
  { id: 'done', label: 'DONE', color: '#00ff88' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: '#444', medium: '#f59e0b', high: '#ff6b35', critical: '#ff4060'
};

function TaskCard({ task, isAdmin, onStatusChange, onDelete }: {
  task: Task; isAdmin: boolean;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDelete: (id: string) => void;
}) {
  const member = TEAM_MEMBERS.find(m => m.id === task.assignedTo);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div className="rounded-xl p-4 mb-3 transition-all hover:scale-[1.01] cursor-pointer group"
      style={{
        background: 'rgba(10,22,45,0.9)',
        border: `1px solid ${PRIORITY_COLORS[task.priority] || '#444'}25`,
      }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold leading-tight">{task.title}</h4>
        <span className="badge flex-shrink-0" style={{
          background: `${PRIORITY_COLORS[task.priority]}15`,
          color: PRIORITY_COLORS[task.priority],
          border: `1px solid ${PRIORITY_COLORS[task.priority]}30`,
          fontSize: 9, padding: '2px 7px'
        }}>
          {task.priority.toUpperCase()}
        </span>
      </div>
      {task.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(180,210,255,0.45)' }}>
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        {member && (
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-orbitron text-xs"
              style={{ background: `${member.color}20`, color: member.color, fontSize: 8 }}>
              {member.avatar}
            </span>
            <span className="text-xs" style={{ color: 'rgba(180,210,255,0.5)' }}>{member.name}</span>
          </div>
        )}
        {task.dueDate && (
          <span className={`text-xs font-mono ${isOverdue ? 'text-red-400' : ''}`}
            style={{ color: isOverdue ? '#ff4060' : 'rgba(180,210,255,0.35)' }}>
            {isOverdue ? '⚠ ' : ''}{format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>
      {task.tags?.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {task.tags.map(tag => (
            <span key={tag} className="badge" style={{
              background: 'rgba(0,212,255,0.06)', color: 'rgba(0,212,255,0.5)',
              border: '1px solid rgba(0,212,255,0.1)', fontSize: 9, padding: '1px 6px'
            }}>#{tag}</span>
          ))}
        </div>
      )}
      {(isAdmin) && (
        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {COLUMNS.filter(c => c.id !== task.status).slice(0, 2).map(col => (
            <button key={col.id} className="text-xs px-2 py-1 rounded"
              style={{ background: `${col.color}15`, color: col.color, border: `1px solid ${col.color}30` }}
              onClick={() => onStatusChange(task.id, col.id)}>
              → {col.label}
            </button>
          ))}
          <button className="text-xs px-2 py-1 rounded ml-auto"
            style={{ background: 'rgba(255,64,96,0.1)', color: '#ff4060', border: '1px solid rgba(255,64,96,0.2)' }}
            onClick={() => onDelete(task.id)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { member, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({
    title: '', description: '', assignedTo: member?.id || '',
    priority: 'medium' as Task['priority'], dueDate: '', tags: '', githubPR: '',
  });

  useEffect(() => { return subscribeTasks(setTasks); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.assignedTo || !member) return;
    await createTask({
      title: form.title, description: form.description,
      assignedTo: form.assignedTo, priority: form.priority,
      dueDate: form.dueDate, status: 'todo', createdBy: member.id,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      githubPR: form.githubPR,
    });
    setShowModal(false);
    setForm({ title: '', description: '', assignedTo: member.id, priority: 'medium', dueDate: '', tags: '', githubPR: '' });
  };

  const filtered = tasks.filter(t => filter === 'all' || t.assignedTo === filter);

  return (
    <AppLayout>
      <div className="animate-fadeUp">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="font-mono text-xs tracking-widest mb-1" style={{ color: '#00d4ff' }}>//TASK BOARD</div>
            <h1 className="font-orbitron text-3xl font-black gradient-text">Kanban Board</h1>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <select className="tf-input" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Members</option>
              {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {(isAdmin || true) && (
              <button className="btn-primary" onClick={() => setShowModal(true)}>+ NEW TASK</button>
            )}
          </div>
        </div>

        {/* Kanban */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))', overflowX: 'auto' }}>
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="rounded-2xl p-4"
                style={{ background: 'rgba(5,12,25,0.7)', border: `1px solid ${col.color}15`, minWidth: 220 }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-orbitron text-xs tracking-widest font-bold"
                    style={{ color: col.color }}>
                    {col.label}
                  </div>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: `${col.color}20`, color: col.color }}>
                    {colTasks.length}
                  </span>
                </div>
                <div style={{ minHeight: 80 }}>
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id} task={task} isAdmin={isAdmin}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-xs font-mono"
                      style={{ color: 'rgba(180,210,255,0.2)', borderRadius: 8, border: '1px dashed rgba(180,210,255,0.1)' }}>
                      EMPTY
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="font-orbitron text-xs tracking-widest mb-4" style={{ color: '#00d4ff' }}>
                // CREATE TASK
              </div>
              <h3 className="font-orbitron text-xl font-bold mb-6">New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>TITLE *</label>
                  <input className="tf-input" placeholder="Task title..." value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>DESCRIPTION</label>
                  <textarea className="tf-input" rows={3} placeholder="Task details..."
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>ASSIGN TO *</label>
                    <select className="tf-input" value={form.assignedTo}
                      onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                      <option value="">Select member</option>
                      {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>PRIORITY</label>
                    <select className="tf-input" value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>DUE DATE</label>
                    <input type="date" className="tf-input" value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>GITHUB PR URL</label>
                    <input className="tf-input" placeholder="https://github.com/..." value={form.githubPR}
                      onChange={e => setForm(f => ({ ...f, githubPR: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest mb-1.5" style={{ color: '#00d4ff' }}>TAGS (comma-separated)</label>
                  <input className="tf-input" placeholder="frontend, api, urgent" value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-primary" onClick={handleCreate} disabled={!form.title || !form.assignedTo}>
                  + CREATE TASK
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
