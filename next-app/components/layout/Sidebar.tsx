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
  ChevronLeft,
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
    try {
      // Broadcast sign out to all tabs before signing out
      // This ensures other tabs know about the logout immediately
      if (typeof window !== 'undefined') {
        // Broadcast to other tabs via localStorage
        localStorage.setItem('nextauth.message', JSON.stringify({
          event: 'session',
          data: 'signout',
          timestamp: Date.now()
        }));
        
        // Also broadcast via postMessage for same-origin tabs
        window.postMessage({ type: 'NEXT_AUTH_SIGN_OUT' }, window.location.origin);
      }

      // Sign out and redirect to login page
      await signOut({ 
        redirect: true,
        callbackUrl: '/login'
      });
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if signOut fails
      router.push('/login');
      window.location.href = '/login';
    }
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
          'h-screen bg-white border-r border-gray-100 flex flex-col fixed md:static z-50 transition-all duration-300 ease-in-out',
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'
        )}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between min-w-[256px]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            {isOpen && (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                DeliveryHub
              </span>
            )}
          </div>
          {/* Toggle/Close buttons */}
          <div className="flex items-center gap-2">
            {/* Desktop toggle button */}
            {onToggle && (
              <button
                onClick={onToggle}
                className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                <ChevronLeft className={cn('h-5 w-5 text-gray-600 transition-transform', !isOpen && 'rotate-180')} />
              </button>
            )}
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
        </div>

      {/* Navigation */}
      <nav className={cn('flex-1 p-3 space-y-1 overflow-y-auto', !isOpen && 'md:hidden')}>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-w-[208px]',
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-500')} />
              {isOpen && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={cn('p-4 border-t border-gray-100', !isOpen && 'md:hidden')}>
        {userName && isOpen && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-gray-50 min-w-[208px]">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
            {userEmail && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>
            )}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-w-[208px]',
            !isOpen && 'md:justify-center'
          )}
          title={!isOpen ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5 text-gray-500 flex-shrink-0" />
          {isOpen && <span>Sign Out</span>}
        </button>
      </div>
      </div>
    </>
  );
}
