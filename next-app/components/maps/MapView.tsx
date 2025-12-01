'use client';

import React, { useState, useCallback, useRef } from 'react';
import Map, {
  MapRef,
  NavigationControl,
  FullscreenControl,
  GeolocateControl,
  ViewState,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';

export interface MapViewProps {
  /** Initial viewport center [longitude, latitude] */
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom?: number;
  };
  /** Bounds to fit map to [minLng, minLat, maxLng, maxLat] */
  bounds?: [number, number, number, number];
  /** Padding for bounds in pixels */
  boundsPadding?: number;
  /** Location to fly to [longitude, latitude, zoom?] */
  flyTo?: [number, number, number?];
  /** Mapbox access token */
  accessToken?: string;
  /** Map style */
  mapStyle?: string;
  /** Whether to show navigation controls */
  showControls?: boolean;
  /** Whether to show fullscreen control */
  showFullscreen?: boolean;
  /** Whether to show geolocate control */
  showGeolocate?: boolean;
  /** Map height */
  height?: string;
  /** Map width */
  width?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when viewport changes */
  onMove?: (viewState: ViewState) => void;
  /** Children (markers, routes, etc.) */
  children?: React.ReactNode;
  /** Whether map is interactive */
  interactive?: boolean;
  /** Ref to access map methods */
  mapRef?: React.RefObject<MapRef>;
}

const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';
const DEFAULT_ZOOM = 12;

export function MapView({
  initialViewState,
  bounds,
  boundsPadding = 50,
  flyTo,
  accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  mapStyle = DEFAULT_MAP_STYLE,
  showControls = true,
  showFullscreen = true,
  showGeolocate = false,
  height = '100%',
  width = '100%',
  className,
  onMove,
  children,
  interactive = true,
  mapRef: externalMapRef,
}: MapViewProps) {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: initialViewState?.longitude ?? -122.4194,
    latitude: initialViewState?.latitude ?? 37.7749,
    zoom: initialViewState?.zoom ?? DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const internalMapRef = useRef<MapRef>(null);
  const mapRef = externalMapRef || internalMapRef;
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setIsLoaded(true);
    
    // Fit bounds if provided
    if (bounds && mapRef.current) {
      const [minLng, minLat, maxLng, maxLat] = bounds;
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: boundsPadding,
          duration: 1000,
        }
      );
    }
  }, [bounds, boundsPadding]);

  // Update bounds when they change
  React.useEffect(() => {
    if (bounds && mapRef.current && isLoaded) {
      const [minLng, minLat, maxLng, maxLat] = bounds;
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: boundsPadding,
          duration: 1000,
        }
      );
    }
  }, [bounds, boundsPadding, isLoaded]);

  // Fly to location when flyTo prop changes
  React.useEffect(() => {
    if (flyTo && mapRef.current && isLoaded) {
      const [longitude, latitude, zoom = 15] = flyTo;
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom,
        duration: 1500,
        essential: true,
      });
    }
  }, [flyTo, isLoaded]);

  // Handle viewport changes
  const handleMove = useCallback(
    (evt: { viewState: ViewState }) => {
      setViewState(evt.viewState);
      onMove?.(evt.viewState);
    },
    [onMove]
  );

  // Validate access token
  const isValidToken = React.useMemo(() => {
    return (
      accessToken &&
      accessToken !== 'your-mapbox-access-token-here' &&
      accessToken.startsWith('pk.')
    );
  }, [accessToken]);

  if (!isValidToken) {
    return (
      <div
        className={cn('flex items-center justify-center bg-gray-100 rounded-lg', className)}
        style={{ height, width }}
      >
        <div className="text-center p-8">
          <p className="text-gray-600 mb-2 font-semibold">Mapbox access token is required</p>
          <p className="text-sm text-gray-500 mb-4">
            Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env file
          </p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              1. Get your token from{' '}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                mapbox.com
              </a>
            </p>
            <p>2. Add it to your .env file: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk.your_token"</p>
            <p>3. Restart your dev server</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden', className)} style={{ height, width }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onLoad={handleMapLoad}
        mapboxAccessToken={accessToken}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactive={interactive}
        attributionControl={true}
        reuseMaps={true}
      >
        {/* Only render children after map is loaded */}
        {isLoaded && children}

        {/* Controls */}
        {showControls && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <NavigationControl showCompass={true} showZoom={true} />
            {showFullscreen && <FullscreenControl />}
            {showGeolocate && (
              <GeolocateControl positionOptions={{ enableHighAccuracy: true }} />
            )}
          </div>
        )}
      </Map>
    </div>
  );
}
