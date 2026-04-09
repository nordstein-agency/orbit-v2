'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Calendar,
  BarChart3,
  Zap,
  Upload,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/calendar', icon: Calendar, label: 'Kalender' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
];

const TOOLS_ITEMS = [
  { href: '/generator', icon: Zap, label: 'Lead-Generator' },
  { href: '/import', icon: Upload, label: 'Import' },
];

interface Props {
  profile: Profile | null;
}

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="32" viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2L34 12V30L18 40L2 30V12L18 2Z" stroke="#451a3d" strokeWidth="2" fill="none"/>
            <path d="M18 8L28 14V26L18 32L8 26V14L18 8Z" fill="#451a3d" fillOpacity="0.5"/>
          </svg>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.12em', color: 'var(--text)' }}>
              NORDSTEIN
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
              Sales OS
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${isActive(href) ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}

        <div className="nav-section-label" style={{ marginTop: '12px' }}>Tools</div>
        {TOOLS_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${isActive(href) ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div className="nav-section-label" style={{ marginTop: '12px' }}>Admin</div>
            <Link href="/settings/users" className={`nav-item ${pathname.startsWith('/settings/users') ? 'active' : ''}`}>
              <Shield size={16} />
              <span>Benutzerverwaltung</span>
            </Link>
            <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
              <Settings size={16} />
              <span>Einstellungen</span>
            </Link>
          </>
        )}
      </nav>

      {/* User / Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-3)' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--nordstein-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 800, color: 'white', flexShrink: 0
          }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || 'Unbekannt'}
            </div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {profile?.role === 'admin' ? 'Admin' : profile?.role === 'sales' ? 'Sales' : 'Viewer'}
            </div>
          </div>
        </div>
        <button className="nav-item" style={{ width: '100%', border: 'none' }} onClick={handleLogout}>
          <LogOut size={16} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
