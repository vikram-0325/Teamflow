// ============================================================
// TEAMFLOW — src/app/page.tsx
// Single file deployment. Drop into src/app/page.tsx
//
// BEFORE DEPLOYING — add these to Vercel Environment Variables:
//   NEXT_PUBLIC_FIREBASE_API_KEY
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
//   NEXT_PUBLIC_FIREBASE_DATABASE_URL   ← full URL, not just project ID
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
//   NEXT_PUBLIC_FIREBASE_APP_ID
//   NEXT_PUBLIC_ADMIN_UID_1             ← Vikram's Firebase UID
//   NEXT_PUBLIC_ADMIN_UID_2             ← Yulissa's Firebase UID
//
// Firebase Console → Realtime Database → Rules → paste:
// {
//   "rules": {
//     "presence": { "$uid": { ".read": "auth != null", ".write": "auth != null && auth.uid === $uid" } },
//     "teamStatus": { ".read": "auth != null", "$uid": { ".write": "auth != null && auth.uid === $uid" } }
//   }
// }
// ============================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApps, initializeApp, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
  setDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  set,
  onDisconnect,
  onValue,
  off,
} from 'firebase/database';

// ─── Firebase Init (duplicate-safe) ───────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ─── Admin UIDs ────────────────────────────────────────────────────────────────
const ADMIN_UIDS = [
  process.env.NEXT_PUBLIC_ADMIN_UID_1 ?? '',
  process.env.NEXT_PUBLIC_ADMIN_UID_2 ?? '',
].filter(Boolean);

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: 'admin' | 'member';
}
interface WorkSession {
  id: string;
  userId: string;
  clockIn: Timestamp;
  clockOut?: Timestamp;
  duration?: number;
  taskDescription?: string;
  status: 'active' | 'completed';
}
interface Task {
  id: string;
  title: string;
  assignedTo: string;
  assignedName: string;
  status: 'Backlog' | 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  createdAt: Timestamp;
}
interface TeamPresence {
  [uid: string]: { status: string; displayName: string | null; photoURL: string | null };
}

// ─── Presence (auth-gated — fixes PERMISSION_DENIED) ──────────────────────────
function initPresence(user: User) {
  const presenceRef = ref(rtdb, `presence/${user.uid}`);
  const connectedRef = ref(rtdb, '.info/connected');

  const handler = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(presenceRef).set({ status: 'offline', displayName: user.displayName, photoURL: user.photoURL });
      set(presenceRef, { status: 'online', displayName: user.displayName, photoURL: user.photoURL }).catch(console.error);
    }
  });
  return () => off(connectedRef, 'value', handler);
}

async function setPresenceStatus(user: User, status: string) {
  if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;
  await set(ref(rtdb, `presence/${user.uid}`), {
    status, displayName: user.displayName, photoURL: user.photoURL,
  }).catch(console.error);
}

// ─── Utility ───────────────────────────────────────────────────────────────────
function formatTime(secs: number) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatDuration(secs?: number) {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

const COLS: Task['status'][] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
const PRIORITY_COLOR: Record<string, string> = { High: '#ff4d4d', Medium: '#f5a623', Low: '#00d4ff' };
const STATUS_COLOR: Record<string, string> = { online: '#00ff88', working: '#a855f7', idle: '#f5a623', offline: '#555' };

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function TeamFlow() {
  // ── Auth state ────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── App state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard'|'tasks'|'sessions'|'team'>('dashboard');
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamPresence, setTeamPresence] = useState<TeamPresence>({});
  const [elapsed, setElapsed] = useState(0);

  // ── Form state ────────────────────────────────────────────────────────────
  const [taskInput, setTaskInput] = useState('');
  const [clockDesc, setClockDesc] = useState('');
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium' as Task['priority'], dueDate: '' });
  const [showNewTask, setShowNewTask] = useState(false);
  const [dragTask, setDragTask] = useState<string | null>(null);

  const cleanupPresence = useRef<(() => void) | null>(null);

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Load or create profile
        const ref_ = doc(db, 'users', u.uid);
        const snap = await getDoc(ref_);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const p: UserProfile = {
            uid: u.uid, displayName: u.displayName, email: u.email,
            photoURL: u.photoURL, role: ADMIN_UIDS.includes(u.uid) ? 'admin' : 'member',
          };
          await setDoc(ref_, p);
          setProfile(p);
        }
        // Init presence ONLY after auth confirmed — fixes PERMISSION_DENIED
        cleanupPresence.current = initPresence(u);
      } else {
        setUser(null); setProfile(null);
        if (cleanupPresence.current) { cleanupPresence.current(); cleanupPresence.current = null; }
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Firestore listeners (auth-gated) ──────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return; // ← auth guard prevents PERMISSION_DENIED

    // Work sessions
    const sessionQ = query(
      collection(db, 'workSessions'),
      where('userId', '==', user.uid),
      orderBy('clockIn', 'desc')
    );
    const unsubSessions = onSnapshot(sessionQ, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as WorkSession[];
      setSessions(data);
      const active = data.find(s => s.status === 'active') ?? null;
      setActiveSession(active);
    }, (err) => console.error('[Sessions]', err.code));

    // Tasks
    const taskQ = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(taskQ, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
    }, (err) => console.error('[Tasks]', err.code));

    // Team presence (RTDB)
    const presenceRef = ref(rtdb, 'presence');
    onValue(presenceRef, (snap) => {
      setTeamPresence(snap.val() ?? {});
    });

    return () => { unsubSessions(); unsubTasks(); off(presenceRef); };
  }, [user, authLoading]);

  // ── Live timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.clockIn.toDate().getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { console.error(e); }
  };

  const handleSignOut = async () => {
    if (user) await setPresenceStatus(user, 'offline');
    await signOut(auth);
  };

  const clockIn = useCallback(async () => {
    if (!user || activeSession) return;
    await addDoc(collection(db, 'workSessions'), {
      userId: user.uid, clockIn: serverTimestamp(),
      taskDescription: clockDesc, status: 'active',
    });
    await setPresenceStatus(user, 'working');
    setClockDesc('');
  }, [user, activeSession, clockDesc]);

  const clockOut = useCallback(async () => {
    if (!user || !activeSession) return;
    const duration = Math.floor((Date.now() - activeSession.clockIn.toDate().getTime()) / 1000);
    await updateDoc(doc(db, 'workSessions', activeSession.id), {
      clockOut: serverTimestamp(), duration, status: 'completed',
    });
    await setPresenceStatus(user, 'online');
    setElapsed(0);
  }, [user, activeSession]);

  const addTask = useCallback(async () => {
    if (!user || !newTask.title.trim()) return;
    await addDoc(collection(db, 'tasks'), {
      title: newTask.title, assignedTo: user.uid,
      assignedName: user.displayName ?? user.email,
      status: 'Backlog', priority: newTask.priority,
      dueDate: newTask.dueDate, createdAt: serverTimestamp(),
    });
    setNewTask({ title: '', priority: 'Medium', dueDate: '' });
    setShowNewTask(false);
  }, [user, newTask]);

  const moveTask = useCallback(async (taskId: string, newStatus: Task['status']) => {
    await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const todaySessions = sessions.filter(s => {
    const d = s.clockIn?.toDate();
    return d && d.toDateString() === new Date().toDateString();
  });
  const todayHours = todaySessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const doneTasks = tasks.filter(t => t.status === 'Done').length;
  const myTasks = tasks.filter(t => t.assignedTo === user?.uid);
  const onlineCount = Object.values(teamPresence).filter(p => p.status !== 'offline').length;

  const weekSeconds = sessions
    .filter(s => { const d = s.clockIn?.toDate(); if (!d) return false; const now = new Date(); const day = now.getDay(); const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); monday.setHours(0,0,0,0); return d >= monday; })
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const isAdmin = profile?.role === 'admin' || ADMIN_UIDS.includes(user?.uid ?? '');

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  if (authLoading) return (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingLogo}>TEAMFLOW</div>
      <div style={styles.loadingBar}><div style={styles.loadingFill} /></div>
    </div>
  );

  if (!user || !profile) return (
    <div style={styles.loginScreen}>
      <div style={styles.loginCard}>
        <div style={styles.loginBadge}>● SYSTEM READY</div>
        <h1 style={styles.loginTitle}>TEAMFLOW</h1>
        <p style={styles.loginSub}>The OS for High-Performance Dev Teams</p>
        <button style={styles.googleBtn} onClick={handleSignIn}>
          <svg width="20" height="20" viewBox="0 0 24 24" style={{marginRight:10}}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        <p style={styles.loginHint}>Access requires a Google account</p>
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      {/* ── SIDEBAR ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span style={styles.logoDot} />
          TEAMFLOW
        </div>

        <nav style={styles.nav}>
          {(['dashboard','tasks','sessions','team'] as const).map(tab => (
            <button
              key={tab}
              style={{ ...styles.navBtn, ...(activeTab === tab ? styles.navBtnActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dashboard' && '⚡ '}
              {tab === 'tasks' && '📋 '}
              {tab === 'sessions' && '⏱ '}
              {tab === 'team' && '👥 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userChip}>
            {profile.photoURL && <img src={profile.photoURL} style={styles.avatar} alt="" />}
            <div>
              <div style={styles.userName}>{profile.displayName ?? 'User'}</div>
              <div style={{...styles.roleTag, color: isAdmin ? '#a855f7' : '#00d4ff'}}>
                {isAdmin ? '⚡ Admin' : '◆ Member'}
              </div>
            </div>
          </div>
          <button style={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={styles.main}>

        {/* ═══ DASHBOARD ═══ */}
        {activeTab === 'dashboard' && (
          <div style={styles.content}>
            <div style={styles.pageHeader}>
              <div>
                <div style={styles.pageBadge}>// DASHBOARD</div>
                <h2 style={styles.pageTitle}>Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, {profile.displayName?.split(' ')[0]} 👋</h2>
              </div>
              <div style={styles.onlinePill}>
                <span style={{...styles.statusDot, background: '#00ff88'}} />
                {onlineCount} Online
              </div>
            </div>

            {/* Stats */}
            <div style={styles.statsGrid}>
              {[
                { label: 'Today', value: formatDuration(todayHours), sub: `${todaySessions.length} sessions`, color: '#00d4ff' },
                { label: 'This Week', value: formatDuration(weekSeconds), sub: 'total tracked', color: '#a855f7' },
                { label: 'Tasks Done', value: doneTasks, sub: `${tasks.length} total`, color: '#00ff88' },
                { label: 'My Tasks', value: myTasks.length, sub: `${myTasks.filter(t=>t.status==='In Progress').length} in progress`, color: '#f5a623' },
              ].map(s => (
                <div key={s.label} style={styles.statCard}>
                  <div style={{...styles.statValue, color: s.color}}>{s.value}</div>
                  <div style={styles.statLabel}>{s.label}</div>
                  <div style={styles.statSub}>{s.sub}</div>
                  <div style={{...styles.statBar, background: s.color + '22'}}>
                    <div style={{...styles.statBarFill, background: s.color, width: '60%'}} />
                  </div>
                </div>
              ))}
            </div>

            {/* Clock In/Out */}
            <div style={styles.clockCard}>
              <div style={styles.clockLeft}>
                <div style={styles.clockLabel}>{activeSession ? '● WORKING' : '○ CLOCKED OUT'}</div>
                <div style={{...styles.clockTimer, color: activeSession ? '#00ff88' : '#555'}}>
                  {activeSession ? formatTime(elapsed) : '00:00:00'}
                </div>
                {activeSession?.taskDescription && (
                  <div style={styles.clockTask}>↳ {activeSession.taskDescription}</div>
                )}
              </div>
              <div style={styles.clockRight}>
                {!activeSession && (
                  <input
                    style={styles.clockInput}
                    placeholder="What are you working on?"
                    value={clockDesc}
                    onChange={e => setClockDesc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && clockIn()}
                  />
                )}
                <button
                  style={{...styles.clockBtn, background: activeSession ? 'rgba(255,77,77,0.15)' : 'rgba(0,255,136,0.15)', color: activeSession ? '#ff4d4d' : '#00ff88', borderColor: activeSession ? '#ff4d4d' : '#00ff88'}}
                  onClick={activeSession ? clockOut : clockIn}
                >
                  {activeSession ? 'Clock Out' : 'Clock In'}
                </button>
              </div>
            </div>

            {/* Recent Sessions */}
            <div style={styles.sectionHeader}>
              <span style={styles.pageBadge}>// RECENT SESSIONS</span>
            </div>
            <div style={styles.sessionList}>
              {sessions.slice(0, 5).map(s => (
                <div key={s.id} style={styles.sessionRow}>
                  <div style={{...styles.sessionStatus, background: s.status === 'active' ? '#00ff88' : '#333'}} />
                  <div style={styles.sessionInfo}>
                    <div style={styles.sessionDesc}>{s.taskDescription || 'No description'}</div>
                    <div style={styles.sessionTime}>{s.clockIn?.toDate().toLocaleDateString()}</div>
                  </div>
                  <div style={styles.sessionDur}>{s.status === 'active' ? `${formatTime(elapsed)} ●` : formatDuration(s.duration)}</div>
                </div>
              ))}
              {sessions.length === 0 && <div style={styles.empty}>No sessions yet. Clock in to start tracking.</div>}
            </div>
          </div>
        )}

        {/* ═══ TASKS / KANBAN ═══ */}
        {activeTab === 'tasks' && (
          <div style={styles.content}>
            <div style={styles.pageHeader}>
              <div>
                <div style={styles.pageBadge}>// KANBAN BOARD</div>
                <h2 style={styles.pageTitle}>Task Board</h2>
              </div>
              <button style={styles.addBtn} onClick={() => setShowNewTask(true)}>+ New Task</button>
            </div>

            {showNewTask && (
              <div style={styles.newTaskForm}>
                <input style={styles.formInput} placeholder="Task title..." value={newTask.title} onChange={e => setNewTask(p => ({...p, title: e.target.value}))} autoFocus />
                <select style={styles.formSelect} value={newTask.priority} onChange={e => setNewTask(p => ({...p, priority: e.target.value as Task['priority']}))}>
                  {['Low','Medium','High'].map(p => <option key={p}>{p}</option>)}
                </select>
                <input style={styles.formInput} type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({...p, dueDate: e.target.value}))} />
                <div style={{display:'flex',gap:8}}>
                  <button style={styles.addBtn} onClick={addTask}>Add Task</button>
                  <button style={styles.cancelBtn} onClick={() => setShowNewTask(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={styles.kanban}>
              {COLS.map(col => (
                <div
                  key={col}
                  style={styles.kanbanCol}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); if (dragTask) { moveTask(dragTask, col); setDragTask(null); } }}
                >
                  <div style={styles.colHeader}>
                    <span style={styles.colTitle}>{col}</span>
                    <span style={styles.colCount}>{tasks.filter(t=>t.status===col).length}</span>
                  </div>
                  {tasks.filter(t => t.status === col).map(task => (
                    <div
                      key={task.id}
                      style={{...styles.taskCard, opacity: dragTask === task.id ? 0.5 : 1}}
                      draggable
                      onDragStart={() => setDragTask(task.id)}
                      onDragEnd={() => setDragTask(null)}
                    >
                      <div style={{...styles.priorityBar, background: PRIORITY_COLOR[task.priority]}} />
                      <div style={styles.taskTitle}>{task.title}</div>
                      <div style={styles.taskMeta}>
                        <span style={{...styles.priorityTag, color: PRIORITY_COLOR[task.priority], borderColor: PRIORITY_COLOR[task.priority]}}>{task.priority}</span>
                        {task.dueDate && <span style={styles.dueDate}>📅 {task.dueDate}</span>}
                      </div>
                      <div style={styles.taskAssignee}>↳ {task.assignedName}</div>
                    </div>
                  ))}
                  {tasks.filter(t=>t.status===col).length === 0 && (
                    <div style={styles.emptyCol}>Drop tasks here</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SESSIONS ═══ */}
        {activeTab === 'sessions' && (
          <div style={styles.content}>
            <div style={styles.pageHeader}>
              <div>
                <div style={styles.pageBadge}>// TIME TRACKING</div>
                <h2 style={styles.pageTitle}>Work Sessions</h2>
              </div>
              <div style={styles.weekStat}>Week: {formatDuration(weekSeconds)}</div>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>{['Date','Task','Duration','Status'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>{s.clockIn?.toDate().toLocaleDateString()}</td>
                    <td style={styles.td}>{s.taskDescription || '—'}</td>
                    <td style={styles.td}>{s.status === 'active' ? formatTime(elapsed) : formatDuration(s.duration)}</td>
                    <td style={styles.td}>
                      <span style={{...styles.statusBadge, background: s.status==='active' ? 'rgba(0,255,136,0.1)' : 'rgba(100,100,100,0.15)', color: s.status==='active' ? '#00ff88' : '#888', border: `1px solid ${s.status==='active' ? '#00ff88' : '#333'}`}}>
                        {s.status === 'active' ? '● Active' : '✓ Done'}
                      </span>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={4} style={{...styles.td, textAlign:'center',color:'#555'}}>No sessions yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ TEAM ═══ */}
        {activeTab === 'team' && (
          <div style={styles.content}>
            <div style={styles.pageHeader}>
              <div>
                <div style={styles.pageBadge}>// TEAM STATUS</div>
                <h2 style={styles.pageTitle}>Live Team Presence</h2>
              </div>
              <div style={styles.onlinePill}><span style={{...styles.statusDot, background:'#00ff88'}}/>{onlineCount} Online</div>
            </div>
            <div style={styles.teamGrid}>
              {Object.entries(teamPresence).map(([uid, p]) => (
                <div key={uid} style={styles.memberCard}>
                  <div style={styles.memberAvatar}>
                    {p.photoURL ? <img src={p.photoURL} style={styles.memberImg} alt="" /> : <div style={styles.memberInitial}>{(p.displayName ?? '?')[0]}</div>}
                    <span style={{...styles.presenceDot, background: STATUS_COLOR[p.status] ?? '#555'}} />
                  </div>
                  <div style={styles.memberName}>{p.displayName ?? 'Unknown'}</div>
                  <div style={{...styles.memberStatus, color: STATUS_COLOR[p.status] ?? '#555'}}>{p.status}</div>
                  <div style={styles.memberRole}>{ADMIN_UIDS.includes(uid) ? '⚡ Admin' : '◆ Member'}</div>
                </div>
              ))}
              {Object.keys(teamPresence).length === 0 && (
                <div style={styles.empty}>No team members online. Ask your team to sign in!</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  // Loading
  loadingScreen: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#040a14', gap:24 },
  loadingLogo: { fontFamily:'monospace', fontSize:'2rem', fontWeight:900, letterSpacing:8, color:'#00d4ff' },
  loadingBar: { width:200, height:3, background:'#111', borderRadius:2, overflow:'hidden' },
  loadingFill: { height:'100%', width:'60%', background:'linear-gradient(90deg,#00d4ff,#a855f7)', borderRadius:2, animation:'none' },

  // Login
  loginScreen: { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#040a14', backgroundImage:'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)', backgroundSize:'40px 40px' },
  loginCard: { background:'rgba(10,20,40,0.95)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:20, padding:'48px 40px', textAlign:'center', backdropFilter:'blur(20px)', maxWidth:400, width:'90%' },
  loginBadge: { fontFamily:'monospace', fontSize:10, letterSpacing:3, color:'#00ff88', marginBottom:20 },
  loginTitle: { fontFamily:'monospace', fontSize:'3rem', fontWeight:900, letterSpacing:4, background:'linear-gradient(135deg,#fff,#00d4ff,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 },
  loginSub: { fontSize:14, color:'rgba(200,220,255,0.5)', marginBottom:40 },
  googleBtn: { display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'14px 24px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', transition:'all 0.2s' },
  loginHint: { fontSize:11, color:'rgba(200,220,255,0.3)', marginTop:16, fontFamily:'monospace' },

  // App layout
  app: { display:'flex', height:'100vh', background:'#040a14', color:'#e8f4ff', fontFamily:'system-ui, sans-serif', overflow:'hidden' },

  // Sidebar
  sidebar: { width:220, background:'rgba(8,16,32,0.95)', borderRight:'1px solid rgba(0,212,255,0.1)', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 },
  sidebarLogo: { fontFamily:'monospace', fontSize:14, fontWeight:900, letterSpacing:4, color:'#00d4ff', padding:'0 20px 24px', borderBottom:'1px solid rgba(0,212,255,0.08)', display:'flex', alignItems:'center', gap:8 },
  logoDot: { display:'inline-block', width:8, height:8, background:'#00ff88', borderRadius:'50%' },
  nav: { flex:1, padding:'16px 12px', display:'flex', flexDirection:'column', gap:4 },
  navBtn: { background:'transparent', border:'none', color:'rgba(200,220,255,0.5)', padding:'10px 12px', borderRadius:8, textAlign:'left', fontSize:13, fontWeight:600, cursor:'pointer', letterSpacing:0.5 },
  navBtnActive: { background:'rgba(0,212,255,0.08)', color:'#fff', borderLeft:'2px solid #00d4ff' },
  sidebarBottom: { padding:'16px 12px', borderTop:'1px solid rgba(0,212,255,0.08)', display:'flex', flexDirection:'column', gap:10 },
  userChip: { display:'flex', alignItems:'center', gap:10 },
  avatar: { width:32, height:32, borderRadius:'50%', border:'1px solid rgba(0,212,255,0.3)' },
  userName: { fontSize:12, fontWeight:600, color:'#e8f4ff' },
  roleTag: { fontSize:10, fontFamily:'monospace', letterSpacing:0.5 },
  signOutBtn: { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(200,220,255,0.4)', padding:'7px 12px', borderRadius:6, fontSize:11, cursor:'pointer' },

  // Main content
  main: { flex:1, overflow:'auto', background:'#040a14' },
  content: { padding:'32px 32px', maxWidth:1200 },
  pageHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:12 },
  pageBadge: { fontFamily:'monospace', fontSize:10, letterSpacing:3, color:'#00d4ff', marginBottom:6 },
  pageTitle: { fontSize:'1.6rem', fontWeight:700, color:'#fff', margin:0 },
  onlinePill: { display:'flex', alignItems:'center', gap:6, background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:20, padding:'6px 14px', fontSize:12, color:'#00ff88', fontFamily:'monospace' },
  statusDot: { width:7, height:7, borderRadius:'50%', display:'inline-block' },
  sectionHeader: { marginTop:32, marginBottom:12 },

  // Stats
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:28 },
  statCard: { background:'rgba(10,20,40,0.8)', border:'1px solid rgba(0,212,255,0.1)', borderRadius:14, padding:'20px 18px' },
  statValue: { fontSize:'1.8rem', fontWeight:900, fontFamily:'monospace', lineHeight:1 },
  statLabel: { fontSize:11, letterSpacing:2, color:'rgba(200,220,255,0.4)', textTransform:'uppercase', margin:'6px 0 2px' },
  statSub: { fontSize:11, color:'rgba(200,220,255,0.3)', marginBottom:12 },
  statBar: { height:3, borderRadius:2 },
  statBarFill: { height:'100%', borderRadius:2 },

  // Clock
  clockCard: { background:'rgba(10,20,40,0.8)', border:'1px solid rgba(0,212,255,0.12)', borderRadius:14, padding:'24px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:20, marginBottom:8 },
  clockLeft: { flex:1 },
  clockRight: { display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' },
  clockLabel: { fontFamily:'monospace', fontSize:10, letterSpacing:2, color:'rgba(200,220,255,0.4)', marginBottom:6 },
  clockTimer: { fontFamily:'monospace', fontSize:'2.5rem', fontWeight:900, letterSpacing:4 },
  clockTask: { fontSize:12, color:'rgba(200,220,255,0.4)', marginTop:4 },
  clockInput: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:8, padding:'10px 14px', color:'#e8f4ff', fontSize:13, outline:'none', minWidth:220 },
  clockBtn: { padding:'10px 24px', borderRadius:8, border:'1px solid', fontWeight:700, fontSize:13, cursor:'pointer', letterSpacing:1 },

  // Sessions list
  sessionList: { display:'flex', flexDirection:'column', gap:8 },
  sessionRow: { background:'rgba(10,20,40,0.7)', border:'1px solid rgba(0,212,255,0.08)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 },
  sessionStatus: { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  sessionInfo: { flex:1 },
  sessionDesc: { fontSize:13, color:'#e8f4ff', fontWeight:500 },
  sessionTime: { fontSize:11, color:'rgba(200,220,255,0.35)', marginTop:2, fontFamily:'monospace' },
  sessionDur: { fontFamily:'monospace', fontSize:12, color:'rgba(200,220,255,0.5)' },

  // Table
  table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th: { textAlign:'left', padding:'10px 14px', fontFamily:'monospace', fontSize:10, letterSpacing:2, color:'rgba(200,220,255,0.4)', borderBottom:'1px solid rgba(0,212,255,0.1)' },
  tr: { borderBottom:'1px solid rgba(255,255,255,0.04)' },
  td: { padding:'12px 14px', color:'rgba(200,220,255,0.75)', verticalAlign:'middle' },
  statusBadge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontFamily:'monospace' },
  weekStat: { fontFamily:'monospace', fontSize:13, color:'#00d4ff', background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:8, padding:'8px 16px' },

  // Kanban
  kanban: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, overflowX:'auto' },
  kanbanCol: { background:'rgba(8,16,32,0.6)', border:'1px solid rgba(0,212,255,0.08)', borderRadius:12, padding:14, minHeight:300 },
  colHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  colTitle: { fontFamily:'monospace', fontSize:11, letterSpacing:1, color:'rgba(200,220,255,0.5)', textTransform:'uppercase' },
  colCount: { background:'rgba(0,212,255,0.1)', color:'#00d4ff', borderRadius:10, padding:'2px 8px', fontSize:11, fontFamily:'monospace' },
  taskCard: { background:'rgba(10,20,40,0.9)', border:'1px solid rgba(0,212,255,0.1)', borderRadius:9, padding:'12px 12px 10px', marginBottom:9, cursor:'grab', position:'relative', overflow:'hidden' },
  priorityBar: { position:'absolute', top:0, left:0, right:0, height:2 },
  taskTitle: { fontSize:13, fontWeight:600, color:'#e8f4ff', marginBottom:8, marginTop:4 },
  taskMeta: { display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 },
  priorityTag: { fontSize:10, fontFamily:'monospace', padding:'2px 7px', borderRadius:4, border:'1px solid' },
  dueDate: { fontSize:10, color:'rgba(200,220,255,0.35)' },
  taskAssignee: { fontSize:10, color:'rgba(200,220,255,0.3)', fontFamily:'monospace' },
  emptyCol: { textAlign:'center', padding:'24px 8px', color:'rgba(200,220,255,0.15)', fontSize:12, fontFamily:'monospace', letterSpacing:1 },

  // New task form
  newTaskForm: { background:'rgba(10,20,40,0.9)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:12, padding:'20px', marginBottom:20, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' },
  formInput: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:8, padding:'9px 13px', color:'#e8f4ff', fontSize:13, outline:'none', flex:1, minWidth:160 },
  formSelect: { background:'rgba(10,20,40,0.95)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:8, padding:'9px 12px', color:'#e8f4ff', fontSize:13, cursor:'pointer' },
  addBtn: { background:'rgba(0,212,255,0.1)', border:'1px solid #00d4ff', color:'#00d4ff', padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:0.5 },
  cancelBtn: { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(200,220,255,0.4)', padding:'9px 14px', borderRadius:8, fontSize:13, cursor:'pointer' },

  // Team
  teamGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 },
  memberCard: { background:'rgba(10,20,40,0.8)', border:'1px solid rgba(0,212,255,0.1)', borderRadius:14, padding:'24px 18px', textAlign:'center' },
  memberAvatar: { position:'relative', display:'inline-block', marginBottom:12 },
  memberImg: { width:52, height:52, borderRadius:'50%', border:'2px solid rgba(0,212,255,0.3)' },
  memberInitial: { width:52, height:52, borderRadius:'50%', background:'rgba(0,212,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#00d4ff' },
  presenceDot: { position:'absolute', bottom:2, right:2, width:12, height:12, borderRadius:'50%', border:'2px solid #040a14' },
  memberName: { fontSize:13, fontWeight:600, color:'#e8f4ff', marginBottom:4 },
  memberStatus: { fontSize:11, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:1, marginBottom:4 },
  memberRole: { fontSize:10, color:'rgba(200,220,255,0.35)', fontFamily:'monospace' },

  // Misc
  empty: { textAlign:'center', padding:'40px 20px', color:'rgba(200,220,255,0.25)', fontSize:13, fontFamily:'monospace', letterSpacing:1 },
};
