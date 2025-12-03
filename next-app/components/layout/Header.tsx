'use client';

import React from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
}

export function Header({ title, showSearch = false, onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Menu Toggle Button - Visible on all screen sizes */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-2"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      )}
      
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
        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-100">
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
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
