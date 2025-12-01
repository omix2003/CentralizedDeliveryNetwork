'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Package, RefreshCw, XCircle, MapPin, Clock, DollarSign } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { format } from 'date-fns';
import { reverseGeocode } from '@/lib/utils/geocoding';

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  async function fetchOrderDetails() {
    try {
      setLoading(true);
      const data = await adminApi.getOrderDetails(orderId);
      setOrder(data);
      
      // Fetch addresses for display
      setAddressesLoading(true);
      const [pickupAddr, dropoffAddr] = await Promise.all([
        reverseGeocode(data.pickupLat, data.pickupLng),
        reverseGeocode(data.dropLat, data.dropLng),
      ]);
      setPickupAddress(pickupAddr);
      setDropoffAddress(dropoffAddr);
      setAddressesLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch order details:', err);
      setError(err.message || 'Failed to load order details');
      setAddressesLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleReassign() {
    if (!confirm('Reassign this order? It will be set to searching for a new agent.')) return;
    try {
      await adminApi.reassignOrder(orderId);
      fetchOrderDetails();
      alert('Order reassigned successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to reassign order');
    }
  }

  async function handleCancel() {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    try {
      await adminApi.cancelOrder(orderId, reason);
      fetchOrderDetails();
      alert('Order cancelled successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SEARCHING_AGENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP':
        return 'bg-purple-100 text-purple-800';
      case 'OUT_FOR_DELIVERY':
        return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error || 'Order not found'}</p>
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-gray-600">Order #{order.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusColor(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Payout Amount</p>
                <p className="text-gray-900 text-xl font-bold">${order.payoutAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Priority</p>
                <p className="text-gray-900">{order.priority || 'NORMAL'}</p>
              </div>
              {order.estimatedDuration && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Estimated Duration</p>
                  <p className="text-gray-900">{order.estimatedDuration} minutes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Pickup Location</p>
                {addressesLoading ? (
                  <p className="text-gray-500">Loading address...</p>
                ) : (
                  <p className="text-gray-900">
                    {pickupAddress || `${order.pickupLat.toFixed(6)}, ${order.pickupLng.toFixed(6)}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Dropoff Location</p>
                {addressesLoading ? (
                  <p className="text-gray-500">Loading address...</p>
                ) : (
                  <p className="text-gray-900">
                    {dropoffAddress || `${order.dropLat.toFixed(6)}, ${order.dropLng.toFixed(6)}`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-gray-900">
                    {format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                {order.assignedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Assigned</p>
                    <p className="text-gray-900">
                      {format(new Date(order.assignedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                )}
                {order.pickedUpAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Picked Up</p>
                    <p className="text-gray-900">
                      {format(new Date(order.pickedUpAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                )}
                {order.deliveredAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Delivered</p>
                    <p className="text-gray-900">
                      {format(new Date(order.deliveredAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                )}
                {order.cancelledAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Cancelled</p>
                    <p className="text-gray-900">
                      {format(new Date(order.cancelledAt), 'MMM d, yyyy HH:mm')}
                    </p>
                    {order.cancellationReason && (
                      <p className="text-sm text-gray-600 mt-1">
                        Reason: {order.cancellationReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Partner Info */}
          <Card>
            <CardHeader>
              <CardTitle>Partner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{order.partner?.companyName || 'N/A'}</p>
                <p className="text-sm text-gray-600">{order.partner?.user.name}</p>
                <p className="text-sm text-gray-600">{order.partner?.user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Agent Info */}
          {order.agent ? (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{order.agent.user.name}</p>
                  <p className="text-sm text-gray-600">{order.agent.user.email}</p>
                  <p className="text-sm text-gray-600">{order.agent.user.phone}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => router.push(`/admin/agents/${order.agent.id}`)}
                  >
                    View Agent Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">No agent assigned</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.status === 'ASSIGNED' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReassign}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reassign Order
                </Button>
              )}
              {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

