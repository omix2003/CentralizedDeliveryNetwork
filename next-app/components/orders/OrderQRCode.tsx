'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/Card';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRef } from 'react';

interface OrderQRCodeProps {
  qrCode: string;
  orderId: string;
  trackingNumber: string;
}

export function OrderQRCode({ qrCode, orderId, trackingNumber }: OrderQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (qrRef.current) {
      const svg = qrRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qrcode-${trackingNumber}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrRef.current) {
      const svg = qrRef.current.querySelector('svg');
      if (svg) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${trackingNumber}</title>
              <style>
                body { 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center; 
                  padding: 20px;
                  font-family: Arial, sans-serif;
                }
                h2 { margin-bottom: 20px; }
                svg { max-width: 300px; }
              </style>
            </head>
            <body>
              <h2>Order #${trackingNumber}</h2>
              ${svg.outerHTML}
              <p style="margin-top: 20px;">Scan QR code to track order</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (!qrCode) return null;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">QR Code</h3>
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        <div ref={qrRef} className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-lg">
          <QRCodeSVG
            value={qrCode}
            size={200}
            level="H"
            includeMargin={true}
          />
          <p className="text-sm text-gray-600 mt-4 text-center max-w-xs break-all">
            {qrCode}
          </p>
        </div>
      </div>
    </Card>
  );
}



