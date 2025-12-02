'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { format } from 'date-fns';

const STATUS_COLORS = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function SupportTicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentAction, setCommentAction] = useState<'RESOLVE' | 'CLOSE' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    }
  }, [ticketId]);

  async function fetchTicketDetails() {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getSupportTicketDetails(ticketId);
      setTicket(data);
    } catch (err: any) {
      console.error('Failed to fetch ticket:', err);
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(newStatus: string, notes?: string) {
    try {
      await adminApi.updateTicketStatus(ticketId, newStatus, notes);
      setShowCommentModal(false);
      setAdminNotes('');
      setCommentAction(null);
      fetchTicketDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    }
  }

  async function handleResolve(notes?: string) {
    try {
      await adminApi.resolveTicket(ticketId, notes);
      setShowCommentModal(false);
      setAdminNotes('');
      setCommentAction(null);
      fetchTicketDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket');
    }
  }

  function openCommentModal(action: 'RESOLVE' | 'CLOSE') {
    setCommentAction(action);
    setShowCommentModal(true);
  }

  function handleCommentSubmit() {
    if (commentAction === 'RESOLVE') {
      handleResolve(adminNotes);
    } else if (commentAction === 'CLOSE') {
      handleUpdateStatus('CLOSED', adminNotes);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">{error || 'Ticket not found'}</div>
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={() => router.back()}>Go Back</Button>
              <Button onClick={fetchTicketDetails}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Ticket Details</h1>
          <p className="text-gray-600 mt-1">Ticket #{ticket.id.substring(0, 8)}</p>
        </div>
      </div>

      {/* Ticket Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[ticket.status]}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Issue Type</label>
                <p className="mt-1 text-gray-900">{ticket.issueType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-gray-900">
                    {format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-gray-900">
                    {format(new Date(ticket.updatedAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                {ticket.resolvedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resolved</label>
                    <p className="mt-1 text-gray-900">
                      {format(new Date(ticket.resolvedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>
              {ticket.adminNotes && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{ticket.adminNotes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Information */}
          {(ticket.order || ticket.agent || ticket.partner) && (
            <Card>
              <CardHeader>
                <CardTitle>Related Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.order && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Order</label>
                    <div className="mt-1">
                      <button
                        onClick={() => router.push(`/admin/orders/${ticket.order.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {ticket.order.trackingNumber || ticket.order.id.substring(0, 8)}
                      </button>
                      <span className="ml-2 text-sm text-gray-500">({ticket.order.status})</span>
                    </div>
                  </div>
                )}
                {ticket.agent && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Agent</label>
                    <p className="mt-1 text-gray-900">
                      {ticket.agent.user.name} ({ticket.agent.user.email})
                    </p>
                  </div>
                )}
                {ticket.partner && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Partner</label>
                    <p className="mt-1 text-gray-900">{ticket.partner.companyName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-gray-900">{ticket.user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-gray-900">{ticket.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{ticket.user.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p className="mt-1 text-gray-900">{ticket.user.role}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.status === 'OPEN' && (
                <>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Start Progress
                  </Button>
                  <Button
                    variant="success"
                    className="w-full"
                    onClick={() => openCommentModal('RESOLVE')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </>
              )}
              {ticket.status === 'IN_PROGRESS' && (
                <>
                  <Button
                    variant="success"
                    className="w-full"
                    onClick={() => openCommentModal('RESOLVE')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUpdateStatus('OPEN')}
                  >
                    Reopen
                  </Button>
                </>
              )}
              {ticket.status === 'RESOLVED' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openCommentModal('CLOSE')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Close Ticket
                </Button>
              )}
              {ticket.status === 'CLOSED' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleUpdateStatus('OPEN')}
                >
                  Reopen Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {commentAction === 'RESOLVE' ? 'Resolve Ticket' : 'Close Ticket'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Comment (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any notes or comments about resolving/closing this ticket..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This comment will be visible to the user and saved with the ticket.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCommentModal(false);
                    setAdminNotes('');
                    setCommentAction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={commentAction === 'RESOLVE' ? 'success' : 'primary'}
                  onClick={handleCommentSubmit}
                >
                  {commentAction === 'RESOLVE' ? 'Resolve' : 'Close'} Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

