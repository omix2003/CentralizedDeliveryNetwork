'use client';

import { useSession } from 'next-auth/react';
import { 
  hasRole, 
  hasAnyRole, 
  isAdmin, 
  isAgent, 
  isPartner, 
  isAgentOrPartner,
  getUserRole,
  getUserId,
  getAgentId,
  getPartnerId,
} from '@/lib/utils/role';
import type { UserRole } from '@/types/next-auth.d';

export function useRole() {
  const { data: session, status } = useSession();
  
  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    hasRole: (role: UserRole) => hasRole(session, role),
    hasAnyRole: (...roles: UserRole[]) => hasAnyRole(session, ...roles),
    isAdmin: () => isAdmin(session),
    isAgent: () => isAgent(session),
    isPartner: () => isPartner(session),
    isAgentOrPartner: () => isAgentOrPartner(session),
    userRole: getUserRole(session),
    userId: getUserId(session),
    agentId: getAgentId(session),
    partnerId: getPartnerId(session),
  };
}