'use client';

import React, { useState, useEffect } from 'react';
import { MapView } from './MapView';
import { LocationMarker } from './LocationMarker';
import { RouteDisplay } from './RouteDisplay';
import { getRouteFromDirections } from '@/lib/utils/directions';

export interface RoutePoint {
  longitude: number;
  latitude: number;
}

export interface OrderTrackingMapProps {
  /** Pickup location */
  pickup: {
    longitude: number;
    latitude: number;
    address?: string;
  };
  /** Dropoff location */
  dropoff: {
    longitude: number;
    latitude: number;
    address?: string;
  };
  /** Agent current location (optional) */
  agentLocation?: {
    longitude: number;
    latitude: number;
    name?: string;
  };
  /** Route coordinates (optional, will be calculated if not provided) */
  route?: RoutePoint[];
  /** Map height */
  height?: string;
  /** Whether to show route */
  showRoute?: boolean;
}

export function OrderTrackingMap({
  pickup,
  dropoff,
  agentLocation,
  route,
  height = '500px',
  showRoute = true,
}: OrderTrackingMapProps) {
  // Validate coordinates
  const isValidCoordinate = (lng: number, lat: number) => {
    return (
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      !isNaN(lng) &&
      !isNaN(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    );
  };

  if (
    !isValidCoordinate(pickup.longitude, pickup.latitude) ||
    !isValidCoordinate(dropoff.longitude, dropoff.latitude)
  ) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <div className="text-center p-8">
          <p className="text-gray-600 font-semibold">Invalid coordinates</p>
          <p className="text-sm text-gray-500 mt-2">Please check the order location data</p>
        </div>
      </div>
    );
  }

  // Calculate center point for map view
  const centerLng = (pickup.longitude + dropoff.longitude) / 2;
  const centerLat = (pickup.latitude + dropoff.latitude) / 2;

  // State for fetched route
  const [fetchedRoute, setFetchedRoute] = useState<RoutePoint[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Fetch actual route from Google Directions API if route is not provided
  useEffect(() => {
    // If route is already provided, use it
    if (route && route.length >= 2) {
      setFetchedRoute(null);
      return;
    }

    // If showRoute is false, don't fetch
    if (!showRoute) {
      return;
    }

    // Fetch route from Google Directions API
    const fetchRoute = async () => {
      setRouteLoading(true);
      setRouteError(null);
      try {
        const directionsRoute = await getRouteFromDirections(
          { lat: pickup.latitude, lng: pickup.longitude },
          { lat: dropoff.latitude, lng: dropoff.longitude }
        );
        setFetchedRoute(directionsRoute);
      } catch (error: any) {
        console.error('Error fetching route:', error);
        setRouteError(error.message || 'Failed to fetch route');
        // Fallback to straight line
        setFetchedRoute([
          { longitude: pickup.longitude, latitude: pickup.latitude },
          { longitude: dropoff.longitude, latitude: dropoff.latitude },
        ]);
      } finally {
        setRouteLoading(false);
      }
    };

    fetchRoute();
  }, [route, pickup.longitude, pickup.latitude, dropoff.longitude, dropoff.latitude, showRoute]);

  // Determine which route to display
  const displayRoute: RoutePoint[] = React.useMemo(() => {
    // Use provided route if available
    if (route && route.length >= 2) {
      return route;
    }
    // Use fetched route if available
    if (fetchedRoute && fetchedRoute.length >= 2) {
      return fetchedRoute;
    }
    // Fallback to straight line
    return [
      { longitude: pickup.longitude, latitude: pickup.latitude },
      { longitude: dropoff.longitude, latitude: dropoff.latitude },
    ];
  }, [route, fetchedRoute, pickup.longitude, pickup.latitude, dropoff.longitude, dropoff.latitude]);

  return (
    <MapView
      initialViewState={{
        longitude: centerLng,
        latitude: centerLat,
        zoom: 11,
      }}
      height={height}
      showControls={true}
      showGeolocate={false}
    >
      {/* Pickup Marker */}
      <LocationMarker
        longitude={pickup.longitude}
        latitude={pickup.latitude}
        type="pickup"
        label={pickup.address || 'Pickup'}
        showPopup={!!pickup.address}
        popupContent={
          <div>
            <p className="font-semibold text-sm text-gray-900">Pickup Location</p>
            {pickup.address && (
              <p className="text-xs text-gray-600 mt-1">{pickup.address}</p>
            )}
          </div>
        }
      />

      {/* Dropoff Marker */}
      <LocationMarker
        longitude={dropoff.longitude}
        latitude={dropoff.latitude}
        type="dropoff"
        label={dropoff.address || 'Dropoff'}
        showPopup={!!dropoff.address}
        popupContent={
          <div>
            <p className="font-semibold text-sm text-gray-900">Dropoff Location</p>
            {dropoff.address && (
              <p className="text-xs text-gray-600 mt-1">{dropoff.address}</p>
            )}
          </div>
        }
      />

      {/* Agent Location Marker */}
      {agentLocation && (
        <LocationMarker
          longitude={agentLocation.longitude}
          latitude={agentLocation.latitude}
          type="agent"
          label={agentLocation.name || 'Agent'}
          showPopup={!!agentLocation.name}
          popupContent={
            <div>
              <p className="font-semibold text-sm text-gray-900">Agent Location</p>
              {agentLocation.name && (
                <p className="text-xs text-gray-600 mt-1">{agentLocation.name}</p>
              )}
            </div>
          }
        />
      )}

      {/* Route Display */}
      {showRoute && displayRoute.length >= 2 && (
        <RouteDisplay
          route={displayRoute}
          color="#3b82f6"
          width={4}
          showMarkers={false}
          animate={false}
        />
      )}
    </MapView>
  );
}
