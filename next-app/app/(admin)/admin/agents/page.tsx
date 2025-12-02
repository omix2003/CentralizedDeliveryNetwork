'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Filter, CheckCircle, XCircle, Ban, UserCheck, UserX, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminApi, Agent } from '@/lib/api/admin';
import { getImageUrl } from '@/lib/utils/imageUrl';

export default function AgentsManagementPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [approvalFilter, setApprovalFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [page, statusFilter, approvalFilter, searchQuery]);

  async function fetchAgents() {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAgents({
        search: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        isApproved: approvalFilter === 'APPROVED' ? true : approvalFilter === 'PENDING' ? false : undefined,
        page,
        limit: 20,
      });
      setAgents(response.agents);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch agents:', err);
      setError(err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAgent(agentId: string, agentName: string) {
    const confirmMessage = `Are you sure you want to delete "${agentName}"?\n\nThis will permanently delete:\n- The agent account\n- All associated orders\n- All associated data\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingId(agentId);
      await adminApi.deleteAgent(agentId);
      // Refresh the list
      await fetchAgents();
    } catch (err: any) {
      console.error('Failed to delete agent:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete agent';
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleApprove(agentId: string) {
    try {
      await adminApi.approveAgent(agentId);
      fetchAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to approve agent');
    }
  }

  async function handleBlock(agentId: string) {
    if (!confirm('Are you sure you want to block this agent?')) return;
    try {
      await adminApi.blockAgent(agentId, 'Blocked by admin');
      fetchAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to block agent');
    }
  }

  async function handleUnblock(agentId: string) {
    try {
      await adminApi.unblockAgent(agentId);
      fetchAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to unblock agent');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-100 text-green-800';
      case 'ON_TRIP':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agents Management</h1>
        <p className="text-gray-600">Manage and monitor all delivery agents</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="ONLINE">Online</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="OFFLINE">Offline</option>
            </select>

            {/* Approval Filter */}
            <select
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agents List ({agents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No agents found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Rating</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Orders</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Approval</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => router.push(`/admin/agents/${agent.id}`)}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-3"
                          >
                            <div className="relative">
                              {agent.user.profilePicture ? (
                                <img
                                  src={getImageUrl(agent.user.profilePicture) || ''}
                                  alt={agent.user.name}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm ${agent.user.profilePicture ? 'hidden' : 'flex'}`}
                              >
                                {agent.user.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <span>{agent.user.name}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{agent.user.email}</td>
                        <td className="py-3 px-4 text-gray-600">{agent.user.phone}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                            {agent.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {agent.rating ? (
                            <span className="text-gray-900">{agent.rating.toFixed(1)} ⭐</span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{agent.totalOrders}</td>
                        <td className="py-3 px-4">
                          {agent.isApproved ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Approved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <XCircle className="h-4 w-4" />
                              Pending
                            </span>
                          )}
                          {agent.isBlocked && (
                            <span className="flex items-center gap-1 text-red-600 ml-2">
                              <Ban className="h-4 w-4" />
                              Blocked
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {!agent.isApproved && (
                              <Button
                                size="sm"
                                variant="premium"
                                onClick={() => handleApprove(agent.id)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {!agent.isBlocked ? (
                              <Button
                                size="sm"
                                variant="premium"
                                onClick={() => handleBlock(agent.id)}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Block
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="premium"
                                onClick={() => handleUnblock(agent.id)}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Unblock
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAgent(agent.id, agent.user.name)}
                              disabled={deletingId === agent.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

