# Map Components

Map components for displaying delivery tracking, routes, and locations using Mapbox GL.

## Setup

1. Get a Mapbox access token from [mapbox.com](https://www.mapbox.com/)
2. Add it to your `.env.local` file:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
   ```

## Components

### MapView

Main map container component.

```tsx
import { MapView } from '@/components/maps';

<MapView
  initialViewState={{
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 13,
  }}
  height="500px"
  showControls={true}
>
  {/* Add markers, routes, etc. here */}
</MapView>
```

### LocationMarker

Display location markers with different types (pickup, dropoff, agent, current).

```tsx
import { LocationMarker } from '@/components/maps';

<LocationMarker
  longitude={-122.4194}
  latitude={37.7749}
  type="pickup"
  label="Pickup Location"
  showPopup={true}
  popupContent={<div>Pickup Address</div>}
/>
```

**Marker Types:**
- `pickup` - Orange marker with package icon
- `dropoff` - Green marker with home icon
- `agent` - Blue marker with truck icon
- `current` - Purple marker with navigation icon (animated pulse)
- `default` - Gray marker with pin icon

### RouteDisplay

Display routes between points on the map.

```tsx
import { RouteDisplay } from '@/components/maps';

<RouteDisplay
  route={[
    { longitude: -122.4194, latitude: 37.7749 },
    { longitude: -122.4094, latitude: 37.7849 },
  ]}
  color="#3b82f6"
  width={4}
  showMarkers={true}
  animate={false}
/>
```

### OrderTrackingMap

Complete order tracking map with pickup, dropoff, and optional agent location.

```tsx
import { OrderTrackingMap } from '@/components/maps';

<OrderTrackingMap
  pickup={{
    longitude: -122.4194,
    latitude: 37.7749,
    address: "123 Main St, San Francisco, CA",
  }}
  dropoff={{
    longitude: -122.4094,
    latitude: 37.7849,
    address: "456 Oak Ave, San Francisco, CA",
  }}
  agentLocation={{
    longitude: -122.4144,
    latitude: 37.7799,
    name: "John Doe",
  }}
  height="600px"
  showRoute={true}
/>
```

## Complete Example

```tsx
'use client';

import { MapView, LocationMarker, RouteDisplay } from '@/components/maps';

export function DeliveryMap() {
  const route = [
    { longitude: -122.4194, latitude: 37.7749 },
    { longitude: -122.4094, latitude: 37.7849 },
  ];

  return (
    <MapView
      initialViewState={{
        longitude: -122.4144,
        latitude: 37.7799,
        zoom: 13,
      }}
      height="600px"
    >
      <LocationMarker
        longitude={-122.4194}
        latitude={37.7749}
        type="pickup"
        label="Pickup"
      />
      
      <LocationMarker
        longitude={-122.4094}
        latitude={37.7849}
        type="dropoff"
        label="Dropoff"
      />
      
      <RouteDisplay
        route={route}
        color="#3b82f6"
        showMarkers={true}
      />
    </MapView>
  );
}
```

## Notes

- All components require a Mapbox access token
- Components are client-side only (`'use client'`)
- RouteDisplay automatically fits the map to show the entire route
- LocationMarker supports hover popups and click handlers
- OrderTrackingMap is a convenience component that combines all features




















