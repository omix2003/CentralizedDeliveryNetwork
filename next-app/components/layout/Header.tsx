'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, User, LogOut, Key, ChevronDown } from 'lucide-react';
// Bell icon removed - notifications disabled
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
// Notifications disabled
// import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
// import { notificationApi } from '@/lib/api/notifications';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
}

export function Header({ title, showSearch = false, onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Notifications disabled
  // const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  // const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // const notificationsRef = useRef<HTMLDivElement>(null);

  // Load unread notification count - DISABLED
  // useEffect(() => {
  //   const loadUnreadCount = async () => {
  //     try {
  //       const data = await notificationApi.getNotifications(true, 1);
  //       setUnreadCount(data.unreadCount);
  //     } catch (err) {
  //       console.error('Failed to load notification count:', err);
  //     }
  //   };

  //   if (session?.user) {
  //     loadUnreadCount();
  //     // Refresh every 30 seconds
  //     const interval = setInterval(loadUnreadCount, 30000);
  //     return () => clearInterval(interval);
  //   }
  // }, [session]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      // if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
      //   setIsNotificationsOpen(false);
      // }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    const { performLogout } = await import('@/lib/utils/logout');
    await performLogout(signOut, router);
  };

  const getProfileUrl = () => {
    if (!session?.user?.role) return '/profile';
    const role = session.user.role.toLowerCase();
    return `/${role}/profile`;
  };

  const getChangePasswordUrl = () => {
    if (!session?.user?.role) return '/settings';
    const role = session.user.role.toLowerCase();
    return `/${role}/settings`;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-50">
      {showSearch ? (
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, products..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-3">
        {/* Notifications - DISABLED */}
        {/* <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          {unreadCount > 0 && (
            <NotificationsDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          )}
        </div> */}

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-3 border-l border-gray-100 hover:bg-gray-50 rounded-lg transition-colors p-1"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="h-full w-full object-cover"
                />
              ) : session?.user?.name ? (
                <span className="text-sm font-semibold text-white">
                  {session.user.name[0].toUpperCase()}
                </span>
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-500 transition-transform hidden md:block',
              isDropdownOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <Link
                href={getProfileUrl()}
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4 text-gray-500" />
                <span>Profile</span>
              </Link>
              <Link
                href={getChangePasswordUrl()}
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Key className="h-4 w-4 text-gray-500" />
                <span>Change Password</span>
              </Link>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
