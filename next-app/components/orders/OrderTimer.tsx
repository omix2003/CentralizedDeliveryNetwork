'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface OrderTimerProps {
  pickedUpAt: string | null | undefined;
  estimatedDuration: number | null | undefined;
  status?: string; // Order status (e.g., 'DELIVERED', 'DELAYED', etc.)
  deliveredAt?: string | null | undefined; // Delivery timestamp
  timing?: {
    elapsedMinutes: number | null;
    remainingMinutes: number | null;
    isDelayed: boolean;
    elapsedTime: string | null;
    remainingTime: string | null;
  };
}

export function OrderTimer({ pickedUpAt, estimatedDuration, status, deliveredAt, timing }: OrderTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDelayed, setIsDelayed] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);
  const [finalElapsedTime, setFinalElapsedTime] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!pickedUpAt || !estimatedDuration) {
      return;
    }

    // Check if order is delivered
    const delivered = status === 'DELIVERED' && deliveredAt;
    setIsDelivered(!!delivered);

    // If delivered, calculate final elapsed time once
    if (delivered && deliveredAt) {
      const deliveryTime = new Date(deliveredAt).getTime();
      const pickupTime = new Date(pickedUpAt).getTime();
      const elapsedMs = deliveryTime - pickupTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
      setFinalElapsedTime({ minutes: elapsedMinutes, seconds: elapsedSecs });
      setIsDelayed(elapsedMinutes > estimatedDuration);
      return; // Stop updating if delivered
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

    // Update every second (only if not delivered)
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [pickedUpAt, estimatedDuration, status, deliveredAt]);

  if (!pickedUpAt || !estimatedDuration) {
    return null;
  }

  // Use final elapsed time if delivered, otherwise calculate current time
  let elapsedMinutes: number;
  let elapsedSecs: number;
  
  if (isDelivered && finalElapsedTime) {
    elapsedMinutes = finalElapsedTime.minutes;
    elapsedSecs = finalElapsedTime.seconds;
  } else {
    const now = new Date().getTime();
    const pickupTime = new Date(pickedUpAt).getTime();
    const elapsedMs = now - pickupTime;
    elapsedMinutes = Math.floor(elapsedMs / 60000);
    elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
  }
  
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
      isDelivered 
        ? 'bg-green-50 border border-green-200' 
        : isCurrentlyDelayed 
          ? 'bg-red-50 border border-red-200' 
          : 'bg-blue-50 border border-blue-200'
    }`}>
      {isDelivered ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <Clock className={`h-5 w-5 ${isCurrentlyDelayed ? 'text-red-600' : 'text-blue-600'}`} />
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">
          {isDelivered 
            ? 'Delivered' 
            : isCurrentlyDelayed 
              ? 'Delayed' 
              : 'Elapsed Time'}
        </div>
        <div className={`text-lg font-bold ${
          isDelivered 
            ? 'text-green-600' 
            : isCurrentlyDelayed 
              ? 'text-red-600' 
              : 'text-blue-600'
        }`}>
          {formatTime(elapsedMinutes, elapsedSecs)}
        </div>
      </div>
      {isDelivered ? (
        <div className="text-right">
          <div className="text-xs text-gray-500">Total Time</div>
          <div className="text-sm font-semibold text-gray-700">
            {elapsedMinutes}m {elapsedSecs}s
          </div>
        </div>
      ) : !isCurrentlyDelayed && remainingMinutes > 0 ? (
        <div className="text-right">
          <div className="text-xs text-gray-500">Remaining</div>
          <div className="text-sm font-semibold text-gray-700">
            {remainingMinutes}m
          </div>
        </div>
      ) : isCurrentlyDelayed ? (
        <div className="text-right">
          <div className="text-xs text-red-600">Over by</div>
          <div className="text-sm font-semibold text-red-600">
            {elapsedMinutes - estimatedDuration}m
          </div>
        </div>
      ) : null}
    </div>
  );
}
