import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayoutClient } from '@/components/layout/AdminLayoutClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - DeliveryHub',
  description: 'Admin dashboard for system management',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </ProtectedRoute>
  );
}













