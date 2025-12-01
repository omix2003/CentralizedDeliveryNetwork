'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MapPin, Users, Filter, Search, Maximize2, RefreshCw, Navigation2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { adminApi } from '@/lib/api/admin';

// Lazy load map components
const MapView = dynamic(() => import('@/components/maps/MapView').then(mod => ({ default: mod.MapView })), { ssr: false });
const LocationMarker = dynamic(() => import('@/components/maps/LocationMarker').then(mod => ({ default: mod.LocationMarker })), { ssr: false });

interface AgentLocation {
  agentId: string;
  longitude: number | null;
  latitude: number | null;
  hasLocation?: boolean;
  agent: {
    id: string;
    status: string;
    user: {
      name: string;
      email: string;
    };
  };
}

export default function AdminMapPage() {
  const [agentLocations, setAgentLocations] = useState<AgentLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchAgentLocations() {
      try {
        setLoading(true);
        const data = await adminApi.getAgentLocations();
        console.log('Agent locations fetched:', data);
        console.log('Agents with valid coordinates:', data.filter(
          (loc: AgentLocation) => loc.longitude !== null && loc.latitude !== null && 
          !isNaN(loc.longitude!) && !isNaN(loc.latitude!)
        ));
        setAgentLocations(data);
      } catch (err: any) {
        console.error('Failed to fetch agent locations:', err);
        setError(err.message || 'Failed to load agent locations');
      } finally {
        setLoading(false);
      }
    }

    fetchAgentLocations();
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchAgentLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter agents
  const filteredAgents = agentLocations.filter((loc) => {
    if (statusFilter !== 'ALL' && loc.agent.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        loc.agent.user.name.toLowerCase().includes(query) ||
        loc.agent.user.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate bounds from agent locations
  const calculateBounds = (locations: AgentLocation[]): [number, number, number, number] | null => {
    const locationsWithCoords = locations.filter(
      (loc) => loc.longitude !== null && loc.latitude !== null && 
      !isNaN(loc.longitude!) && !isNaN(loc.latitude!)
    );
    
    if (locationsWithCoords.length === 0) {
      return null;
    }

    const longitudes = locationsWithCoords.map((loc) => loc.longitude!);
    const latitudes = locationsWithCoords.map((loc) => loc.latitude!);

    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);

    // Add some padding
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;

    return [
      minLng - lngPadding,
      minLat - latPadding,
      maxLng + lngPadding,
      maxLat + latPadding,
    ];
  };

  const mapBounds = calculateBounds(filteredAgents);
  const [mapKey, setMapKey] = useState(0); // Force re-render for bounds update
  const [flyToLocation, setFlyToLocation] = useState<[number, number, number?] | null>(null);
  const mapRef = useRef<any>(null);
  
  // Calculate center point for initial view
  const getMapCenter = (): { longitude: number; latitude: number; zoom: number } => {
    if (mapBounds) {
      const [minLng, minLat, maxLng, maxLat] = mapBounds;
      return {
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
        zoom: 10,
      };
    }
    // Default center (can be configured)
    return {
      longitude: -74.0060,
      latitude: 40.7128,
      zoom: 12,
    };
  };

  const handleFitBounds = () => {
    // Force map to recalculate bounds by updating key
    setMapKey((prev) => prev + 1);
  };

  const handleLocateAgent = (agentId: string) => {
    const agent = agentLocations.find((loc) => loc.agentId === agentId);
    if (agent && agent.longitude !== null && agent.latitude !== null && 
        !isNaN(agent.longitude) && !isNaN(agent.latitude)) {
      setSelectedAgent(agentId);
      setFlyToLocation([agent.longitude, agent.latitude, 16]);
      // Reset flyTo after animation completes
      setTimeout(() => setFlyToLocation(null), 1600);
    }
  };

  const agentsWithLocation = filteredAgents.filter(
    (loc) => loc.longitude !== null && loc.latitude !== null
  ).length;
  const agentsWithoutLocation = filteredAgents.length - agentsWithLocation;

  if (loading && agentLocations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading agent locations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Agent Map</h1>
          <p className="text-gray-600">
            Real-time location tracking of all agents
            {agentsWithLocation > 0 && (
              <span className="ml-2 text-sm">
                ({agentsWithLocation} with location{agentsWithoutLocation > 0 && `, ${agentsWithoutLocation} without`})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleFitBounds} disabled={!mapBounds}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Fit to Agents
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'ALL' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('ALL')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'ONLINE' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('ONLINE')}
              >
                Online
              </Button>
              <Button
                variant={statusFilter === 'ON_TRIP' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('ON_TRIP')}
              >
                On Trip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="h-[600px] w-full rounded-lg overflow-hidden">
                <MapView
                  key={mapKey}
                  initialViewState={getMapCenter()}
                  bounds={mapBounds || undefined}
                  boundsPadding={80}
                  flyTo={flyToLocation || undefined}
                  mapRef={mapRef}
                  height="100%"
                  width="100%"
                >
                  {filteredAgents.filter(
                    (loc) => loc.longitude !== null && loc.latitude !== null && 
                    !isNaN(loc.longitude!) && !isNaN(loc.latitude!)
                  ).length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
                      <div className="text-center p-6 bg-white rounded-lg shadow-lg">
                        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No Agents with Locations</p>
                        <p className="text-sm text-gray-600 mb-4">
                          {filteredAgents.length === 0
                            ? 'No agents match your filters'
                            : `${filteredAgents.length} agent(s) found but none have location data`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Agents need to update their location to appear on the map
                        </p>
                      </div>
                    </div>
                  ) : (
                    filteredAgents.map((loc) => {
                      // Only show markers for agents with valid coordinates
                      if (loc.longitude === null || loc.latitude === null || 
                          isNaN(loc.longitude) || isNaN(loc.latitude)) {
                        return null;
                      }
                      
                      const markerType: 'agent' | 'default' = loc.agent.status === 'ONLINE' || loc.agent.status === 'ON_TRIP'
                        ? 'agent' 
                        : 'default';
                      
                      return (
                        <LocationMarker
                          key={loc.agentId}
                          longitude={loc.longitude}
                          latitude={loc.latitude}
                          type={markerType}
                          label={loc.agent.user.name}
                          onClick={() => setSelectedAgent(loc.agentId)}
                          showPopup={true}
                          popupContent={
                            <div className="p-2">
                              <p className="font-medium text-sm">{loc.agent.user.name}</p>
                              <p className="text-xs text-gray-600">{loc.agent.user.email}</p>
                              <p className="text-xs text-gray-500">Status: {loc.agent.status}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => handleLocateAgent(loc.agentId)}
                              >
                                <Navigation2 className="h-3 w-3 mr-1" />
                                Center on Agent
                              </Button>
                            </div>
                          }
                        />
                      );
                    })
                  )}
                </MapView>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent List */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agents ({filteredAgents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No agents found
                  </div>
                ) : (
                  filteredAgents.map((loc) => {
                    const isSelected = selectedAgent === loc.agentId;
                    const hasLocation = loc.longitude !== null && loc.latitude !== null;
                    const statusColor =
                      loc.agent.status === 'ONLINE'
                        ? 'bg-green-500'
                        : loc.agent.status === 'ON_TRIP'
                        ? 'bg-blue-500'
                        : 'bg-gray-400';

                    return (
                      <div
                        key={loc.agentId}
                        className={`p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${statusColor}`} />
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              setSelectedAgent(loc.agentId);
                              if (hasLocation) {
                                handleLocateAgent(loc.agentId);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">
                                {loc.agent.user.name}
                              </p>
                              {!hasLocation && (
                                <MapPin className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {loc.agent.user.email}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Status: {loc.agent.status}
                            </p>
                            {hasLocation && (
                              <p className="text-xs text-gray-500 mt-1">
                                {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                              </p>
                            )}
                          </div>
                          {hasLocation && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocateAgent(loc.agentId);
                              }}
                              title="Locate on map"
                            >
                              <Navigation2 className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Agent Details */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const agent = agentLocations.find((loc) => loc.agentId === selectedAgent);
              if (!agent) return null;
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-gray-900">{agent.agent.user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-gray-900">{agent.agent.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <p className="text-gray-900">{agent.agent.status}</p>
                  </div>
                  {agent.longitude !== null && agent.latitude !== null && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-gray-900 text-xs">
                        {agent.latitude.toFixed(6)}, {agent.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {agent.longitude !== null && agent.latitude !== null && (
                      <Button
                        variant="primary"
                        onClick={() => handleLocateAgent(agent.agentId)}
                      >
                        <Navigation2 className="h-4 w-4 mr-2" />
                        Locate on Map
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/admin/agents/${agent.agentId}`, '_blank')}
                    >
                      View Full Profile
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

