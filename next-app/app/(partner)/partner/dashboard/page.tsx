'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { MetricCard } from '@/components/shared/MetricCard';
import { OrderCard } from '@/components/orders/OrderCard';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Package, TrendingUp, Clock, CheckCircle, Download, Filter } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { partnerApi } from '@/lib/api/partner';
import { formatCurrency } from '@/lib/utils/currency';

interface DashboardMetrics {
  todayOrders: number;
  monthlyOrders: number;
  monthlyTrend: number;
  activeOrders: number;
  deliveryIssues: number;
  totalDeliveries: number;
}

export default function PartnerDashboard() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load dashboard metrics
      const metricsData = await partnerApi.getDashboardMetrics();
      setMetrics(metricsData);

      // Load recent active orders
      const ordersData = await partnerApi.getOrders({
        status: ['SEARCHING_AGENT', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
        limit: 5,
      });
      setRecentOrders(ordersData.orders);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Delivery Dashboard</h1>
          <p className="text-gray-500">Loading...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Delivery Dashboard</h1>
          <p className="text-gray-500">Welcome back, {session?.user?.name?.split(' ')[0] || 'Partner'}</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Failed to load dashboard data'}</p>
            <Button onClick={loadDashboardData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Delivery Dashboard</h1>
        <p className="text-gray-500">Welcome back, {session?.user?.name?.split(' ')[0] || 'Partner'}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Orders"
          value={metrics.todayOrders}
          icon={Package}
          trend={
            metrics.monthlyTrend !== 0
              ? {
                  value: Math.abs(metrics.monthlyTrend),
                  label: 'vs last month',
                  isPositive: metrics.monthlyTrend > 0,
                }
              : undefined
          }
        />
        <MetricCard
          title="Monthly Orders"
          value={metrics.monthlyOrders.toLocaleString()}
          icon={TrendingUp}
          trend={
            metrics.monthlyTrend !== 0
              ? {
                  value: Math.abs(metrics.monthlyTrend),
                  label: 'vs last month',
                  isPositive: metrics.monthlyTrend > 0,
                }
              : undefined
          }
          variant="primary"
        />
        <MetricCard
          title="Active Orders"
          value={metrics.activeOrders}
          icon={Clock}
          variant="primary"
        />
        <MetricCard
          title="Total Deliveries"
          value={metrics.totalDeliveries.toLocaleString()}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Track your active deliveries</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No active orders at the moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  orderId={order.id}
                  trackingNumber={order.trackingNumber}
                  status={order.status}
                  from={{
                    address: `Lat: ${order.pickup.latitude.toFixed(4)}`,
                    city: `Lng: ${order.pickup.longitude.toFixed(4)}`,
                    state: '',
                  }}
                  to={{
                    address: `Lat: ${order.dropoff.latitude.toFixed(4)}`,
                    city: `Lng: ${order.dropoff.longitude.toFixed(4)}`,
                    state: '',
                  }}
                  courier={order.agent ? {
                    name: order.agent.name,
                    phone: order.agent.phone || '',
                  } : undefined}
                  progress={
                    order.status === 'SEARCHING_AGENT' ? 0 :
                    order.status === 'ASSIGNED' ? 25 :
                    order.status === 'PICKED_UP' ? 50 :
                    order.status === 'OUT_FOR_DELIVERY' ? 75 : 100
                  }
                  weight={formatCurrency(order.payout)}
                  deliveryDate={new Date(order.createdAt).toLocaleDateString()}
                  onTrack={() => window.location.href = `/partner/tracking?order=${order.id}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
