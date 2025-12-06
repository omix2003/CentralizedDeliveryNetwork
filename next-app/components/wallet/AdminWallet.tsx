'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  Users,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi, WalletPayout } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/lib/hooks/useToast';

export function AdminWallet() {
  const [wallet, setWallet] = useState<{
    balance: number;
    totalEarned: number;
    totalPaidOut: number;
    totalDeposited: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<WalletPayout[]>([]);
  const [readyAgents, setReadyAgents] = useState<{
    weekly: Array<{ agentId: string; balance: number; nextPayoutDate: string | null; agentName: string }>;
    monthly: Array<{ agentId: string; balance: number; nextPayoutDate: string | null; agentName: string }>;
  }>({ weekly: [], monthly: [] });
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [loadingReady, setLoadingReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('');
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [payoutsTotal, setPayoutsTotal] = useState(0);
  const limit = 10;
  const { showToast } = useToast();

  useEffect(() => {
    loadWallet();
    loadTransactions(1);
    loadPayouts();
    loadReadyAgents();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAdminWallet();
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
      const data = await adminApi.getAdminWalletTransactions(page, limit);
      setTransactions(data.transactions);
      setTransactionsTotal(data.total);
      setTransactionsPage(page);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadPayouts = async (status?: string) => {
    try {
      setLoadingPayouts(true);
      setError(null);
      const data = await adminApi.getAllPayouts(status, payoutsPage, limit);
      setPayouts(data.payouts);
      setPayoutsTotal(data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load payouts');
    } finally {
      setLoadingPayouts(false);
    }
  };

  const loadReadyAgents = async () => {
    try {
      setLoadingReady(true);
      setError(null);
      const data = await adminApi.getAgentsReadyForPayout();
      setReadyAgents({ weekly: data.weekly || [], monthly: data.monthly || [] });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load ready agents');
    } finally {
      setLoadingReady(false);
    }
  };

  const handleProcessAllWeeklyPayouts = async () => {
    if (!confirm('Process weekly payouts for all eligible agents? This will transfer funds from admin wallet to agent wallets.')) {
      return;
    }

    try {
      setProcessing(true);
      const result = await adminApi.processAllWeeklyPayouts('BANK_TRANSFER');
      showToast(
        result.totalFailed > 0 ? 'warning' : 'success',
        `Successfully processed ${result.totalProcessed} weekly payouts. ${result.totalFailed > 0 ? `${result.totalFailed} failed.` : ''}`
      );
      loadWallet();
      loadPayouts();
      loadReadyAgents();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to process weekly payouts');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessAllMonthlyPayouts = async () => {
    if (!confirm('Process monthly payouts for all eligible agents? This will transfer funds from admin wallet to agent wallets.')) {
      return;
    }

    try {
      setProcessing(true);
      const result = await adminApi.processAllMonthlyPayouts('BANK_TRANSFER');
      showToast(
        result.totalFailed > 0 ? 'warning' : 'success',
        `Successfully processed ${result.totalProcessed} monthly payouts. ${result.totalFailed > 0 ? `${result.totalFailed} failed.` : ''}`
      );
      loadWallet();
      loadPayouts();
      loadReadyAgents();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to process monthly payouts');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessPayout = async (agentId: string) => {
    if (!confirm('Process weekly payout for this agent?')) {
      return;
    }

    try {
      setProcessing(true);
      await adminApi.processPayout({
        agentId,
        paymentMethod: 'BANK_TRANSFER',
      });
      showToast('success', 'Payout processed successfully');
      loadWallet();
      loadPayouts();
      loadReadyAgents();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to process payout');
    } finally {
      setProcessing(false);
    }
  };

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

  const transactionsTotalPages = Math.ceil(transactionsTotal / limit);
  const payoutsTotalPages = Math.ceil(payoutsTotal / limit);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Platform Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(wallet?.balance || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Available funds</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Deposited
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(wallet?.totalDeposited || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Platform commissions (30% per order)</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(wallet?.totalPaidOut || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">To agents</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Net Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency((wallet?.totalDeposited || 0) - (wallet?.totalPaidOut || 0))}
                </p>
                <p className="text-xs text-gray-500 mt-2">Commissions - Agent Payouts</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ready for Weekly Payout */}
      {readyAgents.weekly.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Users className="h-5 w-5" />
                Agents Ready for Weekly Payout ({readyAgents.weekly.length})
              </CardTitle>
              <Button
                onClick={handleProcessAllWeeklyPayouts}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Process All Weekly
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readyAgents.weekly.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {agent.agentName || `Agent #${agent.agentId.substring(0, 8).toUpperCase()}`}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Balance: <span className="font-medium">{formatCurrency(agent.balance)}</span>
                    </p>
                    {agent.nextPayoutDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Next payout: {formatDate(agent.nextPayoutDate)}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleProcessPayout(agent.agentId)}
                    disabled={processing}
                    size="sm"
                    variant="outline"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Process'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready for Monthly Payout */}
      {readyAgents.monthly.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Users className="h-5 w-5" />
                Agents Ready for Monthly Payout ({readyAgents.monthly.length})
              </CardTitle>
              <Button
                onClick={handleProcessAllMonthlyPayouts}
                disabled={processing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Process All Monthly
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readyAgents.monthly.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {agent.agentName || `Agent #${agent.agentId.substring(0, 8).toUpperCase()}`}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Balance: <span className="font-medium">{formatCurrency(agent.balance)}</span>
                    </p>
                    {agent.nextPayoutDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Next payout: {formatDate(agent.nextPayoutDate)}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleProcessPayout(agent.agentId)}
                    disabled={processing}
                    size="sm"
                    variant="outline"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Process'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions & Payouts Tabs */}
      <Tabs defaultValue="payouts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4" />
            Payouts ({payoutsTotal})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transactions ({transactionsTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payout History</CardTitle>
                <Select
                  value={payoutStatusFilter}
                  onValueChange={(value) => {
                    setPayoutStatusFilter(value);
                    loadPayouts(value || undefined);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSED">Processed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <p className="text-sm text-gray-400 mt-1">Payout history will appear here</p>
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
                              {payout.agent?.user.name || `Agent #${payout.agentId.substring(0, 8).toUpperCase()}`}
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
                          onClick={() => {
                            setPayoutsPage(payoutsPage - 1);
                            loadPayouts(payoutStatusFilter || undefined);
                          }}
                          disabled={payoutsPage === 1 || loadingPayouts}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPayoutsPage(payoutsPage + 1);
                            loadPayouts(payoutStatusFilter || undefined);
                          }}
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
                  <p className="text-sm text-gray-400 mt-1">Transaction history will appear here</p>
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
                                  {transaction.type === 'COMMISSION' && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <p className="text-xs text-green-600 font-medium">
                                        30% commission
                                      </p>
                                    </>
                                  )}
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
      </Tabs>
    </div>
  );
}
