'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Wallet, TrendingUp, History, Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { agentApi } from '@/lib/api/agent';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/Badge';

export function AgentWallet() {
  const [wallet, setWallet] = useState<{
    balance: number;
    totalEarned: number;
    totalPaidOut: number;
    lastPayoutDate: string | null;
    nextPayoutDate: string | null;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [payoutsTotal, setPayoutsTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    loadWallet();
    loadTransactions(1);
    loadPayouts(1);
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentApi.getWallet();
      setWallet(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (page: number = 1) => {
    try {
      setLoadingTransactions(true);
      setError(null);
      const data = await agentApi.getWalletTransactions(page, limit);
      setTransactions(data.transactions);
      setTransactionsTotal(data.total);
      setTransactionsPage(page);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadPayouts = async (page: number = 1) => {
    try {
      setLoadingPayouts(true);
      setError(null);
      const data = await agentApi.getPayouts(page, limit);
      setPayouts(data.payouts);
      setPayoutsTotal(data.total);
      setPayoutsPage(page);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load payouts');
    } finally {
      setLoadingPayouts(false);
    }
  };

  const getDaysUntilPayout = () => {
    if (!wallet?.nextPayoutDate) return null;
    const nextDate = new Date(wallet.nextPayoutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilPayout = getDaysUntilPayout();
  const transactionsTotalPages = Math.ceil(transactionsTotal / limit);
  const payoutsTotalPages = Math.ceil(payoutsTotal / limit);

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PROCESSED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(wallet?.balance || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Pending payout</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(wallet?.totalEarned || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">All time earnings</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-purple-600" />
              Total Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(wallet?.totalPaidOut || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Received in account</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next Payout Info */}
      {wallet?.nextPayoutDate && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider mb-3">Next Weekly Payout</p>
                <p className="text-3xl font-bold text-blue-900 mb-2">
                  {new Date(wallet.nextPayoutDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {daysUntilPayout !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-600 font-medium">
                      {daysUntilPayout === 0
                        ? 'Payout is today!'
                        : daysUntilPayout === 1
                        ? '1 day remaining'
                        : `${daysUntilPayout} days remaining`}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-blue-100 rounded-full ml-4">
                <Calendar className="h-12 w-12 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions & Payouts Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transactions ({transactionsTotal})
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4" />
            Payouts ({payoutsTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No transactions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Your transaction history will appear here</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-3 rounded-full ${transaction.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            {transaction.amount > 0 ? (
                              <ArrowUpRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {transaction.description || transaction.type}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-gray-500">
                                {formatDate(transaction.createdAt)}
                              </p>
                              {transaction.order && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <p className="text-sm text-gray-500">
                                    Order #{transaction.order.id.substring(0, 8).toUpperCase()}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.amount > 0 ? '+' : ''}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Balance: {formatCurrency(transaction.balanceAfter)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {transactionsTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Page {transactionsPage} of {transactionsTotalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadTransactions(transactionsPage - 1)}
                          disabled={transactionsPage === 1 || loadingTransactions}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadTransactions(transactionsPage + 1)}
                          disabled={transactionsPage === transactionsTotalPages || loadingTransactions}
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
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayouts ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowDownRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No payouts yet</p>
                  <p className="text-sm text-gray-400 mt-1">Your payout history will appear here</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-gray-900">
                              Weekly Payout
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                              {payout.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {payout.processedAt ? (
                              <span>Processed: {formatDate(payout.processedAt)}</span>
                            ) : (
                              <span>Created: {formatDate(payout.createdAt)}</span>
                            )}
                            {payout.paymentMethod && (
                              <>
                                <span>•</span>
                                <span>{payout.paymentMethod.replace('_', ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(payout.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {payoutsTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Page {payoutsPage} of {payoutsTotalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadPayouts(payoutsPage - 1)}
                          disabled={payoutsPage === 1 || loadingPayouts}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadPayouts(payoutsPage + 1)}
                          disabled={payoutsPage === payoutsTotalPages || loadingPayouts}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
