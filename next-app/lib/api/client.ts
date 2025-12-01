import axios from 'axios';
import { getSession } from 'next-auth/react';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased for database queries)
});

// Add auth token to requests if available (client-side only)
apiClient.interceptors.request.use(async (config) => {
  // Only use getSession() on the client side
  if (typeof window !== 'undefined') {
    try {
      const session = await getSession();
      // Access token from session (it's stored as accessToken in the session object)
      const token = session?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Log warning in development to help debug
        if (process.env.NODE_ENV === 'development') {
          console.warn('No access token found in session for API request to:', config.url);
        }
      }
    } catch (error) {
      // Silently fail if getSession() is not available (server-side)
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not get session for API request:', error);
      }
    }
  }
  
  // For FormData, don't set Content-Type - let browser set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      const baseURL = error.config?.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const url = error.config?.url || '';
      const fullURL = `${baseURL}${url}`;
      
      let errorMessage = 'Network Error';
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
        errorMessage = `Cannot connect to backend server at ${baseURL}. Please make sure the backend server is running on port 5000.`;
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = `Request to ${fullURL} timed out. The server may be slow or unavailable.`;
      } else if (error.message) {
        errorMessage = `Network error: ${error.message}`;
      }
      
      // Create a more informative error
      const networkError = new Error(errorMessage);
      (networkError as any).isNetworkError = true;
      (networkError as any).originalError = error;
      (networkError as any).url = fullURL;
      
      console.error('[API Client] Network Error:', {
        message: errorMessage,
        url: fullURL,
        code: error.code,
        originalError: error.message
      });
      
      return Promise.reject(networkError);
    }
    
    // Handle 401 Unauthorized - token might be expired or invalid
    if (error.response?.status === 401) {
      // In development, log helpful error message
      if (process.env.NODE_ENV === 'development') {
        console.error('Authentication failed. Please login again.');
      }
      // Could redirect to login page here if needed
    }
    
    return Promise.reject(error);
  }
);

// Server-side API client (no interceptor, no getSession)
export const serverApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased for database queries)
});

// Add request logging for server client in development
if (process.env.NODE_ENV === 'development') {
  serverApiClient.interceptors.request.use(
    (config) => {
      console.log('[SERVER API] Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
      });
      return config;
    },
    (error) => {
      console.error('[SERVER API] Request error:', error);
      return Promise.reject(error);
    }
  );

  serverApiClient.interceptors.response.use(
    (response) => {
      console.log('[SERVER API] Response:', {
        status: response.status,
        url: response.config.url
      });
      return response;
    },
    (error) => {
      console.error('[SERVER API] Response error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      return Promise.reject(error);
    }
  );
}

export default apiClient;


