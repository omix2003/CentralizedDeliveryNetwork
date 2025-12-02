'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MessageSquare, X } from 'lucide-react';

interface SupportTicketFormProps {
  orderId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  apiCall: (data: { orderId?: string; issueType: string; description: string }) => Promise<any>;
}

export function SupportTicketForm({ orderId, onSuccess, onCancel, apiCall }: SupportTicketFormProps) {
  const [issueType, setIssueType] = useState<'DELAY' | 'MISSING' | 'DAMAGE' | 'OTHER'>('DELAY');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    try {
      setLoading(true);
      await apiCall({
        orderId,
        issueType,
        description: description.trim(),
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Reset form
        setDescription('');
        setIssueType('DELAY');
        alert('Support ticket created successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create support ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Create Support Ticket
          </CardTitle>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {orderId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order ID
              </label>
              <input
                type="text"
                value={orderId}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="DELAY">Delivery Delay</option>
              <option value="MISSING">Missing Item</option>
              <option value="DAMAGE">Damaged Item</option>
              <option value="OTHER">Other Issue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please describe the issue in detail..."
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Provide as much detail as possible to help us resolve your issue quickly.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !description.trim()}
            >
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


