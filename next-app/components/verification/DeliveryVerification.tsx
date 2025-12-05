'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { agentApi } from '@/lib/api/agent';
import type { VerificationData } from '@/lib/api/agent';

interface DeliveryVerificationProps {
  orderId: string;
  onVerified?: () => void;
}

export function DeliveryVerification({ orderId, onVerified }: DeliveryVerificationProps) {
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [otp, setOtp] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadVerification();
  }, [orderId]);

  const loadVerification = async () => {
    try {
      const data = await agentApi.getVerification(orderId);
      setVerification(data.verification);
    } catch (error: any) {
      console.error('Failed to load verification:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await agentApi.generateVerification(orderId);
      setVerification({
        hasOtp: true,
        hasQrCode: true,
        expiresAt: result.expiresAt,
        isExpired: false,
      });
      setQrCode(result.qrCode);
      setSuccess('Verification codes generated successfully');
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to generate verification codes');
    } finally {
      setGenerating(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter OTP');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await agentApi.verifyWithOTP(orderId, otp.trim());
      setSuccess('Delivery verified successfully with OTP!');
      await loadVerification();
      onVerified?.();
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyQR = async () => {
    if (!qrCode.trim()) {
      setError('Please enter QR code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await agentApi.verifyWithQR(orderId, qrCode.trim());
      setSuccess('Delivery verified successfully with QR code!');
      await loadVerification();
      onVerified?.();
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to verify QR code');
    } finally {
      setLoading(false);
    }
  };

  if (!verification) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No verification codes generated yet</p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Verification Codes'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Delivery Verification</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}

      {verification.verifiedAt ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-semibold text-green-800">✓ Delivery Verified</p>
          <p className="text-sm text-green-600 mt-1">
            Verified at: {new Date(verification.verifiedAt).toLocaleString()}
          </p>
          <p className="text-sm text-green-600">
            Method: {verification.verificationMethod}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {!verification.hasOtp && !verification.hasQrCode && (
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? 'Generating...' : 'Generate Verification Codes'}
            </Button>
          )}

          {verification.hasOtp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verify with OTP
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || verification.isExpired}
                />
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || !otp.trim() || verification.isExpired}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              {verification.isExpired && (
                <p className="text-sm text-red-600 mt-1">OTP has expired. Please generate new codes.</p>
              )}
            </div>
          )}

          {verification.hasQrCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verify with QR Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Enter QR code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || verification.isExpired}
                />
                <Button
                  onClick={handleVerifyQR}
                  disabled={loading || !qrCode.trim() || verification.isExpired}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              {verification.isExpired && (
                <p className="text-sm text-red-600 mt-1">QR code has expired. Please generate new codes.</p>
              )}
            </div>
          )}

          {verification.expiresAt && !verification.isExpired && (
            <p className="text-sm text-gray-500">
              Expires at: {new Date(verification.expiresAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

