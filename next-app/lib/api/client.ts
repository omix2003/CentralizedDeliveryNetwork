import axios from 'axios';
import { getSession } from 'next-auth/react';

// Validate and normalize API URL
const getApiBaseURL = () => {
  const envURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  
  // Ensure the URL ends with /api
  if (envURL && !envURL.endsWith('/api')) {
    // If it doesn't end with /api, add it
    const normalized = envURL.endsWith('/') ? `${envURL}api` : `${envURL}/api`;
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn(`[API Client] NEXT_PUBLIC_API_URL should end with '/api'. Normalized: ${normalized}`);
    }
    return normalized;
  }
  
  return envURL;
};

const apiClient = axios.create({
  baseURL: getApiBaseURL(),
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
      const baseURL = error.config?.baseURL || getApiBaseURL();
      const url = error.config?.url || '';
      const fullURL = `${baseURL}${url}`;
      
      const errorCode = error.code || (error as any).code;
      const errorMessage = error.message || (error as any).message || 'Unknown network error';
      
      let userFriendlyMessage = 'Network Error';
      if (errorCode === 'ECONNREFUSED' || errorMessage === 'Network Error' || errorMessage.includes('Failed to fetch')) {
        userFriendlyMessage = `Cannot connect to backend server at ${baseURL}. Please make sure the backend server is running and NEXT_PUBLIC_API_URL is set correctly.`;
      } else if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNABORTED') {
        userFriendlyMessage = `Request to ${fullURL} timed out after 30 seconds. The backend server may be sleeping (Render free tier) or slow to respond. Try again in a few seconds.`;
      } else if (errorMessage) {
        userFriendlyMessage = `Network error: ${errorMessage}`;
      }
      
      // Create a more informative error
      const networkError = new Error(userFriendlyMessage);
      (networkError as any).isNetworkError = true;
      (networkError as any).originalError = error;
      (networkError as any).url = fullURL;
      (networkError as any).code = errorCode;
      
      console.error('[API Client] Network Error:', {
        message: userFriendlyMessage,
        url: fullURL,
        baseURL: baseURL,
        code: errorCode,
        originalError: errorMessage,
        errorType: error.constructor?.name,
        error: error,
      });
      
      return Promise.reject(networkError);
    }
    
    // Handle 401 Unauthorized - token might be expired or invalid
    if (error.response?.status === 401) {
      // In development, log helpful error message
      if (process.env.NODE_ENV === 'development') {
        console.error('Authentication failed. Redirecting to login...');
      }
      
      // Clear session and redirect to login
      if (typeof window !== 'undefined') {
        // Clear auth-related storage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('nextauth.') || key.startsWith('auth.'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        
        // Prevent back-button navigation
        window.history.replaceState(null, '', '/login');
        
        // Redirect to login page
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Server-side API client (no interceptor, no getSession)
export const serverApiClient = axios.create({
  baseURL: getApiBaseURL(),
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


