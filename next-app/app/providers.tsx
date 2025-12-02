'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider } from '@/lib/hooks/useToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Generate a unique tab ID for this tab
function getTabId(): string {
  if (typeof window === 'undefined') return '';
  
  // Check if tab ID already exists in sessionStorage
  let tabId = sessionStorage.getItem('tab_id');
  if (!tabId) {
    // Generate new tab ID
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('tab_id', tabId);
  }
  return tabId;
}

// Component to handle tab-specific session isolation
function SessionSync({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tabId] = useState(() => getTabId());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get or create session tab mapping in sessionStorage
    const getSessionTabMap = () => {
      try {
        const map = sessionStorage.getItem('session_tab_map');
        return map ? JSON.parse(map) : {};
      } catch {
        return {};
      }
    };

    const setSessionTabMap = (map: Record<string, string>) => {
      try {
        sessionStorage.setItem('session_tab_map', JSON.stringify(map));
      } catch (e) {
        console.error('Failed to set session tab map:', e);
      }
    };

    // Check if session belongs to this tab
    if (status === 'authenticated' && session?.user) {
      const sessionTabMap = getSessionTabMap();
      const sessionUserId = session.user.id;
      const sessionTabId = sessionTabMap[sessionUserId];

      // If session exists but belongs to a different tab, clear it
      if (sessionTabId && sessionTabId !== tabId) {
        console.log('[Session] Session belongs to different tab, clearing...');
        // Clear the session by redirecting to login
        router.push('/login');
        return;
      }

      // Mark this session as belonging to this tab
      if (!sessionTabId) {
        sessionTabMap[sessionUserId] = tabId;
        setSessionTabMap(sessionTabMap);
      }
    } else if (status === 'unauthenticated') {
      // Clear tab mapping when logged out
      const sessionTabMap = getSessionTabMap();
      Object.keys(sessionTabMap).forEach(userId => {
        if (sessionTabMap[userId] === tabId) {
          delete sessionTabMap[userId];
        }
      });
      setSessionTabMap(sessionTabMap);
    }

    setIsInitialized(true);
  }, [session, status, tabId, router]);

  // Don't render children until we've checked session ownership
  if (!isInitialized) {
    return null;
  }

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





