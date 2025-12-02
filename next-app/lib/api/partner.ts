import apiClient from './client';

export interface PartnerProfile {
  id: string;
  companyName: string;
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface CreateOrderData {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  payoutAmount: number;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  estimatedDuration?: number;
}

export interface Order {
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
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt?: string;
  agent?: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    vehicleType?: string;
    rating?: number;
  } | null;
  partner?: {
    id: string;
    companyName: string;
  };
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

export const partnerApi = {
  getProfile: async (): Promise<PartnerProfile> => {
    const response = await apiClient.get<PartnerProfile>('/partner/profile');
    return response.data;
  },

  updateWebhook: async (webhookUrl: string): Promise<{ id: string; webhookUrl: string }> => {
    const response = await apiClient.put<{ id: string; webhookUrl: string }>('/partner/webhook', {
      webhookUrl,
    });
    return response.data;
  },

  regenerateApiKey: async (): Promise<{ id: string; apiKey: string; message: string }> => {
    const response = await apiClient.post<{ id: string; apiKey: string; message: string }>('/partner/regenerate-api-key');
    return response.data;
  },

  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post<Order>('/partner/orders', data);
    return response.data;
  },

  getOrders: async (params?: { status?: string | string[]; limit?: number; offset?: number }): Promise<OrdersResponse> => {
    const response = await apiClient.get<OrdersResponse>('/partner/orders', { params });
    return response.data;
  },

  getOrderDetails: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/partner/orders/${orderId}`);
    return response.data;
  },

  updateOrder: async (orderId: string, data: Partial<CreateOrderData>): Promise<Order> => {
    const response = await apiClient.put<Order>(`/partner/orders/${orderId}`, data);
    return response.data;
  },

  getDashboardMetrics: async (): Promise<{
    todayOrders: number;
    monthlyOrders: number;
    monthlyTrend: number;
    activeOrders: number;
    deliveryIssues: number;
    totalDeliveries: number;
  }> => {
    const response = await apiClient.get('/partner/dashboard');
    return response.data;
  },

  getAnalytics: async (params?: { startDate?: string; endDate?: string }): Promise<any> => {
    const response = await apiClient.get('/partner/analytics', { params });
    return response.data;
  },

  getSupportTickets: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/partner/support/tickets', { params });
    return response.data;
  },

  createSupportTicket: async (data: {
    orderId?: string;
    issueType: 'DELAY' | 'MISSING' | 'DAMAGE' | 'OTHER';
    description: string;
  }) => {
    const response = await apiClient.post('/partner/support/tickets', data);
    return response.data;
  },
};

