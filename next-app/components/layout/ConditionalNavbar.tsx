'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { useEffect, useState } from 'react';

export function ConditionalNavbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !pathname) {
    return null; // Prevent hydration mismatch
  }

  // Hide navbar on authenticated dashboard routes (agent, partner, admin)
  // Note: These routes have their own Header and Sidebar
  // Only hide routes that are actual dashboard pages (with / after the role)
  // Allow public landing pages like /agent, /partner to show navbar
  const isAuthenticatedRoute = 
    (pathname.startsWith('/agent/') && pathname !== '/agent') ||
    (pathname.startsWith('/partner/') && pathname !== '/partner') ||
    (pathname.startsWith('/admin/') && pathname !== '/admin');
  
  // Also hide on auth pages
  const isAuthPage = 
    pathname.startsWith('/auth/') ||
    pathname === '/login' ||
    pathname === '/register';
  
  // Show navbar on all other routes (public routes, home, track, /agent, /partner, etc.)
  if (isAuthenticatedRoute || isAuthPage) {
    return null;
  }
  
  // Always show navbar on public routes
  return <Navbar />;
}

