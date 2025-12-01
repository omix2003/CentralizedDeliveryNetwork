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
      const response = await client.post<AuthResponse>('/auth/register', data);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const message = error.response.data?.error || error.response.data?.message || 'Registration failed';
        throw new Error(message);
      } else if (error.request) {
        throw new Error('Cannot connect to backend server. Please make sure it is running on port 5000.');
      } else {
        throw new Error(error.message || 'An error occurred during registration');
      }
    }
  },
};


