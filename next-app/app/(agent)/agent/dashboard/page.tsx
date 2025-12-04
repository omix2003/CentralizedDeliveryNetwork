'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/shared/MetricCard';
import { OrderCard } from '@/components/orders/OrderCard';
import { AddressDisplay } from '@/components/orders/AddressDisplay';
import { OnlineToggle } from '@/components/agent/OnlineToggle';
import { Package, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from 'next-auth/react';
import { agentApi, AvailableOrder, AgentMetrics } from '@/lib/api/agent';
import { locationTracker, Location } from '@/lib/services/locationTracker';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AgentDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [status, setStatus] = useState<'OFFLINE' | 'ONLINE' | 'ON_TRIP'>('OFFLINE');
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Load agent profile and status on mount
  useEffect(() => {
    loadProfile();
    loadMetrics();
    
    // Cleanup location tracking on unmount
    return () => {
      if (locationTracker.isActive()) {
        locationTracker.stopTracking();
      }
    };
  }, []);

  // Refresh metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadMetrics();
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await agentApi.getProfile();
      setStatus(profile.status as 'OFFLINE' | 'ONLINE' | 'ON_TRIP');
      
      // Start location tracking if online
      if (profile.status === 'ONLINE' || profile.status === 'ON_TRIP') {
        startLocationTracking();
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      if (error.isNetworkError || !error.response) {
        console.error('Network error: Cannot connect to backend server. Please make sure it is running on port 5000.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      setMetricsLoading(true);
      const data = await agentApi.getMetrics();
      console.log('[Dashboard] Metrics loaded:', { 
        hasActiveOrder: !!data.activeOrder, 
        activeOrderId: data.activeOrder?.id,
        activeOrderStatus: data.activeOrder?.status 
      });
      setMetrics(data);
    } catch (error: any) {
      console.error('Failed to load metrics:', error);
      if (error.isNetworkError || !error.response) {
        console.error('Network error: Cannot connect to backend server. Please make sure it is running on port 5000.');
      }
    } finally {
      setMetricsLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      setLocationError(null);
      await locationTracker.startTracking(
        (location) => {
          setCurrentLocation(location);
        },
        (error) => {
          let errorMessage = 'Location access denied';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location unavailable. Please check your device location settings.';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out. Please try again.';
          }
          setLocationError(errorMessage);
        },
        5000 // Update every 5 seconds
      );
    } catch (error: any) {
      setLocationError(error.message || 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    locationTracker.stopTracking();
    setCurrentLocation(null);
    setLocationError(null);
  };

  const handleStatusChange = (newStatus: 'OFFLINE' | 'ONLINE' | 'ON_TRIP') => {
    setStatus(newStatus);
    
    if (newStatus === 'ONLINE' || newStatus === 'ON_TRIP') {
      startLocationTracking();
      // Load orders after status is updated (don't check status in loadOrders)
      setTimeout(() => loadOrders(false), 100);
    } else {
      stopLocationTracking();
      setOrders([]); // Clear orders when going offline
    }
  };

  const loadOrders = async (checkStatus: boolean = true) => {
    // Check current status if requested
    if (checkStatus && status !== 'ONLINE' && status !== 'ON_TRIP') return;
    
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const data = await agentApi.getAvailableOrders();
      setOrders(data);
    } catch (err: any) {
      setOrdersError(err.response?.data?.error || 'Failed to load orders');
      console.error('Error loading orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setOrdersError(null);
      await agentApi.acceptOrder(orderId);
      // Reload orders and profile
      await Promise.all([loadOrders(), loadProfile()]);
    } catch (err: any) {
      setOrdersError(err.response?.data?.error || 'Failed to accept order');
      console.error('Error accepting order:', err);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      setOrdersError(null);
      await agentApi.rejectOrder(orderId);
      // Remove from list
      setOrders(orders.filter(o => o.id !== orderId));
    } catch (err: any) {
      setOrdersError(err.response?.data?.error || 'Failed to reject order');
      console.error('Error rejecting order:', err);
    }
  };

  // Load orders when status becomes online and refresh periodically
  useEffect(() => {
    if (status === 'ONLINE' || status === 'ON_TRIP') {
      loadOrders(false);
      // Refresh orders every 30 seconds
      const interval = setInterval(() => loadOrders(false), 30000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Reload metrics when order is accepted
  const handleAcceptOrderWithMetrics = async (orderId: string) => {
    await handleAcceptOrder(orderId);
    await loadMetrics(); // Refresh metrics after accepting order
  };

  // Helper to format coordinates as address (simplified - in real app would use geocoding)
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Status Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Agent'}!
          </h1>
          <p className="text-gray-500">Manage your deliveries and track your earnings</p>
        </div>
        <OnlineToggle
          initialStatus={status}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Location Error Alert */}
      {locationError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{locationError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Status */}
      {currentLocation && (status === 'ONLINE' || status === 'ON_TRIP') && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-green-800 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>
                Location tracking active • 
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton variant="text" width="60%" className="mb-2" />
                <Skeleton variant="text" width="40%" height={32} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Today's Orders"
            value={metrics.todayOrders}
            icon={Package}
            trend={
              metrics.ordersChange !== 0
                ? {
                    value: Math.abs(metrics.ordersChange),
                    label: 'vs yesterday',
                    isPositive: metrics.ordersChange > 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Monthly Earnings"
            value={formatCurrency(metrics.monthlyEarnings)}
            icon={DollarSign}
            trend={
              metrics.earningsChange !== 0
                ? {
                    value: Math.abs(metrics.earningsChange),
                    label: 'vs last month',
                    isPositive: metrics.earningsChange > 0,
                  }
                : undefined
            }
            variant="success"
          />
          <MetricCard
            title="Active Orders"
            value={metrics.activeOrders}
            icon={Clock}
            variant="primary"
          />
          <MetricCard
            title="Completed"
            value={metrics.completedOrders}
            icon={CheckCircle}
            variant="success"
            subtitle={`${metrics.totalOrders} total orders`}
          />
        </div>
      ) : null}

      {/* Active Order */}
      {metrics?.activeOrder ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Active Order</h2>
              <p className="text-sm text-gray-500 mt-1">Currently assigned to you</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/agent/orders/${metrics.activeOrder?.id}`)}
            >
              View Details
            </Button>
          </div>
          <OrderCard
            orderId={metrics.activeOrder.id}
            trackingNumber={metrics.activeOrder.trackingNumber}
            status={metrics.activeOrder.status}
            from={{ latitude: metrics.activeOrder.pickup.latitude, longitude: metrics.activeOrder.pickup.longitude }}
            to={{ latitude: metrics.activeOrder.dropoff.latitude, longitude: metrics.activeOrder.dropoff.longitude }}
            customer={{ name: metrics.activeOrder.partner.name, phone: metrics.activeOrder.partner.phone }}
            payout={metrics.activeOrder.payout}
            onSelect={() => router.push(`/agent/orders/${metrics.activeOrder?.id}`)}
            onTrack={() => router.push(`/agent/orders/${metrics.activeOrder?.id}`)}
          />
        </div>
      )}

      {/* Available Orders */}
      {(status === 'ONLINE' || status === 'ON_TRIP') ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Available Orders</h2>
              <p className="text-sm text-gray-500 mt-1">
                {ordersLoading ? 'Loading...' : `${orders.length} orders available`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => loadOrders()} disabled={ordersLoading}>
              Refresh
            </Button>
          </div>
          
          {ordersError && (
            <Card className="border-red-200 bg-red-50 mb-4">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-red-800 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{ordersError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {ordersLoading && orders.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="flex items-center justify-center">
                  <Clock className="h-8 w-8 animate-spin text-gray-400" />
                </div>
                <p className="text-gray-600 mt-4">Loading available orders...</p>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders available</h3>
                <p className="text-gray-600">New orders will appear here when they become available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  orderId={order.id}
                  trackingNumber={order.trackingNumber}
                  status={order.status}
                  from={{ latitude: order.pickup.latitude, longitude: order.pickup.longitude }}
                  to={{ latitude: order.dropoff.latitude, longitude: order.dropoff.longitude }}
                  customer={{ name: order.partner.name }}
                  payout={order.payout}
                  onAccept={() => handleAcceptOrderWithMetrics(order.id)}
                  onReject={() => handleRejectOrder(order.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                You're currently offline
              </h3>
              <p className="text-gray-600 mb-6">
                Turn on your status to start receiving delivery orders and earning money
              </p>
              <Button 
                onClick={async () => {
                  try {
                    const result = await agentApi.updateStatus('ONLINE');
                    handleStatusChange(result.status as 'OFFLINE' | 'ONLINE' | 'ON_TRIP');
                  } catch (error) {
                    console.error('Failed to go online:', error);
                  }
                }} 
                size="lg" 
                className="px-8"
              >
                Go Online
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
