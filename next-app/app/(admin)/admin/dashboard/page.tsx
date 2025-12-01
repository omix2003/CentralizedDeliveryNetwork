'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/shared/MetricCard';
import { Users, Package, Building2, Activity, TrendingUp, Clock, Calendar, Download } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { adminApi, AdminMetrics } from '@/lib/api/admin';
import { exportToCSV, exportToJSON, getExportFilename } from '@/lib/utils/export';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [orderMetrics, setOrderMetrics] = useState<any>(null);
  const [agentMetrics, setAgentMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
  });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const [overview, orders, agents] = await Promise.all([
          adminApi.getOverview(),
          adminApi.getOrderMetrics(),
          adminApi.getAgentMetrics(),
        ]);
        setMetrics(overview);
        setOrderMetrics(orders);
        setAgentMetrics(agents);
      } catch (err: any) {
        console.error('Failed to fetch metrics:', err);
        setError(err.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  useEffect(() => {
    async function fetchActivities() {
      try {
        setActivitiesLoading(true);
        const data = await adminApi.getRecentActivity(10);
        setActivities(data);
      } catch (err: any) {
        console.error('Failed to fetch activities:', err);
      } finally {
        setActivitiesLoading(false);
      }
    }

    fetchActivities();
    // Refresh activities every 15 seconds
    const interval = setInterval(fetchActivities, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = () => {
    if (!orderMetrics?.ordersOverTime) return;
    const exportData = orderMetrics.ordersOverTime.map((item: any) => ({
      date: item.date,
      orders: item.count,
    }));
    exportToCSV(exportData, getExportFilename('admin_orders_metrics', 'csv'));
  };

  const handleExportJSON = () => {
    const exportData = {
      overview: metrics,
      orderMetrics,
      agentMetrics,
      exportDate: new Date().toISOString(),
    };
    exportToJSON(exportData, getExportFilename('admin_dashboard', 'json'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Agents"
          value={metrics.totalAgents}
          icon={Users}
        />
        <MetricCard
          title="Active Agents"
          value={metrics.activeAgents}
          icon={Activity}
          variant="success"
          subtitle={`${metrics.onlineAgents} online, ${metrics.onTripAgents} on trip`}
        />
        <MetricCard
          title="Total Partners"
          value={metrics.totalPartners}
          icon={Building2}
          variant="primary"
          subtitle={`${metrics.activePartners} active`}
        />
        <MetricCard
          title="Today's Orders"
          value={metrics.todayOrders}
          icon={Package}
          variant="primary"
        />
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          icon={Package}
          subtitle={`${metrics.thisMonthOrders} this month`}
        />
        <MetricCard
          title="Pending Orders"
          value={metrics.pendingOrders}
          icon={Clock}
          variant="warning"
        />
        <MetricCard
          title="Completed Orders"
          value={metrics.completedOrders}
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          title="Online Agents"
          value={metrics.onlineAgents}
          icon={Activity}
          variant="success"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {orderMetrics?.ordersOverTime && orderMetrics.ordersOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={orderMetrics.ordersOverTime}>
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
              <div className="h-64 flex items-center justify-center text-gray-400">
                No order data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {orderMetrics?.ordersByStatus && orderMetrics.ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orderMetrics.ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="status" 
                    tickFormatter={(value) => value.replace('_', ' ')}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No order data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {agentMetrics?.agentsByStatus && agentMetrics.agentsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={agentMetrics.agentsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {agentMetrics.agentsByStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#6b7280'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No agent data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents by Vehicle Type</CardTitle>
          </CardHeader>
          <CardContent>
            {agentMetrics?.agentsByVehicleType && agentMetrics.agentsByVehicleType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agentMetrics.agentsByVehicleType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vehicleType" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8b5cf6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No agent data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const timeAgo = getTimeAgo(new Date(activity.createdAt));
                const colorMap: Record<string, string> = {
                  green: 'bg-green-500',
                  blue: 'bg-blue-500',
                  purple: 'bg-purple-500',
                  yellow: 'bg-yellow-500',
                  orange: 'bg-orange-500',
                  red: 'bg-red-500',
                  gray: 'bg-gray-500',
                };
                const color = colorMap[activity.color] || 'bg-gray-500';

                return (
                  <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`h-2 w-2 ${color} rounded-full`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{timeAgo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}





