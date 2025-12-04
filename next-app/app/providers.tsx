'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider } from '@/lib/hooks/useToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Component to handle cross-tab session synchronization
function SessionSync({ children }: { children: ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);

  // Keep router ref in sync
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    // Listen for NextAuth's cross-tab synchronization events
    // NextAuth uses localStorage with key 'nextauth.message' for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nextauth.message') {
        try {
          const message = e.newValue ? JSON.parse(e.newValue) : null;
          if (message?.event === 'session' && message?.data === 'signout') {
            // Session was signed out in another tab
            console.log('[Session] Sign out detected from another tab');
            routerRef.current.push('/login');
            window.location.href = '/login';
          }
        } catch (error) {
          // Ignore parse errors
        }
      }
    };

    // Listen for custom logout events (for same-origin communication)
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'NEXT_AUTH_SIGN_OUT') {
        console.log('[Session] Sign out message received');
        routerRef.current.push('/login');
        window.location.href = '/login';
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty deps - router is stable and accessed via ref

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        // Enable cross-tab session synchronization
        refetchOnWindowFocus={false} // Disabled to prevent re-renders on window focus
        refetchInterval={5 * 60} // Refetch every 5 minutes to check for session changes
        refetchOnMount={true} // Only refetch on component mount
      >
        <SessionSync>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionSync>
      </SessionProvider>
    </ErrorBoundary>
  );
}





