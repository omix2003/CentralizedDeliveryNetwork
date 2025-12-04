'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, CheckCircle, XCircle, Ban, UserCheck, UserX, Package, Star, FileText, Trash2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/utils/imageUrl';

export default function AgentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
    }
  }, [agentId]);

  async function fetchAgentDetails() {
    try {
      setLoading(true);
      const data = await adminApi.getAgentDetails(agentId);
      setAgent(data);
    } catch (err: any) {
      console.error('Failed to fetch agent details:', err);
      setError(err.message || 'Failed to load agent details');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    try {
      await adminApi.approveAgent(agentId);
      fetchAgentDetails();
      alert('Agent approved successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to approve agent');
    }
  }

  async function handleBlock() {
    const reason = prompt('Enter reason for blocking:');
    if (!reason) return;
    try {
      await adminApi.blockAgent(agentId, reason);
      fetchAgentDetails();
      alert('Agent blocked successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to block agent');
    }
  }

  async function handleUnblock() {
    try {
      await adminApi.unblockAgent(agentId);
      fetchAgentDetails();
      alert('Agent unblocked successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to unblock agent');
    }
  }

  async function handleDeleteAgent() {
    if (!agent) return;

    const orderCount = agent.orders?.length || 0;
    const confirmMessage = `Are you sure you want to delete "${agent.user.name}"?\n\nThis will permanently delete:\n- The agent account\n- All associated orders (${orderCount} orders)\n- All associated data (documents, location history, etc.)\n- The user account\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(true);
      await adminApi.deleteAgent(agentId);
      // Redirect to agents list after successful deletion
      router.push('/admin/agents');
    } catch (err: any) {
      console.error('Failed to delete agent:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete agent';
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading agent details...</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error || 'Agent not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-4">
          <div className="relative">
            {agent.user.profilePicture ? (
              <img
                src={getImageUrl(agent.user.profilePicture) || ''}
                alt={agent.user.name}
                className="w-16 h-16 rounded-full object-cover border-4 border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl ${agent.user.profilePicture ? 'hidden' : 'flex'}`}
            >
              {agent.user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Details</h1>
            <p className="text-gray-600">{agent.user.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-gray-900">{agent.user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{agent.user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-gray-900">{agent.user.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Vehicle Type</p>
                <p className="text-gray-900">{agent.vehicleType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="text-gray-900">{agent.status}</p>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                    {agent.rating ? (
                      <>
                        {agent.rating.toFixed(1)} <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      </>
                    ) : (
                      'N/A'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{agent.totalOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{agent.completedOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Acceptance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{agent.acceptanceRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agent.orders && agent.orders.length > 0 ? (
                <div className="space-y-3">
                  {agent.orders.map((order: any) => (
                    <div key={order.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.partner?.user.name || 'Unknown Partner'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(order.payoutAmount)}</p>
                          <p className="text-sm text-gray-600">{order.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No orders yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Approval Status</p>
                {agent.isApproved ? (
                  <span className="flex items-center gap-1 text-green-600 mt-1">
                    <CheckCircle className="h-4 w-4" />
                    Approved
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600 mt-1">
                    <XCircle className="h-4 w-4" />
                    Pending Approval
                  </span>
                )}
              </div>
              {agent.isBlocked && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Block Status</p>
                  <span className="flex items-center gap-1 text-red-600 mt-1">
                    <Ban className="h-4 w-4" />
                    Blocked
                  </span>
                  {agent.blockedReason && (
                    <p className="text-sm text-gray-600 mt-1">Reason: {agent.blockedReason}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!agent.isApproved && (
                <Button
                  className="w-full"
                  onClick={handleApprove}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve Agent
                </Button>
              )}
              {!agent.isBlocked ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleBlock}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block Agent
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleUnblock}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Unblock Agent
                </Button>
              )}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleDeleteAgent}
                  disabled={deleting}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Deleting...' : 'Delete Agent'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents & KYC */}
          <Card>
            <CardHeader>
              <CardTitle>Documents & KYC Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.documents && agent.documents.length > 0 ? (
                <div className="space-y-3">
                  {agent.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className={`p-3 border rounded-lg ${doc.verified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {doc.documentType === 'LICENSE'
                              ? 'Driving License'
                              : doc.documentType === 'VEHICLE_REG'
                                ? 'Vehicle Registration'
                                : doc.documentType === 'ID_PROOF'
                                  ? 'ID Proof'
                                  : doc.documentType}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded: {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {doc.verified ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-600 text-sm">
                            <XCircle className="h-4 w-4" />
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          View Document
                        </Button>
                        {!doc.verified && (
                          <>
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await adminApi.verifyDocument(doc.id);
                                  alert('Document verified successfully');
                                  fetchAgentDetails();
                                } catch (err: any) {
                                  alert(err.message || 'Failed to verify document');
                                }
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                const reason = prompt('Enter rejection reason:');
                                if (!reason) return;
                                try {
                                  await adminApi.rejectDocument(doc.id, reason);
                                  alert('Document rejected');
                                  fetchAgentDetails();
                                } catch (err: any) {
                                  alert(err.message || 'Failed to reject document');
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* KYC Summary */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">KYC Status</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Verified Documents:</span>
                        <span className="font-medium text-blue-900">
                          {agent.documents.filter((d: any) => d.verified).length} / {agent.documents.length}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${(agent.documents.filter((d: any) => d.verified).length / agent.documents.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {agent.documents.some((d: any) => !d.verified) && (
                    <Button
                      className="w-full mt-3"
                      onClick={async () => {
                        if (!confirm('Verify all documents and approve this agent?')) return;
                        try {
                          await adminApi.verifyAgentKYC(agentId);
                          alert('Agent KYC verified and approved');
                          fetchAgentDetails();
                        } catch (err: any) {
                          alert(err.message || 'Failed to verify KYC');
                        }
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Verify All Documents & Approve Agent
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No documents uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

