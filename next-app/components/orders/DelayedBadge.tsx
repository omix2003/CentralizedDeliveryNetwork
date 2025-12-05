'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function DelayedBadge() {
  return (
    <Badge 
      variant="danger" 
      size="md"
      className="!flex !items-center !gap-1.5 !px-3 !py-1.5 !text-sm !font-semibold !animate-pulse !bg-red-500 !text-white !border-2 !border-red-600 !shadow-lg"
      style={{ zIndex: 10 }}
    >
      <AlertTriangle className="h-4 w-4" />
      <span>Delayed</span>
    </Badge>
  );
}
