import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgentLayoutClient } from '@/components/layout/AgentLayoutClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Dashboard - DeliveryHub',
  description: 'Agent dashboard for delivery management',
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="AGENT">
      <AgentLayoutClient>{children}</AgentLayoutClient>
    </ProtectedRoute>
  );
}

