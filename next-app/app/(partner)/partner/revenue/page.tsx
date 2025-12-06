'use client';

import React from 'react';
import { PartnerPayoutDashboard } from '@/components/payouts/PartnerPayoutDashboard';

export default function PartnerPayoutPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Payouts & Orders</h1>
        <p className="text-gray-600 mt-2">
          Track your payouts (amounts paid for orders) and delivery history
        </p>
      </div>
      <PartnerPayoutDashboard />
    </div>
  );
}



