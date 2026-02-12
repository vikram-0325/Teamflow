// types/index.ts

export interface WorkSession {
  id: string;
  userId: string;
  userName: string;
  clockIn: string;       // ISO string
  clockOut?: string;     // ISO string
  duration?: number;     // minutes
  taskDescription: string;
  date: string;          // YYYY-MM-DD
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'inprogress' | 'review' | 'done';
  assignedTo: string;    // userId
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;       // YYYY-MM-DD
  githubPR?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface WeeklyReport {
  id: string;
  userId: string;
  userName: string;
  weekStart: string;     // YYYY-MM-DD (Monday)
  weekEnd: string;       // YYYY-MM-DD (Sunday)
  completedTasks: string[];
  challenges: string;
  nextWeekGoals: string;
  totalHours: number;
  githubCommits: number;
  status: 'draft' | 'submitted' | 'approved' | 'revision';
  adminComment?: string;
  submittedAt?: string;
  approvedAt?: string;
}

export interface GitCommit {
  id: string;
  userId: string;
  sha: string;
  message: string;
  repo: string;
  branch: string;
  timestamp: string;
  additions: number;
  deletions: number;
  url: string;
}

export interface GitStats {
  userId: string;
  weeklyCommits: number;
  totalCommits: number;
  pullRequests: number;
  mergedPRs: number;
  repos: string[];
  lastUpdated: string;
  weeklyActivity: { day: string; count: number }[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  deadline: string;
  progress: number;      // 0-100
  linkedTasks: string[];
  status: 'on_track' | 'at_risk' | 'delayed' | 'completed';
  createdBy: string;
  createdAt: string;
}

export interface ProductivityScore {
  userId: string;
  weekStart: string;
  tasksScore: number;    // out of 30
  hoursScore: number;    // out of 25
  commitsScore: number;  // out of 20
  speedScore: number;    // out of 15
  reportScore: number;   // out of 10
  totalScore: number;    // out of 100
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite';
  xp: number;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'working' | 'idle' | 'offline';
  lastSeen: string;
  currentTask?: string;
}
