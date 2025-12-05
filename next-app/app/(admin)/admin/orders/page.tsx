'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Package, RefreshCw, XCircle, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminApi, Order } from '@/lib/api/admin';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils/currency';
import { DelayedBadge } from '@/components/orders/DelayedBadge';

export default function OrdersManagementPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const response = await adminApi.getOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit: 20,
      });
      setOrders(response.orders);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function handleReassign(orderId: string) {
    if (!confirm('Reassign this order? It will be set to searching for a new agent.')) return;
    try {
      await adminApi.reassignOrder(orderId);
      fetchOrders();
      alert('Order reassigned successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to reassign order');
    }
  }

  async function handleCancel(orderId: string) {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    try {
      await adminApi.cancelOrder(orderId, reason);
      fetchOrders();
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
      case 'DELAYED':
        return 'bg-orange-100 text-orange-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
        <p className="text-gray-600">Monitor and manage all delivery orders</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
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
              <option value="SEARCHING_AGENT">Searching Agent</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders List ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No orders found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Partner</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Payout</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                            className="text-blue-600 hover:text-blue-700 font-mono text-sm"
                          >
                            {order.id.substring(0, 8).toUpperCase()}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {order.partner?.companyName || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          {order.agent?.user.name || (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {formatCurrency(order.payoutAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                            {(order.status === 'DELAYED' || order.status?.toUpperCase() === 'DELAYED') && <DelayedBadge />}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="premium"
                              onClick={() => router.push(`/admin/orders/${order.id}`)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {order.status === 'ASSIGNED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReassign(order.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Reassign
                              </Button>
                            )}
                            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(order.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
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

