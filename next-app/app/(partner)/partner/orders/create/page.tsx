'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { partnerApi } from '@/lib/api/partner';
import { MapPin, DollarSign, Clock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Lazy load Google Places Autocomplete
const GooglePlacesAutocomplete = dynamic(
  () => import('@/components/maps/GooglePlacesAutocomplete').then(mod => ({ default: mod.GooglePlacesAutocomplete })),
  { ssr: false }
);

export default function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLat: '',
    pickupLng: '',
    dropAddress: '',
    dropLat: '',
    dropLng: '',
    payoutAmount: '',
    priority: 'NORMAL' as 'HIGH' | 'NORMAL' | 'LOW',
    estimatedDuration: '',
  });

  const handlePickupSelect = (place: { address: string; latitude: number; longitude: number }) => {
    setFormData((prev) => ({
      ...prev,
      pickupAddress: place.address,
      pickupLat: isNaN(place.latitude) ? '' : place.latitude.toString(),
      pickupLng: isNaN(place.longitude) ? '' : place.longitude.toString(),
    }));
  };

  const handleDropoffSelect = (place: { address: string; latitude: number; longitude: number }) => {
    setFormData((prev) => ({
      ...prev,
      dropAddress: place.address,
      dropLat: isNaN(place.latitude) ? '' : place.latitude.toString(),
      dropLng: isNaN(place.longitude) ? '' : place.longitude.toString(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse coordinates
      const pickupLat = parseFloat(formData.pickupLat);
      const pickupLng = parseFloat(formData.pickupLng);
      const dropLat = parseFloat(formData.dropLat);
      const dropLng = parseFloat(formData.dropLng);

      // Validate coordinates
      if (!isFinite(pickupLat) || !isFinite(pickupLng) || !isFinite(dropLat) || !isFinite(dropLng)) {
        throw new Error('Please select valid pickup and dropoff locations');
      }

      if (pickupLat < -90 || pickupLat > 90 || dropLat < -90 || dropLat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (pickupLng < -180 || pickupLng > 180 || dropLng < -180 || dropLng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }

      // Validate payout amount
      const payoutAmount = parseFloat(formData.payoutAmount);
      if (isNaN(payoutAmount) || payoutAmount <= 0) {
        throw new Error('Payout amount must be a positive number');
      }

      // Prepare order data
      const orderData: any = {
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        payoutAmount,
        priority: formData.priority,
      };

      // Only include estimatedDuration if it's a valid number
      if (formData.estimatedDuration && formData.estimatedDuration.trim() !== '') {
        const duration = parseInt(formData.estimatedDuration);
        if (!isNaN(duration) && duration > 0) {
          orderData.estimatedDuration = duration;
        }
      }

      const order = await partnerApi.createOrder(orderData);

      setSuccess(`Order created successfully! Tracking: ${order.trackingNumber}`);
      
      // Redirect to orders list after 2 seconds
      setTimeout(() => {
        router.push('/partner/orders');
      }, 2000);
    } catch (err: any) {
      // Handle validation errors from backend
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map((e: any) => 
          `${e.field}: ${e.message}`
        ).join(', ');
        setError(`Validation failed: ${errorMessages}`);
      } else {
        setError(err.message || err.response?.data?.error || 'Failed to create order');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
          <p className="text-gray-600 mt-1">Enter pickup and delivery locations using Google Maps</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pickup Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                Pickup Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GooglePlacesAutocomplete
                value={formData.pickupAddress}
                onPlaceSelect={handlePickupSelect}
                placeholder="Search for pickup location..."
                label="Address"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.pickupLat}
                    readOnly
                    placeholder="Select a location"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formData.pickupLat 
                        ? 'border-gray-300 bg-gray-50 text-gray-600' 
                        : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                    }`}
                  />
                  {!formData.pickupLat && (
                    <p className="text-xs text-yellow-600 mt-1">Select a location from suggestions</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.pickupLng}
                    readOnly
                    placeholder="Select a location"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formData.pickupLng 
                        ? 'border-gray-300 bg-gray-50 text-gray-600' 
                        : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                    }`}
                  />
                  {!formData.pickupLng && (
                    <p className="text-xs text-yellow-600 mt-1">Select a location from suggestions</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dropoff Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Delivery Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GooglePlacesAutocomplete
                value={formData.dropAddress}
                onPlaceSelect={handleDropoffSelect}
                placeholder="Search for delivery location..."
                label="Address"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.dropLat}
                    readOnly
                    placeholder="Select a location"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formData.dropLat 
                        ? 'border-gray-300 bg-gray-50 text-gray-600' 
                        : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                    }`}
                  />
                  {!formData.dropLat && (
                    <p className="text-xs text-yellow-600 mt-1">Select a location from suggestions</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.dropLng}
                    readOnly
                    placeholder="Select a location"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      formData.dropLng 
                        ? 'border-gray-300 bg-gray-50 text-gray-600' 
                        : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                    }`}
                  />
                  {!formData.dropLng && (
                    <p className="text-xs text-yellow-600 mt-1">Select a location from suggestions</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Payout Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.payoutAmount}
                  onChange={(e) => setFormData({ ...formData, payoutAmount: e.target.value })}
                  placeholder="15.00"
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Est. Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                  placeholder="30"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </form>

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
