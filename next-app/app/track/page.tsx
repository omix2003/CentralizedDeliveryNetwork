'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Search, MapPin, Package, Clock, User, Phone, Mail, RefreshCw, AlertCircle, CheckCircle, Truck, Navigation } from 'lucide-react';
import { trackingApi, TrackedOrder } from '@/lib/api/tracking';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { AddressDisplay } from '@/components/orders/AddressDisplay';

// Dynamically import map component
const OrderTrackingMap = dynamic(
  () => import('@/components/maps/OrderTrackingMap').then(mod => ({ default: mod.OrderTrackingMap })),
  {
    ssr: false,
    loading: () => <div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" />
  }
);

function TrackOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const lastTrackedIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // Only load from URL on initial mount or when ID actually changes
  useEffect(() => {
    const id = searchParams.get('id');
    // Only track if ID changed or this is the initial load
    if (id && id !== lastTrackedIdRef.current) {
      setOrderId(id);
      lastTrackedIdRef.current = id;
      handleTrackOrder(id, false); // false = don't update URL since it's already in URL
      isInitialLoadRef.current = false;
    } else if (!id && isInitialLoadRef.current) {
      // No ID in URL on initial load, clear state
      isInitialLoadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // We check searchParams.get('id') inside, but need searchParams as dependency

  const handleTrackOrder = async (id?: string, updateURL: boolean = true) => {
    const trackId = id || orderId.trim();
    if (!trackId) {
      setError('Please enter an order ID');
      return;
    }

    // Prevent duplicate requests for the same ID
    if (lastTrackedIdRef.current === trackId && loading) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSearched(true);
      lastTrackedIdRef.current = trackId;
      const data = await trackingApi.trackOrder(trackId);
      setOrder(data);
      // Only update URL if explicitly requested (not when loading from URL)
      if (updateURL) {
        router.replace(`/track?id=${trackId}`, { scroll: false });
      }
    } catch (err: any) {
      console.error('Error tracking order:', err);
      let errorMessage = 'Failed to track order';
      
      if (err.isNetworkError) {
        errorMessage = err.message || 'Cannot connect to the server. Please check your internet connection and ensure the backend server is running.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 404) {
        errorMessage = 'Order not found. Please check the order ID and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrackOrder();
  };

  const getStatusTimeline = () => {
    if (!order) return [];

    const timeline = [];
    
    timeline.push({
      status: 'Created',
      date: order.createdAt,
      icon: Package,
      color: 'bg-blue-500',
      completed: true,
    });

    if (order.assignedAt) {
      timeline.push({
        status: 'Assigned to Agent',
        date: order.assignedAt,
        icon: User,
        color: 'bg-purple-500',
        completed: true,
      });
    }

    if (order.pickedUpAt) {
      timeline.push({
        status: 'Picked Up',
        date: order.pickedUpAt,
        icon: Truck,
        color: 'bg-orange-500',
        completed: true,
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        status: 'Delivered',
        date: order.deliveredAt,
        icon: CheckCircle,
        color: 'bg-green-500',
        completed: true,
      });
    } else if (order.cancelledAt) {
      timeline.push({
        status: 'Cancelled',
        date: order.cancelledAt,
        icon: AlertCircle,
        color: 'bg-red-500',
        completed: true,
      });
    } else if (order.status === 'OUT_FOR_DELIVERY') {
      timeline.push({
        status: 'Out for Delivery',
        date: order.updatedAt,
        icon: Navigation,
        color: 'bg-yellow-500',
        completed: false,
      });
    }

    return timeline;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
              <p className="text-gray-600 mt-1">Enter your order ID to track its status</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => {
                    setOrderId(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter order ID or tracking number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Track Order
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Order #{order.trackingNumber}</CardTitle>
                    <p className="text-gray-600 mt-1">Tracking Number: {order.trackingNumber}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Partner</p>
                    <p className="text-lg font-semibold text-gray-900">{order.partner.companyName}</p>
                    <p className="text-sm text-gray-600">{order.partner.name}</p>
                  </div>
                  {order.agent && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Delivery Agent</p>
                      <p className="text-lg font-semibold text-gray-900">{order.agent.name}</p>
                      <a href={`tel:${order.agent.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {order.agent.phone}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Priority</p>
                    <p className="text-lg font-semibold text-gray-900">{order.priority}</p>
                    {order.estimatedDuration && (
                      <p className="text-sm text-gray-600">Est. {order.estimatedDuration} min</p>
                    )}
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
                <div className="relative">
                  {getStatusTimeline().map((item, index) => {
                    const Icon = item.icon;
                    const isLast = index === getStatusTimeline().length - 1;
                    return (
                      <div key={index} className="relative flex items-start gap-4 pb-6">
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white z-10 relative`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          {!isLast && (
                            <div className="absolute left-1/2 top-10 transform -translate-x-1/2 w-0.5 h-6 bg-gray-300"></div>
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-semibold text-gray-900">{item.status}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(item.date), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Map */}
            {order.pickup && order.dropoff ? (
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Route</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] rounded-lg overflow-hidden">
                    <OrderTrackingMap
                      pickup={{
                        longitude: order.pickup.longitude,
                        latitude: order.pickup.latitude,
                      }}
                      dropoff={{
                        longitude: order.dropoff.longitude,
                        latitude: order.dropoff.latitude,
                      }}
                      agentLocation={
                        order.agent && order.status === 'OUT_FOR_DELIVERY'
                          ? undefined // Could add agent location if available
                          : undefined
                      }
                      height="100%"
                      showRoute={true}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Location data not available for this order</p>
                </CardContent>
              </Card>
            )}

            {/* Locations */}
            {order.pickup && order.dropoff ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                      Pickup Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AddressDisplay
                      latitude={order.pickup.latitude}
                      longitude={order.pickup.longitude}
                      fallback={`${order.pickup.latitude.toFixed(6)}, ${order.pickup.longitude.toFixed(6)}`}
                    />
                    {order.pickup && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          window.open(`https://www.google.com/maps?q=${order.pickup!.latitude},${order.pickup!.longitude}`, '_blank');
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Open in Maps
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      Delivery Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AddressDisplay
                      latitude={order.dropoff.latitude}
                      longitude={order.dropoff.longitude}
                      fallback={`${order.dropoff.latitude.toFixed(6)}, ${order.dropoff.longitude.toFixed(6)}`}
                    />
                    {order.dropoff && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          window.open(`https://www.google.com/maps?q=${order.dropoff!.latitude},${order.dropoff!.longitude}`, '_blank');
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Open in Maps
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Location information not available</p>
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            {order.cancellationReason && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Order Cancelled</p>
                      <p className="text-sm text-red-800 mt-1">{order.cancellationReason}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refresh Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => handleTrackOrder(order.id, false)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {searched && !order && !loading && !error && (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h3>
              <p className="text-gray-600 mb-6">
                Please check your order ID and try again.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setOrderId('');
                  setError('');
                  setSearched(false);
                }}
              >
                Search Again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
