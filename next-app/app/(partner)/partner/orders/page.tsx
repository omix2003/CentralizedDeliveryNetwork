'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { partnerApi, Order } from '@/lib/api/partner';
import { AddressDisplay } from '@/components/orders/AddressDisplay';
import { Package, Plus, RefreshCw, Filter, Search, MapPin, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { useRouter } from 'next/navigation';

export default function PartnerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await partnerApi.getOrders(params);
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.trackingNumber.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        order.agent?.name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track your delivery orders</p>
        </div>
        <Button onClick={() => router.push('/partner/orders/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by tracking number or agent name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="SEARCHING_AGENT">Searching Agent</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first order to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => router.push('/partner/orders/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-lg font-semibold text-gray-900">
                        #{order.trackingNumber}
                      </h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                      Created: {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex flex-col items-end gap-2">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(order.payout)}
                    </p>
                    {order.priority && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                        order.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.priority}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-orange-500 mt-1" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Pickup</p>
                      <p className="text-sm text-gray-900">
                        <AddressDisplay
                          latitude={order.pickup.latitude}
                          longitude={order.pickup.longitude}
                          fallback={formatCoordinates(order.pickup.latitude, order.pickup.longitude)}
                        />
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Delivery</p>
                      <p className="text-sm text-gray-900">
                        <AddressDisplay
                          latitude={order.dropoff.latitude}
                          longitude={order.dropoff.longitude}
                          fallback={formatCoordinates(order.dropoff.latitude, order.dropoff.longitude)}
                        />
                      </p>
                    </div>
                  </div>
                </div>

                {order.agent && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Assigned Agent</p>
                    <p className="text-sm text-gray-900">{order.agent.name}</p>
                    {order.agent.phone && (
                      <p className="text-xs text-gray-500">{order.agent.phone}</p>
                    )}
                  </div>
                )}

                {order.estimatedDuration && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Est. Duration: {order.estimatedDuration} minutes</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/partner/orders/${order.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}







