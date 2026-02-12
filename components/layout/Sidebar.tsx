'use client';
// components/layout/Sidebar.tsx
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { path: '/tasks', icon: '◈', label: 'Task Board' },
  { path: '/commits', icon: '⌥', label: 'Git Commits' },
  { path: '/reports', icon: '◉', label: 'Weekly Reports' },
  { path: '/milestones', icon: '◎', label: 'Milestones' },
  { path: '/efficiency', icon: '◈', label: 'Efficiency Graph' },
  { path: '/team', icon: '◆', label: 'Team' },
];

const ADMIN_ITEMS = [
  { path: '/admin/sessions', icon: '⌘', label: 'Session Logs' },
  { path: '/admin/scores', icon: '▲', label: 'Leaderboard' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { member, signOut } = useAuth();

  const handleNav = (path: string) => router.push(path);
  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 flex flex-col z-50"
      style={{ width: 240, background: 'rgba(4,10,22,0.97)', borderRight: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(20px)' }}>

      {/* Logo */}
      <div className="px-6 py-7 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
        <div className="font-orbitron text-xl font-black gradient-text" style={{ letterSpacing: '-0.5px' }}>
          TEAMFLOW
        </div>
        <div className="font-mono text-xs mt-1" style={{ color: 'rgba(0,212,255,0.4)', letterSpacing: '2px' }}>
          TEAM OS v1.0
        </div>
      </div>

      {/* User info */}
      {member && (
        <div className="mx-4 mt-4 p-3 rounded-xl" style={{ background: `${member.accentColor}`, border: `1px solid ${member.color}25` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-orbitron text-xs font-bold flex-shrink-0"
              style={{ background: `${member.color}20`, border: `1px solid ${member.color}40`, color: member.color }}>
              {member.avatar}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm truncate">{member.name}</div>
              <div className="text-xs truncate" style={{ color: 'rgba(180,210,255,0.45)', fontSize: '10px' }}>
                {member.isAdmin ? '⚡ ADMIN' : member.title.split(' ')[0] + ' ' + member.title.split(' ')[1]}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 mt-4 space-y-1">
        <div className="text-xs font-mono px-3 mb-2" style={{ color: 'rgba(0,212,255,0.35)', letterSpacing: '2px' }}>
          NAVIGATION
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => handleNav(item.path)}
            className={`nav-item w-full text-left ${pathname === item.path ? 'active' : ''}`}
          >
            <span className="text-base w-5 flex-shrink-0" style={{ fontFamily: 'monospace' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        {member?.isAdmin && (
          <>
            <div className="text-xs font-mono px-3 mt-5 mb-2" style={{ color: 'rgba(168,85,247,0.5)', letterSpacing: '2px' }}>
              ADMIN ONLY
            </div>
            {ADMIN_ITEMS.map(item => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`nav-item w-full text-left ${pathname === item.path ? 'active' : ''}`}
                style={{ color: pathname === item.path ? '#a855f7' : undefined }}
              >
                <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
        <button
          onClick={handleSignOut}
          className="nav-item w-full text-left"
          style={{ color: 'rgba(255,64,96,0.6)' }}
        >
          <span className="text-base w-5">⊗</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
