'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { DollarSign, TrendingUp, Package, Percent, Loader2, Calendar, Download } from 'lucide-react';
import { partnerApi, RevenueSummary, PartnerRevenue } from '@/lib/api/partner';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export function PartnerRevenueDashboard() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [revenues, setRevenues] = useState<PartnerRevenue[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingRevenues, setLoadingRevenues] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadRevenueData();
  }, [periodType, startDate, endDate, page]);

  const loadRevenueData = async () => {
    setError(null);
    
    try {
      setLoadingSummary(true);
      const summaryData = await partnerApi.getRevenueSummary(
        startDate || undefined,
        endDate || undefined
      );
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue summary');
    } finally {
      setLoadingSummary(false);
    }

    try {
      setLoadingRevenues(true);
      const { revenues: revenuesData, totalPages: pages } = await partnerApi.getRevenue({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        periodType,
        page,
        limit: 20,
      });
      setRevenues(revenuesData);
      setTotalPages(pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue records');
    } finally {
      setLoadingRevenues(false);
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Order ID', 'Order Amount', 'Delivery Fee', 'Platform Fee', 'Net Revenue', 'Status', 'Date'];
    const rows = revenues.map(r => [
      r.orderId.substring(0, 8).toUpperCase(),
      r.orderAmount.toString(),
      r.deliveryFee.toString(),
      r.platformFee.toString(),
      r.netRevenue.toString(),
      r.status,
      formatDate(r.createdAt),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `partner-revenue-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDateRange = () => {
    const now = new Date();
    if (periodType === 'MONTHLY') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    } else if (periodType === 'WEEKLY') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    } else {
      return {
        start: now.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    }
  };

  const applyDateRange = () => {
    const range = getDateRange();
    setStartDate(range.start);
    setEndDate(range.end);
  };

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
        <Button onClick={loadRevenueData} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="periodType">Period Type</Label>
              <Select value={periodType} onValueChange={(value: string) => {
                const typedValue = value as 'DAILY' | 'WEEKLY' | 'MONTHLY';
                setPeriodType(typedValue);
                applyDateRange();
              }}>
                <SelectTrigger id="periodType">
                  <SelectValue placeholder="Select period">
                    {periodType === 'DAILY' ? 'Daily' : periodType === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={applyDateRange} variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Apply Range
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(summary?.totalRevenue || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {summary?.totalOrders || 0}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Platform Fees</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(summary?.platformFees || 0)}
                    </p>
                  </div>
                  <Percent className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(summary?.averageOrderValue || 0)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Breakdown</CardTitle>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRevenues ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : revenues.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No revenue records found.</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">Order ID</th>
                      <th className="text-right p-3 text-sm font-semibold">Order Amount</th>
                      <th className="text-right p-3 text-sm font-semibold">Delivery Fee</th>
                      <th className="text-right p-3 text-sm font-semibold">Platform Fee</th>
                      <th className="text-right p-3 text-sm font-semibold">Net Revenue</th>
                      <th className="text-center p-3 text-sm font-semibold">Status</th>
                      <th className="text-right p-3 text-sm font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenues.map((revenue) => (
                      <tr key={revenue.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm font-medium">
                          #{revenue.orderId.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="p-3 text-sm text-right">
                          {formatCurrency(revenue.orderAmount)}
                        </td>
                        <td className="p-3 text-sm text-right text-gray-600">
                          {formatCurrency(revenue.deliveryFee)}
                        </td>
                        <td className="p-3 text-sm text-right text-orange-600">
                          {formatCurrency(revenue.platformFee)}
                        </td>
                        <td className="p-3 text-sm text-right font-semibold text-green-600">
                          {formatCurrency(revenue.netRevenue)}
                        </td>
                        <td className="p-3 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            revenue.status === 'PROCESSED' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {revenue.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-right text-gray-500">
                          {formatDate(revenue.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Completed Orders</p>
              <p className="text-xl font-semibold text-green-600">
                {summary.completedOrders}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Cancelled Orders</p>
              <p className="text-xl font-semibold text-red-600">
                {summary.cancelledOrders}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Agent Payouts</p>
              <p className="text-xl font-semibold text-blue-600">
                {formatCurrency(summary.agentPayouts)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

