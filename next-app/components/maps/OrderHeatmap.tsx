'use client';

import React, { useMemo, useRef } from 'react';
import { MapView } from './MapView';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl';

export interface HeatmapPoint {
  location: [number, number]; // [lng, lat]
  type: 'pickup' | 'dropoff';
  status: string;
  date: string;
}

export interface OrderHeatmapProps {
  data: HeatmapPoint[];
  bounds?: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  } | null;
  height?: string;
  onPointClick?: (point: HeatmapPoint) => void;
}

export function OrderHeatmap({
  data,
  bounds,
  height = '600px',
  onPointClick,
}: OrderHeatmapProps) {
  const mapRef = useRef<MapRef>(null);

  // Convert data to GeoJSON format for Mapbox
  const geojsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: data.map((point, index) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: point.location,
        },
        properties: {
          id: index,
          type: point.type,
          status: point.status,
          date: point.date,
        },
      })),
    };
  }, [data]);

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    if (!bounds || data.length === 0) return undefined;
    
    return [
      bounds.minLng,
      bounds.minLat,
      bounds.maxLng,
      bounds.maxLat,
    ] as [number, number, number, number];
  }, [bounds, data]);

  // Calculate center point for initial view
  const centerPoint = useMemo(() => {
    if (!bounds || data.length === 0) {
      return { longitude: 0, latitude: 0, zoom: 2 };
    }
    
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    
    // Calculate zoom based on bounds
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 10;
    if (maxDiff > 1) zoom = 8;
    else if (maxDiff > 0.5) zoom = 9;
    else if (maxDiff > 0.1) zoom = 10;
    else if (maxDiff > 0.05) zoom = 11;
    else zoom = 12;
    
    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom,
    };
  }, [bounds, data]);

  const handleMapClick = (event: MapLayerMouseEvent) => {
    if (!onPointClick || !mapRef.current) return;
    
    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ['points-layer'],
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const point: HeatmapPoint = {
        location: feature.geometry.type === 'Point' 
          ? feature.geometry.coordinates as [number, number]
          : [0, 0],
        type: feature.properties?.type || 'pickup',
        status: feature.properties?.status || '',
        date: feature.properties?.date || '',
      };
      onPointClick(point);
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No order data available for heatmap</p>
      </div>
    );
  }

  return (
    <MapView
      initialViewState={centerPoint}
      bounds={mapBounds}
      height={height}
      showControls={true}
      showGeolocate={false}
      mapRef={mapRef}
      onClick={handleMapClick}
    >
      {/* Heatmap Layer */}
      <Source
        id="heatmap-source"
        type="geojson"
        data={geojsonData}
      >
        {/* Heatmap layer */}
        <Layer
          id="heatmap-layer"
          type="heatmap"
          paint={{
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'id'],
              0, 0,
              1, 1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              9, 3,
              12, 5,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33, 102, 172, 0)',
              0.2, 'rgb(103, 169, 207)',
              0.4, 'rgb(209, 229, 240)',
              0.6, 'rgb(253, 219, 199)',
              0.8, 'rgb(239, 138, 98)',
              1, 'rgb(178, 24, 43)',
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 2,
              9, 20,
              12, 30,
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              7, 1,
              9, 0.8,
            ],
          }}
        />
        
        {/* Point layer for interaction - invisible but clickable */}
        <Layer
          id="points-layer"
          type="circle"
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 5,
              12, 10,
            ],
            'circle-opacity': 0,
            'circle-stroke-width': 0,
          }}
        />
      </Source>
    </MapView>
  );
}

