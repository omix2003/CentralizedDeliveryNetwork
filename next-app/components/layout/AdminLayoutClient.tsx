'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSession } from 'next-auth/react';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  // Sidebar open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true; // Default to open for SSR
  });

  // Handle sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      // Open sidebar on desktop, close on mobile
      if (window.innerWidth >= 768) {
        setSidebarOpen(true); // Always open on desktop
      } else {
        setSidebarOpen(false); // Always closed on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    // Set initial state on mount
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar 
        role="ADMIN" 
        userEmail={session?.user?.email}
        userName={session?.user?.name}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}












