'use client';

import React, { useState, useEffect } from 'react';
import { reverseGeocode } from '@/lib/utils/geocoding';

interface AddressDisplayProps {
  latitude: number;
  longitude: number;
  fallback?: string;
  className?: string;
}

export function AddressDisplay({ latitude, longitude, fallback, className = '' }: AddressDisplayProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchAddress = async () => {
      try {
        const addr = await reverseGeocode(latitude, longitude);
        if (mounted) {
          setAddress(addr);
        }
      } catch (error) {
        console.error('Error fetching address:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAddress();

    return () => {
      mounted = false;
    };
  }, [latitude, longitude]);

  if (loading) {
    return <span className={className}>Loading address...</span>;
  }

  const displayText = address || fallback || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  return <span className={className}>{displayText}</span>;
}










