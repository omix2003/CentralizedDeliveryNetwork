/**
 * Reverse geocode coordinates to get address using Google Geocoding API
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<string | null> {
  const googleApiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!googleApiKey) {
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Return the formatted address from the first result
      return data.results[0].formatted_address;
    }

    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Batch reverse geocode multiple coordinates
 */
export async function batchReverseGeocode(
  coordinates: Array<{ lat: number; lng: number }>,
  apiKey?: string
): Promise<Array<string | null>> {
  // Google Geocoding API doesn't support true batch requests, so we'll do them sequentially
  // with a small delay to avoid rate limiting
  const results: Array<string | null> = [];

  for (const coord of coordinates) {
    const address = await reverseGeocode(coord.lat, coord.lng, apiKey);
    results.push(address);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}







