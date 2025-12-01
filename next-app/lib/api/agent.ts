import apiClient from './client';

export interface AgentProfile {
  id: string;
  status: string;
  vehicleType: string;
  city?: string;
  state?: string;
  pincode?: string;
  isApproved: boolean;
  rating?: number;
  totalOrders: number;
  completedOrders: number;
  acceptanceRate: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  documents: AgentDocument[];
}

export interface AgentDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  verified: boolean;
  uploadedAt: string;
}

export interface UpdateProfileData {
  city?: string;
  state?: string;
  pincode?: string;
  vehicleType?: 'BIKE' | 'SCOOTER' | 'CAR' | 'BICYCLE';
}

export const agentApi = {
  getProfile: async (): Promise<AgentProfile> => {
    const response = await apiClient.get<AgentProfile>('/agent/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<AgentProfile> => {
    const response = await apiClient.put<AgentProfile>('/agent/profile', data);
    return response.data;
  },

  getDocuments: async (): Promise<AgentDocument[]> => {
    const response = await apiClient.get<AgentDocument[]>('/agent/documents');
    return response.data;
  },

  uploadDocument: async (file: File, documentType: string): Promise<AgentDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const response = await apiClient.post<AgentDocument>('/agent/documents', formData);
    return response.data;
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await apiClient.delete(`/agent/documents/${documentId}`);
  },

  updateLocation: async (latitude: number, longitude: number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/agent/location', {
      latitude,
      longitude,
    });
    return response.data;
  },

  updateStatus: async (status: 'OFFLINE' | 'ONLINE' | 'ON_TRIP'): Promise<{ id: string; status: string }> => {
    const response = await apiClient.post<{ id: string; status: string }>('/agent/status', {
      status,
    });
    return response.data;
  },

  getAvailableOrders: async (): Promise<AvailableOrder[]> => {
    const response = await apiClient.get<AvailableOrder[]>('/agent/orders');
    return response.data;
  },

  acceptOrder: async (orderId: string): Promise<{ id: string; status: string; message: string }> => {
    const response = await apiClient.post<{ id: string; status: string; message: string }>(`/agent/orders/${orderId}/accept`);
    return response.data;
  },

  rejectOrder: async (orderId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/agent/orders/${orderId}/reject`);
    return response.data;
  },

  updateOrderStatus: async (
    orderId: string,
    status: 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED',
    cancellationReason?: string
  ): Promise<{ id: string; status: string; message: string }> => {
    const response = await apiClient.put<{ id: string; status: string; message: string }>(`/agent/orders/${orderId}/status`, {
      status,
      cancellationReason,
    });
    return response.data;
  },

  getMyOrders: async (status?: string): Promise<AgentOrder[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get<AgentOrder[]>('/agent/my-orders', { params });
    return response.data;
  },

  getOrderDetails: async (orderId: string): Promise<AgentOrder> => {
    const response = await apiClient.get<AgentOrder>(`/agent/orders/${orderId}`);
    return response.data;
  },

  getMetrics: async (): Promise<AgentMetrics> => {
    const response = await apiClient.get<AgentMetrics>('/agent/metrics');
    return response.data;
  },
};

export interface AgentMetrics {
  todayOrders: number;
  yesterdayOrders: number;
  ordersChange: number;
  monthlyEarnings: number;
  lastMonthEarnings: number;
  earningsChange: number;
  activeOrders: number;
  completedOrders: number;
  totalOrders: number;
  cancelledOrders: number;
  acceptanceRate: number;
  rating: number | null;
  thisMonthOrders: number;
}

export interface AvailableOrder {
  id: string;
  trackingNumber: string;
  status: string;
  pickup: {
    latitude: number;
    longitude: number;
  };
  dropoff: {
    latitude: number;
    longitude: number;
  };
  payout: number;
  priority: string;
  estimatedDuration?: number;
  createdAt: string;
  partner: {
    name: string;
    companyName: string;
  };
}

export interface AgentOrder {
  id: string;
  trackingNumber: string;
  status: string;
  pickup: {
    latitude: number;
    longitude: number;
  };
  dropoff: {
    latitude: number;
    longitude: number;
  };
  payout: number;
  priority: string;
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  partner: {
    id: string;
    name: string;
    companyName: string;
    phone: string;
    email: string;
  };
}

