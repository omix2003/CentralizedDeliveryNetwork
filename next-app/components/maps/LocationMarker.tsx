'use client';

import React, { useState, useCallback } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { MapPin, Package, Truck, Home, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MarkerType = 'pickup' | 'dropoff' | 'agent' | 'current' | 'default';

export interface LocationMarkerProps {
  /** Longitude */
  longitude: number;
  /** Latitude */
  latitude: number;
  /** Marker type */
  type?: MarkerType;
  /** Marker label/title */
  label?: string;
  /** Whether marker is draggable */
  draggable?: boolean;
  /** Callback when marker is clicked */
  onClick?: () => void;
  /** Callback when marker is dragged */
  onDragEnd?: (lng: number, lat: number) => void;
  /** Additional CSS classes */
  className?: string;
  /** Custom icon color */
  color?: string;
  /** Whether to show popup on hover */
  showPopup?: boolean;
  /** Popup content */
  popupContent?: React.ReactNode;
}

const markerConfig: Record<MarkerType, { icon: React.ComponentType<any>; color: string; bgColor: string }> = {
  pickup: {
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 border-orange-500',
  },
  dropoff: {
    icon: Home,
    color: 'text-green-600',
    bgColor: 'bg-green-100 border-green-500',
  },
  agent: {
    icon: Truck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 border-blue-500',
  },
  current: {
    icon: Navigation,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 border-purple-500',
  },
  default: {
    icon: MapPin,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 border-gray-500',
  },
};

export function LocationMarker({
  longitude,
  latitude,
  type = 'default',
  label,
  draggable = false,
  onClick,
  onDragEnd,
  className,
  color,
  showPopup = false,
  popupContent,
}: LocationMarkerProps) {
  const config = markerConfig[type];
  const Icon = config.icon;
  const markerColor = color || config.color;
  const markerBg = config.bgColor;

  const [isHovered, setIsHovered] = useState(false);

  const handleDragEnd = useCallback(
    (event: any) => {
      const { lngLat } = event;
      onDragEnd?.(lngLat.lng, lngLat.lat);
    },
    [onDragEnd]
  );

  return (
    <>
      <Marker
        longitude={longitude}
        latitude={latitude}
        anchor="bottom"
        draggable={draggable}
        onDragEnd={handleDragEnd}
        onClick={onClick}
      >
        <div
          className={cn(
            'relative cursor-pointer transition-transform hover:scale-110',
            className
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Pulse animation for current location */}
          {type === 'current' && (
            <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-75"></div>
          )}

          {/* Main marker */}
          <div
            className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-lg',
              markerBg,
              onClick && 'cursor-pointer'
            )}
          >
            <Icon className={cn('h-5 w-5', markerColor)} />
          </div>

          {/* Label */}
          {label && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                {label}
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </div>
      </Marker>

      {/* Popup on hover */}
      {showPopup && isHovered && popupContent && (
        <Marker longitude={longitude} latitude={latitude} anchor="top">
          <div className="bg-white rounded-lg shadow-xl p-3 border border-gray-200 min-w-[200px]">
            {popupContent}
          </div>
        </Marker>
      )}
    </>
  );
}

