'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ToastProvider } from '@/lib/hooks/useToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        // NextAuth v5 automatically handles cross-tab session synchronization
        // When you log out in one tab, all tabs will be logged out automatically
        // Sessions are stored in httpOnly cookies, which are shared across tabs
        refetchOnWindowFocus={true} // Refetch session when window gains focus
        refetchInterval={0} // Disable automatic polling (NextAuth handles sync via events)
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}





