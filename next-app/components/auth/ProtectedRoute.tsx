'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { UserRole } from '@/lib/utils/role';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo,
  fallback,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    // Not authenticated
    if (!session) {
      router.push(redirectTo || '/login');
      return;
    }

    // Check role if required
    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const userRole = session.user.role;

      if (!roles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        const roleDashboard = getRoleDashboard(userRole) || '/';
        router.replace(roleDashboard);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, requiredRole, redirectTo]); // Removed router from deps as it's stable

  // Show loading state
  if (status === 'loading') {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Check role
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userRole = session.user.role;

    if (!roles.includes(userRole)) {
      return fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <p>Access denied. Redirecting...</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

function getRoleDashboard(role: UserRole): string | null {
  switch (role) {
    case 'AGENT':
      return '/agent/dashboard';
    case 'PARTNER':
      return '/partner/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    default:
      return null;
  }
}















