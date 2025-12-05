'use client';

import React from 'react';
import { PartnerRevenueDashboard } from '@/components/revenue/PartnerRevenueDashboard';

export default function PartnerRevenuePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Revenue & Earnings</h1>
        <p className="text-gray-600 mt-2">
          Track your revenue, commissions, and earnings from completed deliveries
        </p>
      </div>
      <PartnerRevenueDashboard />
    </div>
  );
}

