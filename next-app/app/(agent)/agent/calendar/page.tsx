'use client';

import { AgentCalendar } from '@/components/calendar/AgentCalendar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { agentApi } from '@/lib/api/agent';
import { Calendar, Clock } from 'lucide-react';

export default function CalendarPage() {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate) return;

    setSubmitting(true);
    try {
      await agentApi.setSchedule({
        date: scheduleDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        isAvailable,
        notes: notes || undefined,
      });
      alert('Schedule updated successfully!');
      setShowScheduleForm(false);
      setScheduleDate('');
      setStartTime('');
      setEndTime('');
      setNotes('');
      setIsAvailable(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar & Schedule</h1>
          <p className="text-gray-600 mt-2">Manage your availability and view delivery history</p>
        </div>
        <Button onClick={() => setShowScheduleForm(!showScheduleForm)}>
          <Calendar className="h-4 w-4 mr-2" />
          {showScheduleForm ? 'Cancel' : 'Set Schedule'}
        </Button>
      </div>

      {showScheduleForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Set Availability</h2>
          <form onSubmit={handleSubmitSchedule} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available
                </label>
                <select
                  value={isAvailable ? 'true' : 'false'}
                  onChange={(e) => setIsAvailable(e.target.value === 'true')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes about your availability..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Schedule'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScheduleForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <AgentCalendar viewType="MONTHLY" />
    </div>
  );
}



