'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { agentApi, AgentOrder } from '@/lib/api/agent';
import { formatCurrency } from '@/lib/utils/currency';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  DollarSign, 
  Package, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Navigation,
  Truck,
  User
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { reverseGeocode } from '@/lib/utils/geocoding';
import { SupportTicketForm } from '@/components/support/SupportTicketForm';
import { OrderTimer } from '@/components/orders/OrderTimer';
import { DelayedBadge } from '@/components/orders/DelayedBadge';
import { DeliveryVerification } from '@/components/verification/DeliveryVerification';
import { BarcodeScanner } from '@/components/scanning/BarcodeScanner';
import { QRScanner } from '@/components/scanning/QRScanner';

// Dynamically import map component to avoid SSR issues
const OrderTrackingMap = dynamic(() => import('@/components/maps/OrderTrackingMap').then(mod => ({ default: mod.OrderTrackingMap })), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
});

export default function AgentOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<AgentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeScanError, setBarcodeScanError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanError, setQrScanError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentApi.getOrderDetails(orderId);
      console.log('[Order Details] Order status:', data.status, 'isDelayed:', data.timing?.isDelayed, 'timing:', data.timing);
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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load order details');
      console.error('Error loading order:', err);
      setAddressesLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED', cancellationReason?: string) => {
    if (!order) return;

    // For PICKED_UP status, require barcode scanning
    if (status === 'PICKED_UP' && order.status === 'ASSIGNED') {
      setShowBarcodeScanner(true);
      setBarcodeScanError(null);
      return;
    }

    // For DELIVERED status, require QR code scanning
    if (status === 'DELIVERED' && (order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELAYED')) {
      setShowQRScanner(true);
      setQrScanError(null);
      return;
    }

    if (status === 'CANCELLED' && !cancellationReason) {
      const reason = window.prompt('Please provide a reason for cancellation:');
      if (!reason) return;
      cancellationReason = reason;
    }

    try {
      setUpdating(true);
      setUpdateError(null);
      await agentApi.updateOrderStatus(orderId, status, cancellationReason);
      // Reload order to get updated status
      await loadOrder();
    } catch (err: any) {
      setUpdateError(err.response?.data?.error || 'Failed to update order status');
      console.error('Error updating order status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleBarcodeScanSuccess = async (scannedOrder: any) => {
    if (!order) return;

    // Verify the scanned order matches the current order
    if (scannedOrder.id !== order.id) {
      setBarcodeScanError('Barcode does not match this order. Please scan the correct barcode.');
      return;
    }

    // Close scanner and update status to PICKED_UP
    setShowBarcodeScanner(false);
    setBarcodeScanError(null);
    
    try {
      setUpdating(true);
      setUpdateError(null);
      await agentApi.updateOrderStatus(orderId, 'PICKED_UP');
      // Reload order to get updated status
      await loadOrder();
    } catch (err: any) {
      setUpdateError(err.response?.data?.error || 'Failed to update order status');
      console.error('Error updating order status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleBarcodeScanError = (error: string) => {
    setBarcodeScanError(error);
  };

  const handleQRScanSuccess = async (scannedOrder: any) => {
    if (!order) return;

    // Verify the scanned order matches the current order
    if (scannedOrder.id !== order.id) {
      setQrScanError('QR code does not match this order. Please scan the correct QR code.');
      return;
    }

    // Close scanner and update status to DELIVERED
    setShowQRScanner(false);
    setQrScanError(null);
    
    try {
      setUpdating(true);
      setUpdateError(null);
      await agentApi.updateOrderStatus(orderId, 'DELIVERED');
      // Reload order to get updated status
      await loadOrder();
    } catch (err: any) {
      setUpdateError(err.response?.data?.error || 'Failed to update order status');
      console.error('Error updating order status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleQRScanError = (error: string) => {
    setQrScanError(error);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getNextStatus = () => {
    if (!order) return null;
    
    switch (order.status) {
      case 'ASSIGNED':
        return 'PICKED_UP';
      case 'PICKED_UP':
        return 'OUT_FOR_DELIVERY';
      case 'OUT_FOR_DELIVERY':
        return 'DELIVERED';
      case 'DELAYED':
        return 'DELIVERED'; // Allow marking delayed orders as delivered
      default:
        return null;
    }
  };

  const canUpdateStatus = () => {
    if (!order) return false;
    return ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELAYED'].includes(order.status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/agent/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
            <p className="text-red-700">{error || 'Order not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nextStatus = getNextStatus();
  const isValidCoordinate = (lat: number, lng: number) => {
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/agent/orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600 mt-1">#{order.trackingNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={order.status} />
          {(order.status === 'DELAYED' || order.status?.toUpperCase() === 'DELAYED' || (order.timing?.isDelayed && order.status !== 'DELIVERED' && order.status !== 'CANCELLED')) && (
            <DelayedBadge />
          )}
        </div>
      </div>

      {/* Update Error */}
      {updateError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{updateError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
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

          {/* Delivery Verification */}
          {(order.status === 'OUT_FOR_DELIVERY' || order.status === 'PICKED_UP') && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryVerification 
                  orderId={order.id}
                  onVerified={() => {
                    loadOrder();
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Status Actions */}
          {canUpdateStatus() && (
            <Card>
              <CardHeader>
                <CardTitle>Update Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextStatus && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => handleStatusUpdate(nextStatus as any)}
                    disabled={updating}
                  >
                    {nextStatus === 'PICKED_UP' && 'Scan Barcode to Pick Up'}
                    {nextStatus === 'OUT_FOR_DELIVERY' && 'Mark as Out for Delivery'}
                    {nextStatus === 'DELIVERED' && 'Scan QR Code to Deliver'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleStatusUpdate('CANCELLED')}
                  disabled={updating}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Barcode Scanner Modal for Pickup */}
          {showBarcodeScanner && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Scan Barcode to Collect Order</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowBarcodeScanner(false);
                        setBarcodeScanError(null);
                      }}
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Please scan the barcode on the order package to verify collection.
                  </p>
                </CardHeader>
                <CardContent>
                  {barcodeScanError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                      {barcodeScanError}
                    </div>
                  )}
                  <BarcodeScanner
                    onScanSuccess={handleBarcodeScanSuccess}
                    onScanError={handleBarcodeScanError}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* QR Scanner Modal for Delivery */}
          {showQRScanner && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Scan QR Code to Deliver Order</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowQRScanner(false);
                        setQrScanError(null);
                      }}
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Please scan the QR code on the order package to verify delivery.
                  </p>
                </CardHeader>
                <CardContent>
                  {qrScanError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                      {qrScanError}
                    </div>
                  )}
                  <QRScanner
                    onScanSuccess={handleQRScanSuccess}
                    onScanError={handleQRScanError}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Map */}
          {isValidCoordinate(order.pickup.latitude, order.pickup.longitude) &&
           isValidCoordinate(order.dropoff.latitude, order.dropoff.longitude) && (
            <Card>
              <CardHeader>
                <CardTitle>Route Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 rounded-lg overflow-hidden">
                  <OrderTrackingMap
                    pickup={{
                      longitude: order.pickup.longitude,
                      latitude: order.pickup.latitude,
                    }}
                    dropoff={{
                      longitude: order.dropoff.longitude,
                      latitude: order.dropoff.latitude,
                    }}
                    height="100%"
                    showRoute={true}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Locations */}
          <Card>
            <CardHeader>
              <CardTitle>Locations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="mt-0.5">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 mb-1">Pickup Location</p>
                  {addressesLoading ? (
                    <p className="text-sm text-orange-500">Loading address...</p>
                  ) : (
                    <p className="text-sm text-orange-700">
                      {pickupAddress || formatCoordinates(order.pickup.latitude, order.pickup.longitude)}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps?q=${order.pickup.latitude},${order.pickup.longitude}`,
                        '_blank'
                      );
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Open in Maps
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="mt-0.5">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 mb-1">Delivery Location</p>
                  {addressesLoading ? (
                    <p className="text-sm text-green-500">Loading address...</p>
                  ) : (
                    <p className="text-sm text-green-700">
                      {dropoffAddress || formatCoordinates(order.dropoff.latitude, order.dropoff.longitude)}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps?q=${order.dropoff.latitude},${order.dropoff.longitude}`,
                        '_blank'
                      );
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Open in Maps
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order Created</p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                {order.assignedAt && (
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Order Assigned</p>
                      <p className="text-xs text-gray-500">{formatDate(order.assignedAt)}</p>
                    </div>
                  </div>
                )}
                {order.pickedUpAt && (
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Picked Up</p>
                      <p className="text-xs text-gray-500">{formatDate(order.pickedUpAt)}</p>
                    </div>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Delivered</p>
                      <p className="text-xs text-gray-500">{formatDate(order.deliveredAt)}</p>
                    </div>
                  </div>
                )}
                {order.cancelledAt && (
                  <div className="flex items-start gap-4">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payout</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(order.payout)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Priority</span>
                <StatusBadge status={order.priority} />
              </div>
              {order.estimatedDuration && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estimated Duration</span>
                  <span className="text-sm font-medium text-gray-900">{order.estimatedDuration} min</span>
                </div>
              )}
              {order.actualDuration && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Actual Duration</span>
                  <span className="text-sm font-medium text-gray-900">{order.actualDuration} min</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partner Info */}
          <Card>
            <CardHeader>
              <CardTitle>Partner Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.partner.name}</p>
                  <p className="text-xs text-gray-500 truncate">{order.partner.companyName}</p>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <a
                  href={`tel:${order.partner.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                >
                  <Phone className="h-4 w-4" />
                  {order.partner.phone}
                </a>
                <a
                  href={`mailto:${order.partner.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                >
                  <Mail className="h-4 w-4" />
                  {order.partner.email}
                </a>
              </div>
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
                apiCall={agentApi.createSupportTicket}
                onSuccess={() => {
                  alert('Support ticket created successfully! Our team will review it shortly.');
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

