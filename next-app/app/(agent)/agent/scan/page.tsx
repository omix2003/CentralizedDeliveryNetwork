'use client';

import { useState } from 'react';
import { BarcodeScanner } from '@/components/scanning/BarcodeScanner';
import { QRScanner } from '@/components/scanning/QRScanner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScanLine, QrCode, Barcode } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'barcode' | 'qr'>('barcode');

  const handleScanSuccess = (order: any) => {
    // Navigate to order details page
    router.push(`/agent/orders/${order.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scan Order</h1>
        <p className="text-gray-600 mt-2">Scan barcode or QR code to find an order</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('barcode')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'barcode'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Barcode className="h-4 w-4" />
          Barcode Scanner
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'qr'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <QrCode className="h-4 w-4" />
          QR Scanner
        </button>
      </div>

      {/* Scanner Components */}
      {activeTab === 'barcode' ? (
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onScanError={(error) => {
            alert(error);
          }}
        />
      ) : (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onScanError={(error) => {
            alert(error);
          }}
        />
      )}

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Enter the barcode or QR code manually, or use a scanner device</li>
          <li>• Click "Scan" to search for the order</li>
          <li>• If found, you'll be redirected to the order details page</li>
          <li>• Make sure you have permission to access the order</li>
        </ul>
      </Card>
    </div>
  );
}

