'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Search, Filter, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface SupportTicket {
  id: string;
  issueType: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolvedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  order?: {
    id: string;
    status: string;
    trackingNumber?: string;
  };
  agent?: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
  partner?: {
    id: string;
    companyName: string;
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

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentAction, setCommentAction] = useState<{ ticketId: string; action: 'RESOLVE' | 'CLOSE' } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, issueTypeFilter]);

  async function fetchTickets() {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getSupportTickets({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        issueType: issueTypeFilter !== 'ALL' ? issueTypeFilter : undefined,
        page,
        limit: 20,
      });
      setTickets(response.tickets);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch tickets:', err);
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, newStatus: string, notes?: string) {
    try {
      await adminApi.updateTicketStatus(ticketId, newStatus, notes);
      setShowCommentModal(false);
      setAdminNotes('');
      setCommentAction(null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    }
  }

  async function handleResolve(ticketId: string, notes?: string) {
    try {
      await adminApi.resolveTicket(ticketId, notes);
      setShowCommentModal(false);
      setAdminNotes('');
      setCommentAction(null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket');
    }
  }

  function openCommentModal(ticketId: string, action: 'RESOLVE' | 'CLOSE') {
    setCommentAction({ ticketId, action });
    setShowCommentModal(true);
  }

  function handleCommentSubmit() {
    if (!commentAction) return;
    
    if (commentAction.action === 'RESOLVE') {
      handleResolve(commentAction.ticketId, adminNotes);
    } else if (commentAction.action === 'CLOSE') {
      handleUpdateStatus(commentAction.ticketId, 'CLOSED', adminNotes);
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.description.toLowerCase().includes(query) ||
      ticket.user.name.toLowerCase().includes(query) ||
      ticket.user.email.toLowerCase().includes(query) ||
      ticket.id.toLowerCase().includes(query)
    );
  });

  if (loading && tickets.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-1">Manage and resolve customer support tickets</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex justify-center">
          <div className="flex flex-wrap items-center gap-4 w-full max-w-4xl">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={issueTypeFilter}
              onChange={(e) => {
                setIssueTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="DELAY">Delay</option>
              <option value="MISSING">Missing</option>
              <option value="DAMAGE">Damage</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">{error}</div>
            <Button onClick={fetchTickets} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No support tickets found</p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const StatusIcon = STATUS_ICONS[ticket.status];
            return (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[ticket.status]}`}>
                          <StatusIcon className="h-3 w-3" />
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {ticket.issueType}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{ticket.id.substring(0, 8)}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">{ticket.description}</p>
                      {ticket.adminNotes && (
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          <span className="font-medium text-blue-900">Admin Note: </span>
                          <span className="text-blue-800">{ticket.adminNotes}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">User:</span> {ticket.user.name} ({ticket.user.email})
                        </div>
                        {ticket.order && (
                          <div>
                            <span className="font-medium">Order:</span>{' '}
                            <button
                              onClick={() => router.push(`/admin/orders/${ticket.order?.id}`)}
                              className="text-blue-600 hover:underline"
                            >
                              {ticket.order.trackingNumber || ticket.order.id.substring(0, 8)}
                            </button>
                          </div>
                        )}
                        {ticket.agent && (
                          <div>
                            <span className="font-medium">Agent:</span> {ticket.agent.user.name}
                          </div>
                        )}
                        {ticket.partner && (
                          <div>
                            <span className="font-medium">Partner:</span> {ticket.partner.companyName}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Created:</span>{' '}
                          {format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                        {ticket.resolvedAt && (
                          <div>
                            <span className="font-medium">Resolved:</span>{' '}
                            {format(new Date(ticket.resolvedAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {ticket.status === 'OPEN' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                          >
                            Start Progress
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => openCommentModal(ticket.id, 'RESOLVE')}
                          >
                            Resolve
                          </Button>
                        </>
                      )}
                      {ticket.status === 'IN_PROGRESS' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => openCommentModal(ticket.id, 'RESOLVE')}
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(ticket.id, 'OPEN')}
                          >
                            Reopen
                          </Button>
                        </>
                      )}
                      {ticket.status === 'RESOLVED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCommentModal(ticket.id, 'CLOSE')}
                        >
                          Close
                        </Button>
                      )}
                      {ticket.status === 'CLOSED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(ticket.id, 'OPEN')}
                        >
                          Reopen
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/support/${ticket.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && commentAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {commentAction.action === 'RESOLVE' ? 'Resolve Ticket' : 'Close Ticket'}
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
                  variant={commentAction.action === 'RESOLVE' ? 'success' : 'primary'}
                  onClick={handleCommentSubmit}
                >
                  {commentAction.action === 'RESOLVE' ? 'Resolve' : 'Close'} Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

