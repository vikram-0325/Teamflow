// lib/db.ts
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, onSnapshot,
  Timestamp, serverTimestamp, limit
} from 'firebase/firestore';
import { ref, set, onValue, onDisconnect, serverTimestamp as rtServerTimestamp } from 'firebase/database';
import { db, rtdb } from './firebase';
import type { WorkSession, Task, WeeklyReport, GitStats, Milestone, ProductivityScore } from '@/types';

// ─── WORK SESSIONS ───────────────────────────────────────────────────────────

export async function clockIn(userId: string, userName: string, taskDescription: string) {
 const session = {
  userId, userName, taskDescription,
  clockIn: new Date().toISOString(),
  date: new Date().toISOString().split('T')[0],
  createdAt: serverTimestamp(),
};
  const docRef = await addDoc(collection(db, 'workSessions'), session);
  await updatePresence(userId, 'working', taskDescription);
  return docRef.id;
}

export async function clockOut(sessionId: string, userId: string) {
  const sessionRef = doc(db, 'workSessions', sessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) throw new Error('Session not found');
  const data = snap.data() as WorkSession;
  const clockOutTime = new Date().toISOString();
  const duration = Math.round((new Date(clockOutTime).getTime() - new Date(data.clockIn).getTime()) / 60000);
  await updateDoc(sessionRef, { clockOut: clockOutTime, duration });
  await updatePresence(userId, 'online');
  return duration;
}

export async function getActiveSessions() {
  const q = query(collection(db, 'workSessions'), where('clockOut', '==', null));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as WorkSession[];
}

export async function getUserSessions(userId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'workSessions'),
    where('userId', '==', userId),
    where('date', '>=', since.toISOString().split('T')[0]),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as WorkSession[];
}

export async function getAllSessions(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'workSessions'),
    where('date', '>=', since.toISOString().split('T')[0]),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as WorkSession[];
}

export function subscribeToSessions(callback: (sessions: WorkSession[]) => void) {
  const q = query(collection(db, 'workSessions'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as WorkSession[]);
  });
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'tasks'), { ...task, createdAt: now, updatedAt: now });
  return docRef.id;
}

export async function updateTaskStatus(taskId: string, status: Task['status']) {
  await updateDoc(doc(db, 'tasks', taskId), { status, updatedAt: new Date().toISOString() });
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  await updateDoc(doc(db, 'tasks', taskId), { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, 'tasks', taskId));
}

export function subscribeTasks(callback: (tasks: Task[]) => void) {
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
  });
}

// ─── WEEKLY REPORTS ──────────────────────────────────────────────────────────

export async function submitReport(report: Omit<WeeklyReport, 'id'>) {
  const docRef = await addDoc(collection(db, 'weeklyReports'), report);
  return docRef.id;
}

export async function updateReport(reportId: string, updates: Partial<WeeklyReport>) {
  await updateDoc(doc(db, 'weeklyReports', reportId), updates);
}

export async function getUserReports(userId: string) {
  const q = query(collection(db, 'weeklyReports'), where('userId', '==', userId), orderBy('weekStart', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as WeeklyReport[];
}

export function subscribeReports(callback: (reports: WeeklyReport[]) => void) {
  const q = query(collection(db, 'weeklyReports'), orderBy('weekStart', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as WeeklyReport[]);
  });
}

// ─── MILESTONES ──────────────────────────────────────────────────────────────

export async function createMilestone(milestone: Omit<Milestone, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(db, 'milestones'), {
    ...milestone, createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateMilestone(id: string, updates: Partial<Milestone>) {
  await updateDoc(doc(db, 'milestones', id), updates);
}

export function subscribeMilestones(callback: (milestones: Milestone[]) => void) {
  const q = query(collection(db, 'milestones'), orderBy('deadline', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Milestone[]);
  });
}

// ─── GIT STATS ───────────────────────────────────────────────────────────────

export async function updateGitStats(userId: string, stats: Partial<GitStats>) {
  await setDoc(doc(db, 'githubStats', userId), {
    ...stats, userId, lastUpdated: new Date().toISOString()
  }, { merge: true });
}

export async function getAllGitStats() {
  const snap = await getDocs(collection(db, 'githubStats'));
  return snap.docs.map(d => d.data()) as GitStats[];
}

// ─── PRODUCTIVITY SCORES ─────────────────────────────────────────────────────

export function calcLevel(score: number): ProductivityScore['level'] {
  if (score >= 90) return 'elite';
  if (score >= 75) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  return 'bronze';
}

export async function saveProductivityScore(score: Omit<ProductivityScore, 'level'>) {
  const level = calcLevel(score.totalScore);
  const docId = `${score.userId}_${score.weekStart}`;
  await setDoc(doc(db, 'productivityScores', docId), { ...score, level });
}

// ─── PRESENCE ────────────────────────────────────────────────────────────────

export async function updatePresence(userId: string, status: string, currentTask?: string) {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  const data: any = { userId, status, lastSeen: new Date().toISOString() };
  if (currentTask) data.currentTask = currentTask;
  await set(presenceRef, data);
  onDisconnect(presenceRef).set({ userId, status: 'offline', lastSeen: rtServerTimestamp() });
}

export function subscribePresence(callback: (presence: any[]) => void) {
  const presenceRef = ref(rtdb, 'presence');
  return onValue(presenceRef, snap => {
    const data = snap.val() || {};
    callback(Object.values(data));
  });
}
