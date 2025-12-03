// Track if we've already warned about missing API key (only warn once per session)
let hasWarnedAboutApiKey = false;

/**
 * Fetch route from Google Directions API via backend proxy
 */
export async function getRouteFromDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey?: string
): Promise<{ longitude: number; latitude: number }[]> {
  const originStr = `${origin.lat},${origin.lng}`;
  const destinationStr = `${destination.lat},${destination.lng}`;

  // Use backend proxy to avoid CORS issues
  const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const normalizedBaseURL = apiBaseURL.endsWith('/api') ? apiBaseURL : `${apiBaseURL}/api`;
  const proxyUrl = `${normalizedBaseURL}/public/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destinationStr)}`;

  try {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP error! status: ${response.status}` };
      }
      
      const errorMsg = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
      
      // If it's a configuration error, log it once per session
      if (errorMsg.includes('API key is not configured') && !hasWarnedAboutApiKey) {
        console.warn('⚠️ Google Maps API key not configured in backend. Please set GOOGLE_MAPS_API_KEY in your backend .env file. Falling back to straight line route.');
        hasWarnedAboutApiKey = true;
      }
      
      throw new Error(errorMsg);
    }
    
    const data = await response.json();

    if (data.status !== 'OK') {
      const errorMsg = data.error_message || data.message || 'Unknown error';
      // Only log specific errors that need attention
      if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST') {
        console.warn(`Google Directions API error: ${data.status} - ${errorMsg}`);
      }
      throw new Error(`Directions API error: ${data.status} - ${errorMsg}`);
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
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const isNetworkError = errorMessage.includes('Failed to fetch') || 
                          errorMessage.includes('NetworkError') ||
                          errorMessage.includes('CORS');
    const isConfigError = errorMessage.includes('API key is not configured');
    
    // Only log non-config errors in development, and only if we haven't already warned about API key
    if (!isConfigError && !hasWarnedAboutApiKey && process.env.NODE_ENV === 'development' && !isNetworkError) {
      console.warn('Error fetching directions, falling back to straight line:', errorMessage);
    }
    
    // Silently fallback to straight line - this is acceptable for display purposes
    // Configuration errors are already handled above with a one-time warning
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



