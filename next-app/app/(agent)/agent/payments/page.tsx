'use client';

import { PaymentDashboard } from '@/components/payments/PaymentDashboard';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments & Payroll</h1>
        <p className="text-gray-600 mt-2">View your payment history and payroll information</p>
      </div>
      <PaymentDashboard />
    </div>
  );
}

