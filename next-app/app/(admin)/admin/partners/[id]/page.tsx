'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Building2, Package, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { format } from 'date-fns';

export default function PartnerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (partnerId) {
      fetchPartnerDetails();
    }
  }, [partnerId]);

  async function fetchPartnerDetails() {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getPartnerDetails(partnerId);
      setPartner(data);
    } catch (err: any) {
      console.error('Failed to fetch partner details:', err);
      setError(err.message || 'Failed to load partner details');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePartner() {
    if (!partner) return;

    const confirmMessage = `Are you sure you want to delete "${partner.companyName}"?\n\nThis will permanently delete:\n- The partner account\n- All associated orders (${partner._count?.orders || 0} orders)\n- All associated data\n- The user account\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(true);
      await adminApi.deletePartner(partnerId);
      // Redirect to partners list after successful deletion
      router.push('/admin/partners');
    } catch (err: any) {
      console.error('Failed to delete partner:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete partner';
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading partner details...</div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error || 'Partner not found'}</p>
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
            {partner.user.profilePicture ? (
              <img
                src={partner.user.profilePicture.startsWith('http') ? partner.user.profilePicture : `http://localhost:5000${partner.user.profilePicture}`}
                alt={partner.companyName}
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
              className={`w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white ${partner.user.profilePicture ? 'hidden' : 'flex'}`}
            >
              <Building2 className="h-8 w-8" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partner Details</h1>
            <p className="text-gray-600">{partner.companyName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Company Name</p>
                <p className="text-gray-900">{partner.companyName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Contact Person</p>
                <p className="text-gray-900">{partner.user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{partner.user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-gray-900">{partner.user.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">API Key</p>
                <p className="text-gray-900 font-mono text-sm">{partner.apiKey}</p>
              </div>
              {partner.webhookUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Webhook URL</p>
                  <p className="text-gray-900 text-sm break-all">{partner.webhookUrl}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{partner._count?.orders || 0}</p>
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
              {partner.orders && partner.orders.length > 0 ? (
                <div className="space-y-3">
                  {partner.orders.map((order: any) => (
                    <div key={order.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.agent?.user.name || 'Unassigned'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${order.payoutAmount.toFixed(2)}</p>
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

        {/* Status Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Status</p>
                  {partner.isActive ? (
                    <span className="flex items-center gap-1 text-green-600 mt-1">
                      <CheckCircle className="h-4 w-4" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 mt-1">
                      <XCircle className="h-4 w-4" />
                      Inactive
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-gray-900 text-sm">
                    {format(new Date(partner.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleDeletePartner}
                    disabled={deleting}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleting ? 'Deleting...' : 'Delete Partner'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

