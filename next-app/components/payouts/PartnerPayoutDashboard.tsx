'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DollarSign, TrendingUp, Package, Percent, Loader2, Calendar, Download, ArrowDownRight } from 'lucide-react';
import { partnerApi } from '@/lib/api/partner';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PayoutSummary {
  totalPayouts: number;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
}

interface Payout {
  id: string;
  orderId: string;
  amount: number;
  agentPayout: number;
  platformFee: number;
  deliveredAt: string | null;
  createdAt: string;
  agent: { id: string; user: { name: string } } | null;
}

export function PartnerPayoutDashboard() {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPayoutData();
  }, [startDate, endDate, page]);

  const loadPayoutData = async () => {
    setError(null);
    
    try {
      setLoadingSummary(true);
      const summaryData = await partnerApi.getPayoutSummary(
        startDate || undefined,
        endDate || undefined
      );
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to load payout summary');
    } finally {
      setLoadingSummary(false);
    }

    try {
      setLoadingPayouts(true);
      const payoutData = await partnerApi.getPayouts({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 20,
      });
      setPayouts(payoutData.payouts);
      setTotalPages(payoutData.totalPages);
      setTotal(payoutData.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load payout records');
    } finally {
      setLoadingPayouts(false);
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Order ID', 'Payout Amount', 'Agent Payout (70%)', 'Platform Fee (30%)', 'Delivered At', 'Agent'];
    const rows = payouts.map(p => [
      p.orderId.substring(0, 8).toUpperCase(),
      p.amount.toString(),
      p.agentPayout.toString(),
      p.platformFee.toString(),
      p.deliveredAt ? formatDate(p.deliveredAt) : 'N/A',
      p.agent?.user.name || 'N/A',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `partner-payouts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-700">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              Total Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(summary?.totalPayouts || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Total amount paid</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {summary?.totalOrders || 0}
                </p>
                <p className="text-xs text-gray-500 mt-2">Delivered orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completed Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {summary?.completedOrders || 0}
                </p>
                <p className="text-xs text-gray-500 mt-2">Successfully delivered</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Average Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(summary?.averageOrderValue || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Per order</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payout History</CardTitle>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPayouts ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12">
              <ArrowDownRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No payouts yet</p>
              <p className="text-sm text-gray-400 mt-1">Payout history will appear here after orders are delivered</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Payout Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent (70%)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Platform (30%)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Delivered At</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">
                            {payout.orderId.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-red-600">
                            {formatCurrency(payout.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-700">
                            {formatCurrency(payout.agentPayout)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-700">
                            {formatCurrency(payout.platformFee)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payout.deliveredAt ? formatDate(payout.deliveredAt) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payout.agent?.user.name || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {page} of {totalPages} ({total} total payouts)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || loadingPayouts}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages || loadingPayouts}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

