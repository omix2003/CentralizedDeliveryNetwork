import apiClient from './client';

export interface AdminMetrics {
  totalAgents: number;
  totalPartners: number;
  totalOrders: number;
  activeAgents: number;
  onlineAgents: number;
  onTripAgents: number;
  todayOrders: number;
  thisMonthOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activePartners: number;
}

export interface Agent {
  id: string;
  userId: string;
  vehicleType: string;
  status: string;
  rating: number | null;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  acceptanceRate: number;
  currentOrderId: string | null;
  isApproved: boolean;
  isBlocked: boolean;
  blockedReason: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lastOnlineAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    profilePicture: string | null;
  };
}

export interface Partner {
  id: string;
  userId: string;
  companyName: string;
  apiKey: string;
  webhookUrl: string | null;
  isActive: boolean;
  city: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    profilePicture: string | null;
  };
  _count?: {
    orders: number;
  };
}

export interface Order {
  id: string;
  partnerId: string;
  agentId: string | null;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  payoutAmount: number;
  priority: string | null;
  status: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  estimatedDuration: number | null;
  actualDuration: number | null;
  createdAt: string;
  updatedAt: string;
  partner?: Partner;
  agent?: Agent;
}

export const adminApi = {
  // Metrics
  async getOverview(): Promise<AdminMetrics> {
      const response = await apiClient.get('/admin/metrics/overview');
    return response.data;
  },

  async getOrderMetrics(startDate?: string, endDate?: string) {
      const response = await apiClient.get('/admin/metrics/orders', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  async getAgentMetrics() {
      const response = await apiClient.get('/admin/metrics/agents');
    return response.data;
  },

  async getPartnerMetrics() {
      const response = await apiClient.get('/admin/metrics/partners');
    return response.data;
  },

  // Agents
  async getAgents(params?: {
    status?: string;
    isApproved?: boolean;
    isBlocked?: boolean;
    city?: string;
    vehicleType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
      const response = await apiClient.get('/admin/agents', { params });
    return response.data;
  },

  async getAgentDetails(id: string) {
      const response = await apiClient.get(`/admin/agents/${id}`);
    return response.data;
  },

  async getAgentLocations() {
      const response = await apiClient.get('/admin/agents/locations');
    return response.data;
  },

  async approveAgent(id: string) {
      const response = await apiClient.post(`/admin/agents/${id}/approve`);
    return response.data;
  },

  async blockAgent(id: string, reason?: string) {
      const response = await apiClient.post(`/admin/agents/${id}/block`, {
      reason,
    });
    return response.data;
  },

  async unblockAgent(id: string) {
    const response = await apiClient.post(`/admin/agents/${id}/unblock`);
    return response.data;
  },

  async deleteAgent(id: string) {
    const response = await apiClient.delete(`/admin/agents/${id}`);
    return response.data;
  },

  // Partners
  async getPartners(params?: {
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
      const response = await apiClient.get('/admin/partners', { params });
    return response.data;
  },

  async getPartnerDetails(id: string) {
      const response = await apiClient.get(`/admin/partners/${id}`);
    return response.data;
  },

  async deletePartner(id: string) {
    const response = await apiClient.delete(`/admin/partners/${id}`);
    return response.data;
  },

  // Orders
  async getOrders(params?: {
    status?: string;
    partnerId?: string;
    agentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
      const response = await apiClient.get('/admin/orders', { params });
    return response.data;
  },

  async getOrderDetails(id: string) {
      const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data;
  },

  async reassignOrder(id: string, agentId?: string) {
      const response = await apiClient.post(`/admin/orders/${id}/reassign`, {
      agentId,
    });
    return response.data;
  },

  async cancelOrder(id: string, reason?: string) {
      const response = await apiClient.post(`/admin/orders/${id}/cancel`, {
      reason,
    });
    return response.data;
  },

  // Activity
  async getRecentActivity(limit?: number) {
      const response = await apiClient.get('/admin/activity', {
      params: { limit },
    });
    return response.data;
  },

  // KYC Verification
  async getPendingKYC(params?: { page?: number; limit?: number }) {
    const response = await apiClient.get('/admin/kyc/pending', { params });
    return response.data;
  },

  async getAgentDocuments(agentId: string) {
    const response = await apiClient.get(`/admin/agents/${agentId}/documents`);
    return response.data;
  },

  async verifyDocument(documentId: string, notes?: string) {
    const response = await apiClient.post(`/admin/documents/${documentId}/verify`, {
      notes,
    });
    return response.data;
  },

  async rejectDocument(documentId: string, reason: string) {
    const response = await apiClient.post(`/admin/documents/${documentId}/reject`, {
      reason,
    });
    return response.data;
  },

  async verifyAgentKYC(agentId: string, notes?: string) {
    const response = await apiClient.post(`/admin/agents/${agentId}/verify-kyc`, {
      notes,
    });
    return response.data;
  },
};

