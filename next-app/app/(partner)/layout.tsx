import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PartnerLayoutClient } from '@/components/layout/PartnerLayoutClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Dashboard - DeliveryHub',
  description: 'Partner dashboard for order management',
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="PARTNER">
      <PartnerLayoutClient>{children}</PartnerLayoutClient>
    </ProtectedRoute>
  );
}













