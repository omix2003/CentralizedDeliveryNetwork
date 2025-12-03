import apiClient, { serverApiClient } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'AGENT' | 'PARTNER' | 'ADMIN';
    agentId?: string;
    partnerId?: string;
  };
  token: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'AGENT' | 'PARTNER' | 'ADMIN';
}

// Helper function to get the appropriate client (server or client)
const getApiClient = () => {
  // Use server client if we're on the server side
  if (typeof window === 'undefined') {
    return serverApiClient;
  }
  return apiClient;
};

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const client = getApiClient();
      const baseURL = client.defaults.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      console.log('[API] Attempting login to:', `${baseURL}/auth/login`);
      console.log('[API] Using client:', typeof window === 'undefined' ? 'serverApiClient' : 'apiClient');
      
      const response = await client.post<AuthResponse>('/auth/login', credentials);
      
      console.log('[API] Login response status:', response.status);
      console.log('[API] Response data keys:', Object.keys(response.data || {}));
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      return response.data;
    } catch (error: any) {
      // Re-throw with more context
      if (error.response) {
        // Backend responded with error
        const status = error.response.status;
        const message = error.response.data?.error || error.response.data?.message || 'Login failed';
        console.error('Backend error response:', {
          status,
          data: error.response.data,
          message
        });
        throw new Error(message);
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response from backend:', error.request);
        throw new Error('Cannot connect to backend server. Please make sure it is running on port 5000.');
      } else {
        // Error setting up request
        const errorMsg = error?.message || String(error) || 'An error occurred during login';
        console.error('Request setup error:', errorMsg);
        throw new Error(errorMsg);
      }
    }
  },
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const client = getApiClient();
      const baseURL = client.defaults.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      // Validate that we have a proper baseURL (not empty or relative)
      if (!baseURL || baseURL.startsWith('/') || !baseURL.startsWith('http')) {
        const errorMsg = `Invalid API URL configuration. NEXT_PUBLIC_API_URL is not set or invalid. Current value: ${baseURL || 'undefined'}. Please set NEXT_PUBLIC_API_URL in your environment variables.`;
        console.error('[API]', errorMsg);
        throw new Error('Backend API URL is not configured. Please contact support.');
      }
      
      console.log('[API] Attempting registration to:', `${baseURL}/auth/register`);
      console.log('[API] Using client:', typeof window === 'undefined' ? 'serverApiClient' : 'apiClient');
      
      const response = await client.post<AuthResponse>('/auth/register', data);
      
      console.log('[API] Registration response status:', response.status);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // Backend responded with error
        const status = error.response.status;
        const message = error.response.data?.error || error.response.data?.message || 'Registration failed';
        console.error('[API] Backend error response:', {
          status,
          data: error.response.data,
          message,
          url: error.config?.url,
          baseURL: error.config?.baseURL
        });
        throw new Error(message);
      } else if (error.request) {
        // Request was made but no response received
        const requestURL = error.config?.url || '/auth/register';
        const requestBaseURL = error.config?.baseURL || 'unknown';
        console.error('[API] No response from backend:', {
          url: requestURL,
          baseURL: requestBaseURL,
          fullURL: `${requestBaseURL}${requestURL}`
        });
        throw new Error(`Cannot connect to backend server at ${requestBaseURL}. Please make sure the backend is running and NEXT_PUBLIC_API_URL is set correctly.`);
      } else {
        // Error setting up request
        const errorMsg = error?.message || String(error) || 'An error occurred during registration';
        console.error('[API] Request setup error:', errorMsg);
        throw new Error(errorMsg);
      }
    }
  },

  uploadProfilePicture: async (file: File): Promise<{ url: string }> => {
    try {
      const client = getApiClient();
      const formData = new FormData();
      formData.append('file', file);

      // Don't set Content-Type header - let the browser set it with the proper boundary
      // The API client interceptor already handles FormData correctly
      const response = await client.post<{ url: string; message: string }>('/auth/profile-picture', formData);
      
      return { url: response.data.url };
    } catch (error: any) {
      console.error('Profile picture upload error:', error);
      if (error.response) {
        const message = error.response.data?.error || error.response.data?.message || 'Profile picture upload failed';
        console.error('Upload error response:', error.response.data);
        throw new Error(message);
      } else if (error.request) {
        throw new Error('Cannot connect to backend server. Please make sure it is running.');
      } else {
        throw new Error(error.message || 'An error occurred during profile picture upload');
      }
    }
  },
};


