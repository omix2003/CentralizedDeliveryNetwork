'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { agentApi } from '@/lib/api/agent';
import type { Payment, Payroll, PaymentSummary } from '@/lib/api/agent';
import { formatCurrency } from '@/lib/utils/currency';
import { Skeleton } from '@/components/ui/Skeleton';

export function PaymentDashboard() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'payments' | 'payrolls'>('summary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, paymentsData, payrollsData] = await Promise.all([
        agentApi.getPaymentSummary(),
        agentApi.getPayments({ page: 1, limit: 10 }),
        agentApi.getPayrolls({ page: 1, limit: 10 }),
      ]);
      setSummary(summaryData);
      setPayments(paymentsData.payments || []);
      setPayrolls(payrollsData.payrolls || []);
    } catch (error: any) {
      console.error('Failed to load payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'summary'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'payments'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab('payrolls')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'payrolls'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Payrolls
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Today</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.today?.amount || 0)}</p>
            <p className="text-sm text-gray-500 mt-1">{summary.today?.count || 0} payments</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">This Week</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.week?.amount || 0)}</p>
            <p className="text-sm text-gray-500 mt-1">{summary.week?.count || 0} payments</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">This Month</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.month?.amount || 0)}</p>
            <p className="text-sm text-gray-500 mt-1">{summary.month?.count || 0} payments</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pending?.amount || 0)}</p>
            <p className="text-sm text-gray-500 mt-1">{summary.pending?.count || 0} payments</p>
          </Card>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Recent Payments</h2>
          {payments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No payments yet</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {payment.paymentType} • {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      payment.status === 'PROCESSED'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Payrolls Tab */}
      {activeTab === 'payrolls' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Payroll History</h2>
          {payrolls.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No payroll records yet</p>
          ) : (
            <div className="space-y-4">
              {payrolls.map((payroll) => (
                <div
                  key={payroll.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-lg">{formatCurrency(payroll.netPay)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(payroll.periodStart).toLocaleDateString()} -{' '}
                        {new Date(payroll.periodEnd).toLocaleDateString()} ({payroll.periodType})
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        payroll.status === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : payroll.status === 'PROCESSED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {payroll.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500">Base Pay</p>
                      <p className="font-medium">{formatCurrency(payroll.basePay)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Bonuses</p>
                      <p className="font-medium text-green-600">+{formatCurrency(payroll.bonuses)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Deductions</p>
                      <p className="font-medium text-red-600">-{formatCurrency(payroll.deductions)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

