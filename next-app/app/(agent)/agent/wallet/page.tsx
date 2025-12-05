import { AgentWallet } from '@/components/wallet/AgentWallet';

export default function AgentWalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
        <p className="text-gray-600 mt-2">View your earnings and payout history</p>
      </div>
      <AgentWallet />
    </div>
  );
}

