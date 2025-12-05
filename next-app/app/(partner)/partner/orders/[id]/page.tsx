'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { partnerApi, Order } from '@/lib/api/partner';
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Clock, 
  User, 
  Phone, 
  Calendar,
  Package,
  AlertCircle,
  RefreshCw,
  Edit,
  Save,
  X,
  CheckCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { reverseGeocode } from '@/lib/utils/geocoding';
import { SupportTicketForm } from '@/components/support/SupportTicketForm';
import { RatingModal } from '@/components/rating/RatingModal';
import { ratingApi } from '@/lib/api/rating';
import { Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { OrderTimer } from '@/components/orders/OrderTimer';
import { DelayedBadge } from '@/components/orders/DelayedBadge';

// Lazy load Google Places Autocomplete
const GooglePlacesAutocomplete = dynamic(
  () => import('@/components/maps/GooglePlacesAutocomplete').then(mod => ({ default: mod.GooglePlacesAutocomplete })),
  { ssr: false }
);

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [editData, setEditData] = useState({
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

  useEffect(() => {
    loadOrder();
    // Refresh every 10 seconds for active orders
    const interval = setInterval(() => {
      if (order && ['SEARCHING_AGENT', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status)) {
        loadOrder();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    // Check if rating exists for this order
    if (order?.status === 'DELIVERED' && order?.id) {
      ratingApi.getOrderRating(order.id)
        .then(({ rating }) => {
          setExistingRating(rating.rating);
        })
        .catch(() => {
          // Rating doesn't exist yet, that's fine
          setExistingRating(null);
        });
    }
  }, [order?.id, order?.status]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await partnerApi.getOrderDetails(orderId);
      setOrder(data);
      
      // Fetch addresses for display
      setAddressesLoading(true);
      const [pickupAddr, dropoffAddr] = await Promise.all([
        reverseGeocode(data.pickup.latitude, data.pickup.longitude),
        reverseGeocode(data.dropoff.latitude, data.dropoff.longitude),
      ]);
      setPickupAddress(pickupAddr);
      setDropoffAddress(dropoffAddr);
      setAddressesLoading(false);
      
      // Initialize edit data
      setEditData({
        pickupAddress: pickupAddr || formatCoordinates(data.pickup.latitude, data.pickup.longitude),
        pickupLat: data.pickup.latitude.toString(),
        pickupLng: data.pickup.longitude.toString(),
        dropAddress: dropoffAddr || formatCoordinates(data.dropoff.latitude, data.dropoff.longitude),
        dropLat: data.dropoff.latitude.toString(),
        dropLng: data.dropoff.longitude.toString(),
        payoutAmount: data.payout.toString(),
        priority: (data.priority || 'NORMAL') as 'HIGH' | 'NORMAL' | 'LOW',
        estimatedDuration: data.estimatedDuration?.toString() || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load order details');
      setAddressesLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (order) {
      setEditData({
        pickupAddress: formatCoordinates(order.pickup.latitude, order.pickup.longitude),
        pickupLat: order.pickup.latitude.toString(),
        pickupLng: order.pickup.longitude.toString(),
        dropAddress: formatCoordinates(order.dropoff.latitude, order.dropoff.longitude),
        dropLat: order.dropoff.latitude.toString(),
        dropLng: order.dropoff.longitude.toString(),
        payoutAmount: order.payout.toString(),
        priority: (order.priority || 'NORMAL') as 'HIGH' | 'NORMAL' | 'LOW',
        estimatedDuration: order.estimatedDuration?.toString() || '',
      });
    }
  };

  const handlePickupSelect = (place: { address: string; latitude: number; longitude: number }) => {
    setEditData((prev) => ({
      ...prev,
      pickupAddress: place.address,
      pickupLat: isNaN(place.latitude) ? prev.pickupLat : place.latitude.toString(),
      pickupLng: isNaN(place.longitude) ? prev.pickupLng : place.longitude.toString(),
    }));
  };

  const handleDropoffSelect = (place: { address: string; latitude: number; longitude: number }) => {
    setEditData((prev) => ({
      ...prev,
      dropAddress: place.address,
      dropLat: isNaN(place.latitude) ? prev.dropLat : place.latitude.toString(),
      dropLng: isNaN(place.longitude) ? prev.dropLng : place.longitude.toString(),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updatePayload: any = {};
      if (parseFloat(editData.pickupLat) !== order!.pickup.latitude) {
        updatePayload.pickupLat = parseFloat(editData.pickupLat);
      }
      if (parseFloat(editData.pickupLng) !== order!.pickup.longitude) {
        updatePayload.pickupLng = parseFloat(editData.pickupLng);
      }
      if (parseFloat(editData.dropLat) !== order!.dropoff.latitude) {
        updatePayload.dropLat = parseFloat(editData.dropLat);
      }
      if (parseFloat(editData.dropLng) !== order!.dropoff.longitude) {
        updatePayload.dropLng = parseFloat(editData.dropLng);
      }
      if (parseFloat(editData.payoutAmount) !== order!.payout) {
        updatePayload.payoutAmount = parseFloat(editData.payoutAmount);
      }
      if (editData.priority !== (order!.priority || 'NORMAL')) {
        updatePayload.priority = editData.priority;
      }
      if (editData.estimatedDuration) {
        const estDuration = parseInt(editData.estimatedDuration);
        if (estDuration !== order!.estimatedDuration) {
          updatePayload.estimatedDuration = estDuration;
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        setIsEditing(false);
        return;
      }

      const updatedOrder = await partnerApi.updateOrder(orderId, updatePayload);
      setOrder(updatedOrder);
      setIsEditing(false);
      setSuccess('Order updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  if (loading && !order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order not found</h3>
            <p className="text-gray-600 mb-6">{error || 'The order you are looking for does not exist'}</p>
            <Button onClick={() => router.push('/partner/orders')}>
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if delivered order was delayed (exceeded estimated duration)
  const isDeliveredAndDelayed = order.status === 'DELIVERED' && 
    order.pickedUpAt && 
    order.deliveredAt && 
    order.estimatedDuration && (() => {
      const pickedUpTime = new Date(order.pickedUpAt).getTime();
      const deliveredTime = new Date(order.deliveredAt).getTime();
      const actualDurationMinutes = Math.floor((deliveredTime - pickedUpTime) / 60000);
      return actualDurationMinutes > order.estimatedDuration;
    })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.trackingNumber}
              </h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                {(order.status === 'DELAYED' || order.status?.toUpperCase() === 'DELAYED') && <DelayedBadge />}
                {order.timing?.isDelayed && order.status !== 'DELAYED' && order.status !== 'DELIVERED' && (
                  <DelayedBadge />
                )}
                {isDeliveredAndDelayed && <DelayedBadge />}
              </div>
            </div>
            <p className="text-gray-600">Tracking number: {order.trackingNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'SEARCHING_AGENT' && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Order
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={loadOrder}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timer */}
          {order.pickedUpAt && order.estimatedDuration && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Delivery Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimer
                  pickedUpAt={order.pickedUpAt}
                  estimatedDuration={order.estimatedDuration}
                  status={order.status}
                  deliveredAt={order.deliveredAt}
                  timing={order.timing}
                />
              </CardContent>
            </Card>
          )}

          {/* Locations */}
          <Card>
            <CardHeader>
              <CardTitle>Locations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  {/* Pickup Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Location
                    </label>
                    <GooglePlacesAutocomplete
                      value={editData.pickupAddress}
                      onPlaceSelect={handlePickupSelect}
                      placeholder="Search for pickup location..."
                      label="Address"
                      required
                    />
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editData.pickupLat}
                          onChange={(e) => setEditData({ ...editData, pickupLat: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="-90"
                          max="90"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editData.pickupLng}
                          onChange={(e) => setEditData({ ...editData, pickupLng: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="-180"
                          max="180"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Dropoff Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Location
                    </label>
                    <GooglePlacesAutocomplete
                      value={editData.dropAddress}
                      onPlaceSelect={handleDropoffSelect}
                      placeholder="Search for delivery location..."
                      label="Address"
                      required
                    />
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editData.dropLat}
                          onChange={(e) => setEditData({ ...editData, dropLat: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="-90"
                          max="90"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editData.dropLng}
                          onChange={(e) => setEditData({ ...editData, dropLng: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="-180"
                          max="180"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-orange-500 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 uppercase mb-1">Pickup Location</p>
                      {addressesLoading ? (
                        <p className="text-base text-gray-500">Loading address...</p>
                      ) : (
                        <p className="text-base text-gray-900">
                          {pickupAddress || formatCoordinates(order.pickup.latitude, order.pickup.longitude)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-green-500 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 uppercase mb-1">Delivery Location</p>
                      {addressesLoading ? (
                        <p className="text-base text-gray-500">Loading address...</p>
                      ) : (
                        <p className="text-base text-gray-900">
                          {dropoffAddress || formatCoordinates(order.dropoff.latitude, order.dropoff.longitude)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Information */}
                  <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payout Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.payoutAmount}
                      onChange={(e) => setEditData({ ...editData, payoutAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (minutes)</label>
                    <input
                      type="number"
                      value={editData.estimatedDuration}
                      onChange={(e) => setEditData({ ...editData, estimatedDuration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Payout Amount</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(order.payout)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Priority</p>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      order.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      order.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.priority}
                    </span>
                  </div>
                  {order.estimatedDuration && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Estimated Duration</p>
                      <p className="text-base text-gray-900">{order.estimatedDuration} minutes</p>
                    </div>
                  )}
                  {order.actualDuration && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Actual Duration</p>
                      <p className="text-base text-gray-900">{order.actualDuration} minutes</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Information */}
          {order.agent && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="text-base text-gray-900">{order.agent.name}</p>
                    </div>
                  </div>
                  {order.agent.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-base text-gray-900">{order.agent.phone}</p>
                      </div>
                    </div>
                  )}
                  {order.agent.vehicleType && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Vehicle Type</p>
                      <p className="text-base text-gray-900 capitalize">{order.agent.vehicleType.toLowerCase()}</p>
                    </div>
                  )}
                  {order.agent.rating && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Rating</p>
                      <p className="text-base text-gray-900">{order.agent.rating.toFixed(1)} ⭐</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order Created</p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                {order.assignedAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Assigned to Agent</p>
                      <p className="text-xs text-gray-500">{formatDate(order.assignedAt)}</p>
                    </div>
                  </div>
                )}
                {order.pickedUpAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-purple-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Picked Up</p>
                      <p className="text-xs text-gray-500">{formatDate(order.pickedUpAt)}</p>
                    </div>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-600 mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Delivered</p>
                      <p className="text-xs text-gray-500">{formatDate(order.deliveredAt)}</p>
                      {order.agent && (
                        <div className="mt-2">
                          {existingRating ? (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= existingRating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-gray-600">You rated this delivery</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowRatingModal(true)}
                              className="mt-1"
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Rate Agent
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {order.cancelledAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cancelled</p>
                      <p className="text-xs text-gray-500">{formatDate(order.cancelledAt)}</p>
                      {order.cancellationReason && (
                        <p className="text-xs text-gray-600 mt-1">Reason: {order.cancellationReason}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/${order.pickup.latitude},${order.pickup.longitude}/${order.dropoff.latitude},${order.dropoff.longitude}`;
                  window.open(url, '_blank');
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                View Route on Maps
              </Button>
            </CardContent>
          </Card>

          {/* Support Ticket Form */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <SupportTicketForm
                orderId={order.id}
                apiCall={partnerApi.createSupportTicket}
                onSuccess={() => {
                  setSuccess('Support ticket created successfully! Our team will review it shortly.');
                  setTimeout(() => setSuccess(null), 5000);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rating Modal */}
      {order?.agent && (
        <RatingModal
          orderId={order.id}
          agentName={order.agent.name}
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            loadOrder(); // Reload to show the rating
          }}
        />
      )}
    </div>
  );
}

