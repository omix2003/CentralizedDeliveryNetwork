import React from 'react';
import { Card } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
  subtitle?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  subtitle,
}: MetricCardProps) {
  const iconColors = {
    default: 'text-blue-600 bg-blue-50',
    primary: 'text-blue-700 bg-blue-100',
    success: 'text-green-700 bg-green-100',
    warning: 'text-orange-700 bg-orange-100',
  };

  return (
    <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow', className)}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={cn(
                    'text-xs font-semibold',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', iconColors[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
