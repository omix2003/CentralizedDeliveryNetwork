/**
 * Get the backend base URL (without /api) for serving static files like images
 * Works in both client and server contexts
 */
export function getBackendBaseUrl(): string {
  // Try to get API URL from environment (works in both client and server)
  let apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Fallback for server-side if NEXT_PUBLIC_API_URL is not available
  if (!apiUrl && typeof window === 'undefined') {
    // Server-side: try to get from process.env directly
    apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  }
  
  // Final fallback
  if (!apiUrl) {
    apiUrl = 'http://localhost:5000/api';
  }
  
  // Remove /api suffix if present
  if (apiUrl.endsWith('/api')) {
    return apiUrl.slice(0, -4);
  }
  
  // Ensure no trailing slash
  return apiUrl.replace(/\/api$/, '').replace(/\/$/, '');
}

/**
 * Get the full URL for a profile picture or other uploaded file
 * @param imagePath - The relative path from the backend (e.g., /uploads/profiles/image.jpg)
 * @returns The full URL to the image
 */
export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  
  // If it's already a full URL (starts with http:// or https://), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Ensure imagePath starts with /
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  // Otherwise, prepend the backend base URL
  const backendUrl = getBackendBaseUrl();
  const fullUrl = `${backendUrl}${normalizedPath}`;
  
  // Log for debugging (both dev and production)
  console.log('[getImageUrl]', {
    imagePath,
    backendUrl,
    fullUrl,
    hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    nodeEnv: process.env.NODE_ENV,
  });
  
  return fullUrl;
}

