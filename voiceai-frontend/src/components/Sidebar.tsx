'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  PhoneCall, LayoutDashboard, Users, Phone, PhoneIncoming,
  Receipt, Settings, LogOut, GitMerge, Headphones, BookOpen, CreditCard
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { href: '/admin',              label: 'Overview',    icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/clients',      label: 'Clients',     icon: <Users className="w-4 h-4" /> },
  { href: '/admin/numbers',      label: 'Numbers',     icon: <Phone className="w-4 h-4" /> },
  { href: '/admin/calls',        label: 'All Calls',   icon: <PhoneIncoming className="w-4 h-4" /> },
  { href: '/admin/billing',      label: 'Billing',     icon: <Receipt className="w-4 h-4" /> },
  { href: '/admin/sip-trunks',   label: 'SIP Trunks',  icon: <GitMerge className="w-4 h-4" /> },
  { href: '/admin/settings',     label: 'Settings',    icon: <Settings className="w-4 h-4" /> },
];

const clientNav: NavItem[] = [
  { href: '/dashboard',              label: 'Overview',      icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/dashboard/calls',        label: 'Call History',  icon: <PhoneIncoming className="w-4 h-4" /> },
  { href: '/dashboard/agent',        label: 'AI Agent',      icon: <Headphones className="w-4 h-4" /> },
  { href: '/dashboard/knowledge',    label: 'Knowledge Base',icon: <BookOpen className="w-4 h-4" /> },
  { href: '/dashboard/billing',      label: 'Billing',       icon: <CreditCard className="w-4 h-4" /> },
];

interface SidebarProps {
  variant: 'admin' | 'client';
}

export function Sidebar({ variant }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const nav = variant === 'admin' ? adminNav : clientNav;

  return (
    <aside className="w-60 min-h-screen bg-[#0d0d14] border-r border-[#1e1e2e] flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <PhoneCall className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">VoiceAI</div>
            <div className="text-[10px] text-[#555570] uppercase tracking-wider">
              {variant === 'admin' ? 'Admin Console' : 'Client Portal'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('nav-item', isActive && 'active')}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {user?.business_name || 'Admin'}
            </div>
            <div className="text-[10px] text-[#555570] truncate">{user?.email}</div>
          </div>
        </div>
        <button
          id="sidebar-logout"
          onClick={logout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
