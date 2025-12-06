import { AdminWallet } from '@/components/wallet/AdminWallet';

export default function AdminWalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Wallet</h1>
        <p className="text-gray-600 mt-2">Manage platform revenue and agent payouts</p>
      </div>
      <AdminWallet />
    </div>
  );
}

