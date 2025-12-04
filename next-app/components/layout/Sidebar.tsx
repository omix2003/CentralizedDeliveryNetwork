'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  LogOut,
  FileCheck,
  X,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface SidebarProps {
  role: 'AGENT' | 'PARTNER' | 'ADMIN';
  userEmail?: string;
  userName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

const agentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/agent/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/agent/orders', icon: Package },
  { label: 'Profile', href: '/agent/profile', icon: Users },
  { label: 'Support', href: '/agent/support', icon: MessageSquare },
];

const partnerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/partner/orders', icon: Package },
  { label: 'Tracking', href: '/partner/tracking', icon: MapPin },
  { label: 'Analytics', href: '/partner/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/partner/settings', icon: Settings },
  { label: 'Support', href: '/partner/support', icon: MessageSquare },
];

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Live Map', href: '/admin/map', icon: MapPin },
  { label: 'Agents', href: '/admin/agents', icon: Users },
  { label: 'Partners', href: '/admin/partners', icon: Users },
  { label: 'Orders', href: '/admin/orders', icon: Package },
  { label: 'KYC Verification', href: '/admin/kyc', icon: FileCheck },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Support', href: '/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function Sidebar({ role, userEmail, userName, isOpen = true, onClose, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const { performLogout } = await import('@/lib/utils/logout');
    await performLogout(signOut, router);
  };
  
  const navItems = 
    role === 'AGENT' ? agentNavItems :
    role === 'PARTNER' ? partnerNavItems :
    adminNavItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white border-r border-gray-100 flex flex-col fixed md:static z-30 transition-all duration-300 ease-in-out overflow-hidden group',
          isOpen ? 'translate-x-0 w-16 md:w-16 top-0 md:top-0 h-screen md:hover:w-64' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden h-screen md:h-screen'
        )}
      >
        {/* Logo/Brand - Fixed header */}
        <div className="px-3 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white z-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            {/* Logo text - shown on sidebar hover */}
            <span className="hidden md:block text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              DeliveryHub
            </span>
            {/* Mobile: always show logo text */}
            <span className="md:hidden text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
              DeliveryHub
            </span>
          </div>
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

      {/* Navigation - Scrollable area (in front of header) */}
      <nav className={cn('flex-1 overflow-y-auto sidebar-scrollbar min-h-0 px-3 pt-3 pb-0 pr-2 relative z-20 bg-white group', !isOpen && 'md:hidden')}>
        <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                // Close sidebar on mobile when clicking a link
                if (onClose && window.innerWidth < 768) {
                  onClose();
                }
              }}
              className={cn(
                'group/item flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mr-1 relative',
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
              title={item.label}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-500')} />
              {/* Label - always visible */}
              <span className="hidden md:block text-gray-900 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.label}
              </span>
              {/* Mobile: always show label */}
              <span className="md:hidden text-gray-900 whitespace-nowrap">
                {item.label}
              </span>
              {/* Badge */}
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        </div>
      </nav>

      </div>
    </>
  );
}
