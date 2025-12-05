import React from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { MapPin, Phone, Mail, Truck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddressDisplay } from './AddressDisplay';
import { formatCurrency } from '@/lib/utils/currency';
import { DelayedBadge } from './DelayedBadge';

interface OrderCardProps {
  orderId: string;
  trackingNumber?: string;
  status: string;
  isDelayed?: boolean; // Optional flag to indicate if order is delayed
  from: {
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
  };
  to: {
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
  };
  customer?: {
    name: string;
    avatar?: string;
    phone?: string;
    email?: string;
  };
  courier?: {
    name: string;
    avatar?: string;
    phone?: string;
  };
  progress?: number;
  weight?: string;
  deliveryDate?: string;
  payout?: number;
  distance?: number;
  selected?: boolean;
  onSelect?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onTrack?: () => void;
}

export function OrderCard({
  orderId,
  trackingNumber,
  status,
  isDelayed,
  from,
  to,
  customer,
  courier,
  progress,
  weight,
  deliveryDate,
  payout,
  distance,
  selected = false,
  onSelect,
  onAccept,
  onReject,
  onTrack,
}: OrderCardProps) {
  return (
    <Card
      hoverEffect={!!onSelect}
      className={cn(
        'transition-all border-2',
        selected 
          ? 'border-blue-500 shadow-lg' 
          : 'border-transparent hover:border-gray-200 hover:shadow-md'
      )}
      onClick={onSelect}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h4 className="text-lg font-semibold text-gray-900">
                {trackingNumber ? `#${trackingNumber}` : `Order #${orderId}`}
              </h4>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                {(status === 'DELAYED' || status?.toUpperCase() === 'DELAYED' || isDelayed) && (
                  <DelayedBadge />
                )}
              </div>
            </div>
            {progress !== undefined && (
              <ProgressBar value={progress} variant="info" size="sm" />
            )}
          </div>
        </div>

        {/* Addresses - Simplified */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pickup</p>
              <p className="text-sm text-gray-900 font-medium leading-snug">
                {from.latitude !== undefined && from.longitude !== undefined ? (
                  <AddressDisplay
                    latitude={from.latitude}
                    longitude={from.longitude}
                    fallback={from.address || `${from.latitude.toFixed(4)}, ${from.longitude.toFixed(4)}`}
                  />
                ) : (
                  from.address || 'Address not available'
                )}
                {(from.city || from.state) && (
                  <span className="text-gray-500">, {[from.city, from.state].filter(Boolean).join(' ')}</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivery</p>
              <p className="text-sm text-gray-900 font-medium leading-snug">
                {to.latitude !== undefined && to.longitude !== undefined ? (
                  <AddressDisplay
                    latitude={to.latitude}
                    longitude={to.longitude}
                    fallback={to.address || `${to.latitude.toFixed(4)}, ${to.longitude.toFixed(4)}`}
                  />
                ) : (
                  to.address || 'Address not available'
                )}
                {(to.city || to.state) && (
                  <span className="text-gray-500">, {[to.city, to.state].filter(Boolean).join(' ')}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Customer/Courier - Compact */}
        {(customer || courier) && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
              {(customer?.avatar || courier?.avatar) ? (
                <img
                  src={customer?.avatar || courier?.avatar}
                  alt={customer?.name || courier?.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {(customer?.name || courier?.name || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {customer?.name || courier?.name}
              </p>
              {courier && <p className="text-xs text-gray-500">Courier</p>}
            </div>
            {(customer?.phone || courier?.phone) && (
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle phone call
                }}
              >
                <Phone className="h-4 w-4 text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* Meta Info - Compact Row */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            {distance && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {distance} km
              </span>
            )}
            {weight && (
              <span className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                {weight}
              </span>
            )}
            {deliveryDate && <span>{deliveryDate}</span>}
          </div>
          {payout && (
            <span className="text-base font-bold text-green-600">{formatCurrency(payout)}</span>
          )}
        </div>

        {/* Actions */}
        {(onAccept || onReject || onTrack) && (
          <div className="flex gap-2 pt-4 border-t border-gray-100">
            {onTrack && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1" 
                onClick={(e) => {
                  e.stopPropagation();
                  onTrack();
                }}
              >
                Track
              </Button>
            )}
            {onAccept && (
              <Button 
                variant="primary" 
                size="sm" 
                className="flex-1" 
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept();
                }}
              >
                Accept
              </Button>
            )}
            {onReject && (
              <Button 
                variant="outline" 
                size="sm"
                className="text-gray-600 hover:text-gray-900"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
              >
                Decline
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
