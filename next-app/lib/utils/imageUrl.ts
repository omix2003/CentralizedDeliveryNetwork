/**
 * Get the backend base URL (without /api) for serving static files like images
 */
export function getBackendBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  // Remove /api suffix if present
  if (apiUrl.endsWith('/api')) {
    return apiUrl.slice(0, -4);
  }
  return apiUrl.replace(/\/api$/, '');
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
  
  // Otherwise, prepend the backend base URL
  const backendUrl = getBackendBaseUrl();
  return `${backendUrl}${imagePath}`;
}

