'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { partnerApi, Order } from '@/lib/api/partner';
import { MapPin, RefreshCw, Package, AlertCircle, Filter } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load map component to avoid SSR issues
const OrderTrackingMap = dynamic(
  () => import('@/components/maps/OrderTrackingMap').then(mod => ({ default: mod.OrderTrackingMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
);

export default function PartnerTrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { limit: 100 };
      if (statusFilter === 'active') {
        params.status = ['SEARCHING_AGENT', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];
      }
      
      const data = await partnerApi.getOrders(params);
      const filteredOrders = statusFilter === 'active'
        ? data.orders.filter(o => 
            ['SEARCHING_AGENT', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status)
          )
        : data.orders;
      
      setOrders(filteredOrders);
      
      if (filteredOrders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(filteredOrders[0].id);
      } else if (selectedOrderId && !filteredOrders.find(o => o.id === selectedOrderId)) {
        setSelectedOrderId(filteredOrders.length > 0 ? filteredOrders[0].id : null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const isValidOrder = (order: Order) => {
    return order.pickup?.latitude && order.pickup?.longitude &&
           order.dropoff?.latitude && order.dropoff?.longitude &&
           !isNaN(order.pickup.latitude) && !isNaN(order.pickup.longitude) &&
           !isNaN(order.dropoff.latitude) && !isNaN(order.dropoff.longitude);
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
          <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
          <p className="text-gray-600 mt-1">Track your active deliveries on the map</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'active' | 'all');
                setSelectedOrderId(null);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active Orders</option>
              <option value="all">All Orders</option>
            </select>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadOrders} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">There are no orders to track at the moment</p>
          </CardContent>
        </Card>
      )}

      {/* Orders and Map */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedOrderId === order.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            #{order.trackingNumber}
                          </h3>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-sm font-bold text-green-600">
                          ${order.payout.toFixed(2)}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-orange-500" />
                          <span className="text-xs">
                            Pickup: {formatCoordinates(order.pickup.latitude, order.pickup.longitude)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-green-500" />
                          <span className="text-xs">
                            Dropoff: {formatCoordinates(order.dropoff.latitude, order.dropoff.longitude)}
                          </span>
                        </div>
                        {order.agent && (
                          <p className="text-xs text-gray-500 mt-1">
                            Agent: {order.agent.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedOrder ? `Tracking: #${selectedOrder.trackingNumber}` : 'Select an order to track'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOrder && isValidOrder(selectedOrder) ? (
                  <div className="space-y-4">
                    <OrderTrackingMap
                      key={selectedOrder.id}
                      pickup={{
                        longitude: selectedOrder.pickup.longitude,
                        latitude: selectedOrder.pickup.latitude,
                      }}
                      dropoff={{
                        longitude: selectedOrder.dropoff.longitude,
                        latitude: selectedOrder.dropoff.latitude,
                      }}
                      agentLocation={
                        selectedOrder.agent
                          ? {
                              longitude: selectedOrder.pickup.longitude,
                              latitude: selectedOrder.pickup.latitude,
                              name: selectedOrder.agent.name,
                            }
                          : undefined
                      }
                      height="600px"
                      showRoute={true}
                    />
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Payout</p>
                        <p className="text-lg font-bold text-green-600">
                          ${selectedOrder.payout.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Priority</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          selectedOrder.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          selectedOrder.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedOrder.priority}
                        </span>
                      </div>
                      {selectedOrder.estimatedDuration && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Est. Duration</p>
                          <p className="text-base font-semibold text-gray-900">
                            {selectedOrder.estimatedDuration} min
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedOrder ? (
                  <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Invalid order coordinates</p>
                      <p className="text-sm text-gray-500 mt-2">This order has missing location data</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Select an order from the list to view on map</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
