// lib/team.ts
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  avatar: string;
  isAdmin: boolean;
  color: string;
  accentColor: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'yulissa',
    name: 'Yulissa',
    email: 'yulissa@teamflow.dev',
    role: 'admin',
    title: 'Founder & CEO · Creative Managing Director',
    avatar: 'YU',
    isAdmin: true,
    color: '#a855f7',
    accentColor: 'rgba(168,85,247,0.15)',
  },
  {
    id: 'vikram',
    name: 'Vikram',
    email: 'vikram@teamflow.dev',
    role: 'admin',
    title: 'Co-Founder & COO · Managing Director',
    avatar: 'VK',
    isAdmin: true,
    color: '#00d4ff',
    accentColor: 'rgba(0,212,255,0.15)',
  },
  {
    id: 'esha',
    name: 'Esha',
    email: 'esha@teamflow.dev',
    role: 'member',
    title: 'Creative Director',
    avatar: 'ES',
    isAdmin: false,
    color: '#ff6b35',
    accentColor: 'rgba(255,107,53,0.15)',
  },
  {
    id: 'pranish',
    name: 'Pranish',
    email: 'pranish@teamflow.dev',
    role: 'member',
    title: 'Web Developer',
    avatar: 'PR',
    isAdmin: false,
    color: '#00ff88',
    accentColor: 'rgba(0,255,136,0.15)',
  },
  {
    id: 'ayush',
    name: 'Ayush',
    email: 'ayush@teamflow.dev',
    role: 'member',
    title: 'UI/UX Designer',
    avatar: 'AY',
    isAdmin: false,
    color: '#f59e0b',
    accentColor: 'rgba(245,158,11,0.15)',
  },
  {
    id: 'kushal',
    name: 'Kushal',
    email: 'kushal@teamflow.dev',
    role: 'member',
    title: 'Data Analyst & Researcher',
    avatar: 'KU',
    isAdmin: false,
    color: '#ec4899',
    accentColor: 'rgba(236,72,153,0.15)',
  },
];

export const getMemberById = (id: string) => TEAM_MEMBERS.find(m => m.id === id);
export const getAdmins = () => TEAM_MEMBERS.filter(m => m.isAdmin);
export const getMembers = () => TEAM_MEMBERS.filter(m => !m.isAdmin);
