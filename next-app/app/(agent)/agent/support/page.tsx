'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MessageSquare, HelpCircle, FileText, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { SupportTicketForm } from '@/components/support/SupportTicketForm';
import { agentApi } from '@/lib/api/agent';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface SupportTicket {
  id: string;
  issueType: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    status: string;
    trackingNumber?: string;
  };
}

const STATUS_COLORS = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const STATUS_ICONS = {
  OPEN: AlertCircle,
  IN_PROGRESS: Clock,
  RESOLVED: CheckCircle,
  CLOSED: XCircle,
};

export default function AgentSupportPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  async function fetchTickets() {
    try {
      setLoading(true);
      const response = await agentApi.getSupportTickets({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setTickets(response.tickets);
    } catch (err: any) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support</h1>
        <p className="text-gray-600 mt-1">Get help with your orders and account</p>
      </div>

      {/* Help Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <HelpCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Common Issues</h3>
            <p className="text-sm text-gray-600">
              Delivery delays, missing items, damaged packages, and more
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
            <p className="text-sm text-gray-600">
              Learn how to use the platform and manage your orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Contact Support</h3>
            <p className="text-sm text-gray-600">
              Create a support ticket and our team will assist you
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Tickets Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Support Tickets</CardTitle>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No support tickets found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const StatusIcon = STATUS_ICONS[ticket.status];
                return (
                  <div
                    key={ticket.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[ticket.status]}`}>
                            <StatusIcon className="h-3 w-3" />
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {ticket.issueType}
                          </span>
                          {ticket.order && (
                            <button
                              onClick={() => router.push(`/agent/orders/${ticket.order?.id}`)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Order: {ticket.order.trackingNumber || ticket.order.id.substring(0, 8)}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mb-2 line-clamp-2">{ticket.description}</p>
                        <p className="text-xs text-gray-500">
                          Created: {format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}
                          {ticket.resolvedAt && (
                            <> • Resolved: {format(new Date(ticket.resolvedAt), 'MMM dd, yyyy HH:mm')}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Section */}
      {!showForm ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Need Help?</h2>
            <p className="text-gray-600 mb-6">
              Create a support ticket and our team will get back to you as soon as possible.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowForm(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Create Support Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
          >
            ← Back
          </Button>
          <SupportTicketForm
            apiCall={agentApi.createSupportTicket}
            onSuccess={() => {
              alert('Support ticket created successfully! Our team will review it shortly.');
              setShowForm(false);
              fetchTickets();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">How do I update my order status?</h3>
            <p className="text-sm text-gray-600">
              Navigate to the order details page and use the status update buttons. You can mark orders as picked up, out for delivery, or delivered.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">What should I do if there's a delivery delay?</h3>
            <p className="text-sm text-gray-600">
              Create a support ticket with the issue type "Delivery Delay" and provide details about the situation. Our team will investigate and assist you.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">How do I report a damaged item?</h3>
            <p className="text-sm text-gray-600">
              Create a support ticket with the issue type "Damaged Item" and include photos if possible. We'll work with you to resolve the issue.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

