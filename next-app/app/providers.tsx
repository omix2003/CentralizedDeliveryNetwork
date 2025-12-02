'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider } from '@/lib/hooks/useToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Component to handle cross-tab session synchronization
function SessionSync({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

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
            router.push('/login');
            // Force reload to clear any cached state
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
        router.push('/login');
        window.location.href = '/login';
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
  }, [router]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        // Enable cross-tab session synchronization
        refetchOnWindowFocus={true} // Refetch session when window gains focus
        refetchInterval={5 * 60} // Refetch every 5 minutes to check for session changes
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





