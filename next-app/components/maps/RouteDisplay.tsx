'use client';

import React from 'react';
import { useMap } from 'react-map-gl/mapbox';
import { Source, Layer } from 'react-map-gl/mapbox';

export interface RoutePoint {
  longitude: number;
  latitude: number;
}

export interface RouteDisplayProps {
  /** Route points array */
  route: RoutePoint[];
  /** Route color */
  color?: string;
  /** Route width */
  width?: number;
  /** Whether to animate the route */
  animate?: boolean;
  /** Whether to show route markers */
  showMarkers?: boolean;
  /** Route line style */
  lineStyle?: 'solid' | 'dashed';
  /** Opacity */
  opacity?: number;
}

const DEFAULT_COLOR = '#3b82f6';
const DEFAULT_WIDTH = 4;
const DEFAULT_OPACITY = 0.8;

export function RouteDisplay({
  route,
  color = DEFAULT_COLOR,
  width = DEFAULT_WIDTH,
  lineStyle = 'solid',
  opacity = DEFAULT_OPACITY,
}: RouteDisplayProps) {
  // Get map instance - this hook must be called unconditionally
  const { current: map } = useMap();

  // Convert route points to GeoJSON LineString format
  const routeGeoJSON = React.useMemo(() => {
    if (!route || route.length < 2) return null;

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: route.map((point) => [point.longitude, point.latitude]),
      },
      properties: {},
    };
  }, [route]);

  // Don't render if map isn't ready or route is invalid
  if (!map || !routeGeoJSON) {
    return null;
  }

  // Build paint properties
  const paintProps: Record<string, any> = {
    'line-color': color,
    'line-width': width,
    'line-opacity': opacity,
  };

  // Only add line-dasharray if line style is dashed
  if (lineStyle === 'dashed') {
    paintProps['line-dasharray'] = [2, 2];
  }

  return (
    <Source id="route" type="geojson" data={routeGeoJSON}>
      <Layer
        id="route-line"
        type="line"
        layout={{
          'line-join': 'round',
          'line-cap': 'round',
        }}
        paint={paintProps}
      />
    </Source>
  );
}
