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
  
  // Check if this is a Next.js public file (files uploaded via Next.js API route)
  // Next.js serves files from /public/ directory at the root URL
  // Next.js upload pattern: userId-timestamp.ext (e.g., cmiivoqu200009xioac2r1ov6-1764335337265.webp)
  // Backend upload pattern: profile-timestamp-random.ext (e.g., profile-1764335337265-123456789.webp)
  const filename = normalizedPath.split('/').pop() || '';
  // Backend files start with "profile-", Next.js files don't
  const isBackendFile = filename.startsWith('profile-');
  
  if (!isBackendFile && filename) {
    // This is a Next.js-uploaded file, serve it from Next.js
    if (typeof window !== 'undefined') {
      // Client-side: use relative URL (Next.js will serve from public/)
      return normalizedPath;
    } else {
      // Server-side: construct full URL using Next.js base URL
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';
      return `${baseUrl}${normalizedPath}`;
    }
  }
  
  // Otherwise, prepend the backend base URL (for backend-uploaded files)
  const backendUrl = getBackendBaseUrl();
  const fullUrl = `${backendUrl}${normalizedPath}`;
  
  // Log for debugging (both dev and production)
  console.log('[getImageUrl]', {
    imagePath,
    backendUrl,
    fullUrl,
    isBackendFile,
    filename,
    hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    nodeEnv: process.env.NODE_ENV,
  });
  
  return fullUrl;
}

