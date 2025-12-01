'use client';

import React, { useState, useEffect } from 'react';
import { Power, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { agentApi } from '@/lib/api/agent';
import { useSession } from 'next-auth/react';

interface OnlineToggleProps {
  initialStatus?: 'OFFLINE' | 'ONLINE' | 'ON_TRIP';
  onStatusChange?: (status: 'OFFLINE' | 'ONLINE' | 'ON_TRIP') => void;
  className?: string;
}

export function OnlineToggle({
  initialStatus = 'OFFLINE',
  onStatusChange,
  className = '',
}: OnlineToggleProps) {
  const { data: session } = useSession();
  const [status, setStatus] = useState<'OFFLINE' | 'ONLINE' | 'ON_TRIP'>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleToggle = async () => {
    if (isLoading) return;

    const newStatus = status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE';
    setIsLoading(true);
    setError(null);

    try {
      const result = await agentApi.updateStatus(newStatus);
      setStatus(result.status as 'OFFLINE' | 'ONLINE' | 'ON_TRIP');
      if (onStatusChange) {
        onStatusChange(result.status as 'OFFLINE' | 'ONLINE' | 'ON_TRIP');
      }
    } catch (err: any) {
      // Handle network errors with better messages
      if (err.isNetworkError || !err.response) {
        setError('Cannot connect to server. Please make sure the backend is running.');
        console.error('Network error updating status:', err.message || err);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to update status');
        console.error('Error updating status:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isOnline = status === 'ONLINE' || status === 'ON_TRIP';

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <StatusBadge
        status={isOnline ? 'ONLINE' : 'OFFLINE'}
      />
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative inline-flex h-11 w-20 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOnline ? 'bg-blue-600' : 'bg-gray-200'}
        `}
        aria-label={isOnline ? 'Go offline' : 'Go online'}
      >
        <span
          className={`
            inline-block h-9 w-9 transform rounded-full bg-white shadow-lg transition-transform
            ${isOnline ? 'translate-x-10' : 'translate-x-1'}
          `}
        />
        {isLoading ? (
          <Loader2 className="absolute left-2.5 h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <Power
            className={`absolute left-2.5 h-5 w-5 ${
              isOnline ? 'text-blue-600' : 'text-gray-400'
            }`}
          />
        )}
      </button>
      {error && (
        <span className="text-sm text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}






