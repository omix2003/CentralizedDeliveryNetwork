'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function DelayedBadge() {
  return (
    <Badge variant="danger" className="flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />
      Delayed
    </Badge>
  );
}
