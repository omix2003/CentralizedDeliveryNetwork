import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Status-specific badges for delivery orders
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    'PENDING': { variant: 'warning', label: 'Pending' },
    'SEARCHING_AGENT': { variant: 'warning', label: 'Searching Agent' },
    'ASSIGNED': { variant: 'info', label: 'Assigned' },
    'PICKED_UP': { variant: 'purple', label: 'Picked Up' },
    'IN_TRANSIT': { variant: 'purple', label: 'In Transit' },
    'OUT_FOR_DELIVERY': { variant: 'info', label: 'Out for Delivery' },
    'DELIVERED': { variant: 'success', label: 'Delivered' },
    'DELAYED': { variant: 'danger', label: 'Delayed' },
    'CANCELLED': { variant: 'danger', label: 'Cancelled' },
    'ON_TRIP': { variant: 'info', label: 'On Trip' },
    'ONLINE': { variant: 'success', label: 'Online' },
    'OFFLINE': { variant: 'default', label: 'Offline' },
  };
  
  const config = statusConfig[status] || { variant: 'default', label: status };
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}



