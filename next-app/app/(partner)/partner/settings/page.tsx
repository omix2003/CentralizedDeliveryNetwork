'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { partnerApi } from '@/lib/api/partner';
import { Settings, Key, Webhook, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ProfilePictureUpload } from '@/components/user/ProfilePictureUpload';

export default function PartnerSettingsPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await partnerApi.getProfile();
      setProfile(data);
      setWebhookUrl(data.webhookUrl || '');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await partnerApi.updateWebhook(webhookUrl);
      setSuccess('Webhook URL updated successfully');
      await loadProfile();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update webhook URL');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile, API keys and webhook configuration</p>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Profile Picture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <ProfilePictureUpload
              currentImageUrl={session?.user?.image}
              onUploadComplete={(url) => {
                window.location.reload();
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={profile.apiKey}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(profile.apiKey)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>How to use:</strong> Include this API key in the <code className="bg-blue-100 px-1 rounded">X-API-Key</code> header
                when making requests to <code className="bg-blue-100 px-1 rounded">/api/partner-api</code> endpoints.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-domain.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send order status updates to this URL via POST requests
              </p>
            </div>
            <Button
              onClick={handleSaveWebhook}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Webhook URL'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Events Info */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">ORDER_CREATED</p>
                <p className="text-sm text-gray-600">Sent when an order is created</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">ORDER_ASSIGNED</p>
                <p className="text-sm text-gray-600">Sent when an agent accepts the order</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">ORDER_PICKED_UP</p>
                <p className="text-sm text-gray-600">Sent when agent picks up the order</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-purple-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">ORDER_DELIVERED</p>
                <p className="text-sm text-gray-600">Sent when order is delivered</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-red-500 mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">ORDER_CANCELLED</p>
                <p className="text-sm text-gray-600">Sent when order is cancelled</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}





