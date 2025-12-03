import { Session } from 'next-auth';

export type UserRole = 'AGENT' | 'PARTNER' | 'ADMIN';

export const hasRole = (session: Session | null, role: UserRole): boolean => {
  return session?.user?.role === role;
};

export const hasAnyRole = (session: Session | null, ...roles: UserRole[]): boolean => {
  if (!session?.user?.role) {
    return false;
  }
  return roles.includes(session.user.role);
};

export const isAdmin = (session: Session | null): boolean => {
  return hasRole(session, 'ADMIN');
};

export const isAgent = (session: Session | null): boolean => {
  return hasRole(session, 'AGENT');
};

export const isPartner = (session: Session | null): boolean => {
  return hasRole(session, 'PARTNER');
};

export const isAgentOrPartner = (session: Session | null): boolean => {
  return hasAnyRole(session, 'AGENT', 'PARTNER');
};

export const getUserRole = (session: Session | null): UserRole | null => {
  return (session?.user?.role as UserRole) || null;
};

export const getUserId = (session: Session | null): string | null => {
  return session?.user?.id || null;
};

export const getAgentId = (session: Session | null): string | null => {
  return session?.user?.agentId || null;
};

export const getPartnerId = (session: Session | null): string | null => {
  return session?.user?.partnerId || null;
};