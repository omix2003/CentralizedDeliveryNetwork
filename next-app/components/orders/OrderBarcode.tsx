'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Card } from '@/components/ui/Card';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface OrderBarcodeProps {
  barcode: string;
  orderId: string;
  trackingNumber: string;
}

export function OrderBarcode({ barcode, orderId, trackingNumber }: OrderBarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && barcode) {
      try {
        JsBarcode(barcodeRef.current, barcode, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 16,
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [barcode]);

  const handleDownload = () => {
    if (barcodeRef.current) {
      const svg = barcodeRef.current.outerHTML;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcode-${trackingNumber}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && barcodeRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Barcode - ${trackingNumber}</title>
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
            </style>
          </head>
          <body>
            <h2>Order #${trackingNumber}</h2>
            ${barcodeRef.current.outerHTML}
            <p style="margin-top: 20px;">Barcode: ${barcode}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!barcode) return null;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Barcode</h3>
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
        <div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-lg">
          <svg ref={barcodeRef} className="w-full" />
          <p className="text-sm text-gray-600 mt-2">{barcode}</p>
        </div>
      </div>
    </Card>
  );
}



