'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { partnerApi } from '@/lib/api/partner';
import { authApi, ChangePasswordData } from '@/lib/api/auth';
import { Settings, Key, Webhook, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProfilePictureUpload } from '@/components/user/ProfilePictureUpload';

export default function PartnerSettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

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

  const handleRegenerateApiKey = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? This will invalidate your current key and you will need to update all integrations using the old key.')) {
      return;
    }

    try {
      setRegenerating(true);
      setError(null);
      setSuccess(null);
      const result = await partnerApi.regenerateApiKey();
      setSuccess(result.message || 'API key regenerated successfully');
      await loadProfile();
      setShowApiKey(true); // Show the new key
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
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
              onUploadComplete={async (url) => {
                try {
                  // Force session update to get the new profile picture
                  await update();
                  // Small delay to ensure session is updated
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Refresh router to update any cached data
                  router.refresh();
                } catch (error) {
                  console.error('Error updating session:', error);
                  // Even if update fails, the image should still be visible from the upload
                }
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateApiKey}
                disabled={regenerating}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate API Key'}
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>How to use:</strong> Include this API key in the <code className="bg-blue-100 px-1 rounded">X-API-Key</code> header
                when making requests to <code className="bg-blue-100 px-1 rounded">/api/partner-api</code> endpoints.
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Warning:</strong> Regenerating your API key will invalidate the current key. Make sure to update all your integrations with the new key immediately.
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

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setPasswordError(null);
            setPasswordSuccess(null);

            if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
              setPasswordError('All fields are required');
              return;
            }

            if (passwordData.newPassword.length < 8) {
              setPasswordError('New password must be at least 8 characters long');
              return;
            }

            if (passwordData.newPassword !== passwordData.confirmPassword) {
              setPasswordError('New password and confirm password do not match');
              return;
            }

            if (passwordData.currentPassword === passwordData.newPassword) {
              setPasswordError('New password must be different from current password');
              return;
            }

            try {
              setChangingPassword(true);
              await authApi.changePassword(passwordData);
              setPasswordSuccess('Password changed successfully!');
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
            } catch (err: any) {
              setPasswordError(err.message || 'Failed to change password');
            } finally {
              setChangingPassword(false);
            }
          }} className="space-y-4">
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="Enter your new password (min. 8 characters)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={changingPassword} className="px-6">
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </form>
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





