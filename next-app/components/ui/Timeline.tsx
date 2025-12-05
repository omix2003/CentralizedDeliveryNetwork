import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  completed: boolean;
  current?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className="relative space-y-6">
        {items.map((item, index) => (
          <div key={item.id} className="relative flex gap-4">
            <div className="relative z-10 flex-shrink-0">
              {item.completed ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              ) : item.current ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 ring-4 ring-blue-100">
                  <Circle className="h-5 w-5 text-white fill-white" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                  <Circle className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className={cn('flex-1 pb-6', index === items.length - 1 && 'pb-0')}>
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn(
                  'text-sm font-semibold',
                  item.completed || item.current ? 'text-gray-900' : 'text-gray-500'
                )}>
                  {item.title}
                </h4>
              </div>
              {item.description && (
                <p className="text-sm text-gray-600 mb-1">{item.description}</p>
              )}
              {item.timestamp && (
                <p className="text-xs text-gray-500">{item.timestamp}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

















