'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { agentApi } from '@/lib/api/agent';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, ScanLine } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess?: (order: any) => void;
  onScanError?: (error: string) => void;
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannedOrder, setScannedOrder] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCameraScan = async () => {
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported. Please use HTTPS or localhost.');
      }

      // Clean up any existing scanner
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      // Set state first so the div renders
      setCameraActive(true);
      setScanning(true);

      // Wait for the DOM to render the div
      await new Promise(resolve => setTimeout(resolve, 300));

      // Now check if element exists
      if (!scanAreaRef.current) {
        throw new Error('Scanner element not found. Please try again.');
      }

      // Ensure the element has an ID
      const elementId = scanAreaRef.current.id || 'qr-reader';
      if (!scanAreaRef.current.id) {
        scanAreaRef.current.id = elementId;
      }

      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          handleScannedCode(decodedText);
          stopCameraScan();
        },
        (errorMessage) => {
          // Error callback - ignore, keep scanning
          // Only log if it's not a "not found" error (which is normal during scanning)
          if (!errorMessage.includes('NotFoundException')) {
            console.debug('Scanning...', errorMessage);
          }
        }
      );
    } catch (error: any) {
      console.error('Failed to start camera:', error);
      setCameraActive(false);
      setScanning(false);
      
      let errorMessage = 'Failed to access camera. ';
      if (error.name === 'NotAllowedError' || error.message?.includes('permission')) {
        errorMessage += 'Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.message?.includes('camera')) {
        errorMessage += 'No camera found. Please connect a camera device.';
      } else if (error.message?.includes('HTTPS') || error.message?.includes('secure')) {
        errorMessage += 'Camera requires HTTPS. Please use a secure connection.';
      } else {
        errorMessage += error.message || 'Please check your browser settings.';
      }
      
      onScanError?.(errorMessage);
    }
  };

  const stopCameraScan = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setCameraActive(false);
    setScanning(false);
    scannerRef.current = null;
  };

  const handleScannedCode = async (code: string) => {
    setLoading(true);
    try {
      const result = await agentApi.scanQRCode(code.trim());
      setScannedOrder(result.order);
      onScanSuccess?.(result.order);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to scan QR code';
      onScanError?.(errorMessage);
      setScannedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!qrCode.trim()) {
      onScanError?.('Please enter a QR code');
      return;
    }
    await handleScannedCode(qrCode.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualScan();
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          {cameraActive && (
            <Button
              onClick={stopCameraScan}
              variant="outline"
              size="sm"
              className="text-red-600"
            >
              <X className="h-4 w-4 mr-2" />
              Stop Camera
            </Button>
          )}
        </div>

        {/* Camera Scanner */}
        <div className="space-y-2">
          {!cameraActive ? (
            <>
              <Button
                onClick={startCameraScan}
                className="w-full"
                disabled={loading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera Scanner
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Camera access required. Make sure you're on HTTPS or localhost.
              </p>
            </>
          ) : (
            <>
              <div
                id="qr-reader"
                ref={scanAreaRef}
                className="w-full rounded-lg overflow-hidden border-2 border-blue-500 bg-gray-100"
                style={{ minHeight: '300px', position: 'relative' }}
              />
              {scanning && (
                <p className="text-sm text-center text-gray-600">
                  <ScanLine className="h-4 w-4 inline mr-1 animate-pulse" />
                  Scanning... Point camera at QR code
                </p>
              )}
            </>
          )}
        </div>

        {/* Manual Input */}
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 mb-2">Or enter manually:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter QR code"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || cameraActive}
            />
            <Button
              onClick={handleManualScan}
              disabled={loading || !qrCode.trim() || cameraActive}
              className="px-6"
            >
              {loading ? 'Scanning...' : 'Scan'}
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {scannedOrder && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Order Found!</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Tracking:</strong> #{scannedOrder.trackingNumber}</p>
              <p><strong>Status:</strong> {scannedOrder.status}</p>
              <p><strong>Partner:</strong> {scannedOrder.partner?.companyName || scannedOrder.partner?.name}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
