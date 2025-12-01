/**
 * Fetch route from Google Directions API
 */
export async function getRouteFromDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey?: string
): Promise<{ longitude: number; latitude: number }[]> {
  const googleApiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!googleApiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  const originStr = `${origin.lat},${origin.lng}`;
  const destinationStr = `${destination.lat},${destination.lng}`;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${googleApiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Directions API error: ${data.status}`);
    }

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found');
    }

    // Extract polyline points from the first route
    const route = data.routes[0];
    const legs = route.legs;
    
    if (!legs || legs.length === 0) {
      throw new Error('No route legs found');
    }

    // Decode the polyline
    const points: { longitude: number; latitude: number }[] = [];
    
    for (const leg of legs) {
      if (leg.steps) {
        for (const step of leg.steps) {
          if (step.polyline && step.polyline.points) {
            const decoded = decodePolyline(step.polyline.points);
            points.push(...decoded);
          }
        }
      }
    }

    // If we have points, return them; otherwise fall back to start/end points
    if (points.length > 0) {
      return points;
    }

    // Fallback: return start and end points
    return [
      { longitude: origin.lng, latitude: origin.lat },
      { longitude: destination.lng, latitude: destination.lat },
    ];
  } catch (error) {
    console.error('Error fetching directions:', error);
    // Fallback to straight line
    return [
      { longitude: origin.lng, latitude: origin.lat },
      { longitude: destination.lng, latitude: destination.lat },
    ];
  }
}

/**
 * Decode Google Maps encoded polyline string
 * Algorithm from: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): { longitude: number; latitude: number }[] {
  const points: { longitude: number; latitude: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat * 1e-5,
      longitude: lng * 1e-5,
    });
  }

  return points;
}

