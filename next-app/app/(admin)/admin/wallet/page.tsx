'use client';

import { useState } from 'react';
import { AdminWallet } from '@/components/wallet/AdminWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/lib/api/admin';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

export default function AdminWalletPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncStatus(null);
      const result = await adminApi.syncWalletAndRevenue();
      setSyncStatus(result.message);
      showToast('success', 'Synchronization started successfully. This may take a few minutes.', 5000);
    } catch (error: any) {
      console.error('Sync failed:', error);
      showToast('error', error.message || 'Failed to start synchronization');
      setSyncStatus('Failed to start synchronization');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Wallet</h1>
          <p className="text-gray-600 mt-2">Manage platform revenue and agent payouts</p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          className="flex items-center gap-2"
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Sync Wallet & Revenue
            </>
          )}
        </Button>
      </div>

      {syncStatus && (
        <Card className={syncStatus.includes('Failed') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 ${syncStatus.includes('Failed') ? 'text-red-800' : 'text-green-800'}`}>
              {syncStatus.includes('Failed') ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              <span>{syncStatus}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <AdminWallet />
    </div>
  );
}

