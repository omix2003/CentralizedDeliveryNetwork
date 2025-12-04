'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface OrderTimerProps {
  pickedUpAt: string | null | undefined;
  estimatedDuration: number | null | undefined;
  timing?: {
    elapsedMinutes: number | null;
    remainingMinutes: number | null;
    isDelayed: boolean;
    elapsedTime: string | null;
    remainingTime: string | null;
  };
}

export function OrderTimer({ pickedUpAt, estimatedDuration, timing }: OrderTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (!pickedUpAt || !estimatedDuration) {
      return;
    }

    const calculateElapsed = () => {
      const now = new Date().getTime();
      const pickupTime = new Date(pickedUpAt).getTime();
      const elapsedMs = now - pickupTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
      
      setElapsedSeconds(elapsedSecs);
      setIsDelayed(elapsedMinutes > estimatedDuration);
    };

    // Calculate immediately
    calculateElapsed();

    // Update every second
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [pickedUpAt, estimatedDuration]);

  if (!pickedUpAt || !estimatedDuration) {
    return null;
  }

  const now = new Date().getTime();
  const pickupTime = new Date(pickedUpAt).getTime();
  const elapsedMs = now - pickupTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
  const remainingMinutes = Math.max(0, estimatedDuration - elapsedMinutes);
  const isCurrentlyDelayed = elapsedMinutes > estimatedDuration || timing?.isDelayed;

  const formatTime = (minutes: number, seconds: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${mins}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${
      isCurrentlyDelayed ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
    }`}>
      <Clock className={`h-5 w-5 ${isCurrentlyDelayed ? 'text-red-600' : 'text-blue-600'}`} />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">
          {isCurrentlyDelayed ? 'Delayed' : 'Elapsed Time'}
        </div>
        <div className={`text-lg font-bold ${isCurrentlyDelayed ? 'text-red-600' : 'text-blue-600'}`}>
          {formatTime(elapsedMinutes, elapsedSecs)}
        </div>
      </div>
      {!isCurrentlyDelayed && remainingMinutes > 0 && (
        <div className="text-right">
          <div className="text-xs text-gray-500">Remaining</div>
          <div className="text-sm font-semibold text-gray-700">
            {remainingMinutes}m
          </div>
        </div>
      )}
      {isCurrentlyDelayed && (
        <div className="text-right">
          <div className="text-xs text-red-600">Over by</div>
          <div className="text-sm font-semibold text-red-600">
            {elapsedMinutes - estimatedDuration}m
          </div>
        </div>
      )}
    </div>
  );
}
