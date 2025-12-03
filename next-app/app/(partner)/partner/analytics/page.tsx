'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/shared/MetricCard';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { partnerApi } from '@/lib/api/partner';
import { exportToCSV, exportToJSON, getExportFilename } from '@/lib/utils/export';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Download,
  MapPin
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { OrderHeatmap } from '@/components/maps/OrderHeatmap';
import { ClientOnlyMap } from '@/components/maps/ClientOnlyMap';

interface AnalyticsData {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    activeOrders: number;
    totalPayout: number;
    avgDeliveryTime: number;
    completionRate: string;
    cancellationRate: string;
  };
  breakdown: {
    byStatus: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  };
}

export default function PartnerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [heatmapData, setHeatmapData] = useState<{
    data: Array<{
      location: [number, number];
      type: 'pickup' | 'dropoff';
      status: string;
      date: string;
    }>;
    bounds: {
      minLng: number;
      maxLng: number;
      minLat: number;
      maxLat: number;
    } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, heatmap] = await Promise.all([
        partnerApi.getAnalytics({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
        loadHeatmap(),
      ]);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadHeatmap = async () => {
    try {
      setHeatmapLoading(true);
      const data = await partnerApi.getOrderHeatmap({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setHeatmapData(data);
      return data;
    } catch (err: any) {
      console.error('Failed to load heatmap:', err);
      return null;
    } finally {
      setHeatmapLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const exportData = analytics.breakdown.byDay.map((day) => ({
      date: day.date,
      orders: day.count,
    }));
    exportToCSV(exportData, getExportFilename('partner_analytics', 'csv'));
  };

  const handleExportJSON = () => {
    if (!analytics) return;
    exportToJSON(analytics, getExportFilename('partner_analytics', 'json'));
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error || 'Failed to load analytics'}</span>
        </div>
        <Button onClick={loadAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {formatDate(analytics.period.start)} - {formatDate(analytics.period.end)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!analytics}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={!analytics}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={analytics.summary.totalOrders}
          icon={Package}
          variant="default"
        />
        <MetricCard
          title="Completed"
          value={analytics.summary.completedOrders}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Total Payout"
          value={`$${analytics.summary.totalPayout.toFixed(2)}`}
          icon={DollarSign}
          variant="primary"
        />
        <MetricCard
          title="Avg Delivery Time"
          value={`${Math.round(analytics.summary.avgDeliveryTime)} min`}
          icon={Clock}
          variant="primary"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.summary.completionRate}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Cancellation Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics.summary.cancellationRate}%
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Active Orders</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.summary.activeOrders}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Day Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Orders Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.breakdown.byDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.breakdown.byDay.slice(0, 30).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString();
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.breakdown.byStatus).map(([status, count]) => {
                const total = Object.values(analytics.breakdown.byStatus).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {status.replace('_', ' ').toLowerCase()}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          status === 'DELIVERED' ? 'bg-green-500' :
                          status === 'CANCELLED' ? 'bg-red-500' :
                          status === 'SEARCHING_AGENT' ? 'bg-yellow-500' :
                          status === 'ASSIGNED' ? 'bg-blue-500' :
                          status === 'PICKED_UP' ? 'bg-purple-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Order Location Heatmap
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Visual representation of order pickup and dropoff locations. Hotter colors indicate higher order density.
          </p>
        </CardHeader>
        <CardContent>
          {heatmapLoading ? (
            <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Loading heatmap data...</p>
              </div>
            </div>
          ) : heatmapData && heatmapData.data.length > 0 ? (
            <ClientOnlyMap>
              <OrderHeatmap
                data={heatmapData.data}
                bounds={heatmapData.bounds}
                height="600px"
                onPointClick={(point) => {
                  console.log('Heatmap point clicked:', point);
                }}
              />
            </ClientOnlyMap>
          ) : (
            <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No order location data available for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



