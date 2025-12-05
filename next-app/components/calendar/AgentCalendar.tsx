'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { agentApi } from '@/lib/api/agent';
import type { CalendarData, AgentSchedule } from '@/lib/api/agent';
import { formatCurrency } from '@/lib/utils/currency';
import { Skeleton } from '@/components/ui/Skeleton';

interface AgentCalendarProps {
  viewType?: 'MONTHLY' | 'WEEKLY';
}

export function AgentCalendar({ viewType = 'MONTHLY' }: AgentCalendarProps) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'MONTHLY' | 'WEEKLY'>(viewType);

  useEffect(() => {
    loadCalendar();
  }, [currentDate, activeView]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate);
      if (activeView === 'MONTHLY') {
        startDate.setDate(1);
      } else {
        // Start of week (Sunday)
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
      }

      const data = await agentApi.getCalendar({
        viewType: activeView,
        startDate: startDate.toISOString().split('T')[0],
      });
      setCalendarData(data.calendar);
    } catch (error: any) {
      console.error('Failed to load calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (activeView === 'MONTHLY') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const getDaysInView = () => {
    const days: Date[] = [];
    const start = new Date(currentDate);
    
    if (activeView === 'MONTHLY') {
      start.setDate(1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of month
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }
    } else {
      // Week view
      const day = start.getDay();
      start.setDate(start.getDate() - day); // Start from Sunday
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
    }
    
    return days;
  };

  const getScheduleForDate = (date: Date): AgentSchedule | undefined => {
    if (!calendarData) return undefined;
    const dateStr = date.toISOString().split('T')[0];
    return calendarData.schedules.find(
      (s) => s.date.split('T')[0] === dateStr
    );
  };

  const getDeliveriesForDate = (date: Date) => {
    if (!calendarData) return [];
    const dateStr = date.toISOString().split('T')[0];
    return calendarData.deliveries.filter(
      (d) => d.deliveredAt.split('T')[0] === dateStr
    );
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const days = getDaysInView();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{monthName}</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveView('MONTHLY')}
              variant={activeView === 'MONTHLY' ? 'primary' : 'outline'}
              size="sm"
            >
              Month
            </Button>
            <Button
              onClick={() => setActiveView('WEEKLY')}
              variant={activeView === 'WEEKLY' ? 'primary' : 'outline'}
              size="sm"
            >
              Week
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigateDate('prev')} variant="outline" size="sm">
            ← Prev
          </Button>
          <Button onClick={() => navigateDate('next')} variant="outline" size="sm">
            Next →
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        {days.map((date, idx) => {
          const schedule = getScheduleForDate(date);
          const deliveries = getDeliveriesForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();

          return (
            <div
              key={idx}
              className={`min-h-24 p-2 border rounded-lg ${
                isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              } ${!isCurrentMonth ? 'opacity-50' : ''}`}
            >
              <div className="text-sm font-medium mb-1">{date.getDate()}</div>
              {schedule && (
                <div className="text-xs space-y-1">
                  {schedule.isAvailable ? (
                    <div className="text-green-600">
                      {schedule.startTime && schedule.endTime
                        ? `${schedule.startTime} - ${schedule.endTime}`
                        : 'Available'}
                    </div>
                  ) : (
                    <div className="text-red-600">Unavailable</div>
                  )}
                </div>
              )}
              {deliveries.length > 0 && (
                <div className="mt-1 text-xs">
                  <div className="text-blue-600 font-medium">
                    {deliveries.length} delivery{deliveries.length > 1 ? 'ies' : ''}
                  </div>
                  <div className="text-gray-600">
                    {formatCurrency(
                      deliveries.reduce((sum, d) => sum + d.payoutAmount, 0)
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

