'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { agentApi, AvailableOrder, AgentOrder } from '@/lib/api/agent';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useToast } from '@/lib/hooks/useToast';
import { locationTracker, Location } from '@/lib/services/locationTracker';
import { calculateDistance, formatDistance } from '@/lib/utils/distance';
import { Package, RefreshCw, MapPin, DollarSign, Clock, AlertCircle, CheckCircle, Filter, MessageSquare } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AddressDisplay } from '@/components/orders/AddressDisplay';
import { SupportTicketForm } from '@/components/support/SupportTicketForm';
import { DelayedBadge } from '@/components/orders/DelayedBadge';

export default function AgentOrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'available' | 'my-orders'>('available');
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [myOrders, setMyOrders] = useState<AgentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(10); // km
  const [sortBy, setSortBy] = useState<'distance' | 'payout' | 'time'>('distance');
  const [showTicketForm, setShowTicketForm] = useState<string | null>(null);

  // WebSocket connection for real-time order offers
  const { connected: wsConnected, on } = useWebSocket({
    enabled: activeTab === 'available',
    onConnect: () => {
      console.log('[Orders] WebSocket connected');
    },
    onDisconnect: () => {
      console.log('[Orders] WebSocket disconnected');
    },
  });

  // Load current location for distance filtering
  useEffect(() => {
    if (activeTab === 'available') {
      locationTracker.startTracking(
        (location) => {
          setCurrentLocation(location);
        },
        (error) => {
          console.warn('Location tracking error:', error);
        },
        5000
      );
    }

    return () => {
      if (locationTracker.isActive()) {
        locationTracker.stopTracking();
      }
    };
  }, [activeTab]);

  // Set up WebSocket listeners for real-time order offers
  const showToastRef = useRef(showToast);
  
  // Keep showToast ref in sync (it's already memoized, but using ref for extra safety)
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    if (activeTab !== 'available' || !wsConnected) return;

    const unsubscribe = on('order:offer', (data: { order: AvailableOrder }) => {
      console.log('[Orders] New order offer received:', data.order);
      setAvailableOrders((prev) => {
        // Check if order already exists
        if (prev.some((o) => o.id === data.order.id)) {
          return prev;
        }
        return [data.order, ...prev];
      });
      showToastRef.current('info', `New order available: #${data.order.trackingNumber}`);
    });

    return () => {
      unsubscribe();
    };
  }, [activeTab, wsConnected, on]); // Removed showToast from deps, using ref instead

  useEffect(() => {
    if (activeTab === 'available') {
      loadAvailableOrders();
    } else {
      loadMyOrders();
    }
  }, [activeTab, statusFilter]);

  const loadAvailableOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentApi.getAvailableOrders();
      setAvailableOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load available orders');
      console.error('Error loading available orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async () => {
    try {
      setMyOrdersLoading(true);
      setError(null);
      const status = statusFilter !== 'all' ? statusFilter : undefined;
      const data = await agentApi.getMyOrders(status);
      setMyOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load your orders');
      console.error('Error loading my orders:', err);
    } finally {
      setMyOrdersLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setError(null);
      await agentApi.acceptOrder(orderId);
      showToast('success', 'Order accepted successfully!');
      // Reload both lists
      await Promise.all([loadAvailableOrders(), loadMyOrders()]);
      // Switch to my orders tab
      setActiveTab('my-orders');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to accept order';
      setError(errorMsg);
      showToast('error', errorMsg);
      console.error('Error accepting order:', err);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      setError(null);
      await agentApi.rejectOrder(orderId);
      // Remove from available orders
      setAvailableOrders(availableOrders.filter(o => o.id !== orderId));
      showToast('info', 'Order declined');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to reject order';
      setError(errorMsg);
      showToast('error', errorMsg);
      console.error('Error rejecting order:', err);
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Filter and sort available orders by distance
  const filteredAndSortedOrders = useMemo(() => {
    if (activeTab === 'my-orders') {
      return myOrders;
    }

    let filtered: (AvailableOrder & { distance?: number })[] = [...availableOrders];

    // Filter by distance if location is available
    if (currentLocation && maxDistance > 0) {
      filtered = filtered
        .map((order) => {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            order.pickup.latitude,
            order.pickup.longitude
          );
          return { ...order, distance };
        })
        .filter((order) => order.distance && order.distance <= maxDistance * 1000); // Convert km to meters

      // Sort by selected criteria
      filtered.sort((a, b) => {
        if (sortBy === 'distance') {
          return (a.distance || 0) - (b.distance || 0);
        } else if (sortBy === 'payout') {
          return b.payout - a.payout;
        } else {
          // Sort by time (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
    } else {
      // Default sort by time if no location
      filtered.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return filtered;
  }, [activeTab, availableOrders, myOrders, currentLocation, maxDistance, sortBy]);

  const currentOrders = filteredAndSortedOrders;
  const isLoading = activeTab === 'available' ? loading : myOrdersLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">View and manage delivery orders</p>
        </div>
        <Button variant="outline" onClick={activeTab === 'available' ? loadAvailableOrders : loadMyOrders} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'available'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Available Orders
          {availableOrders.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
              {availableOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('my-orders')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'my-orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          My Orders
          {myOrders.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-xs">
              {myOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'available' ? (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">Max Distance:</label>
                <select
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>All</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'distance' | 'payout' | 'time')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="distance">Distance</option>
                  <option value="payout">Payout</option>
                  <option value="time">Newest</option>
                </select>
              </div>
              {wsConnected && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Real-time updates active</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Orders</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      )}

      {/* Orders List */}
      {isLoading && currentOrders.length === 0 ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : currentOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'available' ? 'No orders available' : 'No orders found'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'available'
                ? 'New orders will appear here when they become available'
                : 'You don\'t have any orders matching this filter'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {currentOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/agent/orders/${order.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="text-lg font-semibold text-gray-900">
                        #{order.trackingNumber}
                      </h4>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        {(order.status === 'DELAYED' || order.status?.toUpperCase() === 'DELAYED' || ('timing' in order && order.timing?.isDelayed && order.status !== 'DELIVERED' && order.status !== 'CANCELLED')) && (
                          <DelayedBadge />
                        )}
                      </div>
                    </div>
                    {activeTab === 'my-orders' && 'actualDuration' in order && order.actualDuration && (
                      <p className="text-sm text-gray-500">
                        Duration: {order.actualDuration} minutes
                      </p>
                    )}
                    {activeTab === 'available' && 'distance' in order && order.distance && (
                      <p className="text-sm text-blue-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formatDistance(order.distance)} away
                      </p>
                    )}
                  </div>
                  {order.payout && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{formatCurrency(order.payout)}</p>
                    </div>
                  )}
                </div>

                {/* Addresses */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pickup</p>
                      <p className="text-sm text-gray-900 font-medium">
                        <AddressDisplay
                          latitude={order.pickup.latitude}
                          longitude={order.pickup.longitude}
                          fallback={formatCoordinates(order.pickup.latitude, order.pickup.longitude)}
                        />
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivery</p>
                      <p className="text-sm text-gray-900 font-medium">
                        <AddressDisplay
                          latitude={order.dropoff.latitude}
                          longitude={order.dropoff.longitude}
                          fallback={formatCoordinates(order.dropoff.latitude, order.dropoff.longitude)}
                        />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Partner Info */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="h-9 w-9 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {order.partner.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.partner.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {order.partner.companyName}
                    </p>
                  </div>
                </div>

                {/* Timestamps (for My Orders) */}
                {activeTab === 'my-orders' && 'assignedAt' in order && (
                  <div className="space-y-1 mb-4 text-xs text-gray-500">
                    {order.assignedAt && (
                      <p>Assigned: {formatDate(order.assignedAt)}</p>
                    )}
                    {order.pickedUpAt && (
                      <p>Picked up: {formatDate(order.pickedUpAt)}</p>
                    )}
                    {order.deliveredAt && (
                      <p>Delivered: {formatDate(order.deliveredAt)}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  {activeTab === 'available' ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptOrder(order.id);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectOrder(order.id);
                        }}
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/agent/orders/${order.id}`);
                        }}
                      >
                        View Details
                      </Button>
                      {/* Show support ticket button for completed/delivered orders */}
                      {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTicketForm(order.id);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Support Ticket Form Modal */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <SupportTicketForm
              orderId={showTicketForm}
              apiCall={agentApi.createSupportTicket}
              onSuccess={() => {
                setShowTicketForm(null);
                showToast('success', 'Support ticket created successfully!');
              }}
              onCancel={() => setShowTicketForm(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

