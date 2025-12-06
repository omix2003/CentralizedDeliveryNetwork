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

export interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  createdAt: string;
  order?: { id: string; status: string };
}

export interface WalletPayout {
  id: string;
  agentId: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  paymentMethod: string | null;
  bankAccount: string | null;
  upiId: string | null;
  transactionId: string | null;
  processedAt: string | null;
  createdAt: string;
  agent?: {
    id: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  };
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

  // Support Tickets
  async getSupportTickets(params?: {
    status?: string;
    issueType?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get('/admin/support/tickets', { params });
    return response.data;
  },

  async getSupportTicketDetails(id: string) {
    const response = await apiClient.get(`/admin/support/tickets/${id}`);
    return response.data;
  },

  async updateTicketStatus(id: string, status: string, adminNotes?: string) {
    const response = await apiClient.put(`/admin/support/tickets/${id}/status`, { 
      status,
      adminNotes,
    });
    return response.data;
  },

  async resolveTicket(id: string, adminNotes?: string) {
    const response = await apiClient.post(`/admin/support/tickets/${id}/resolve`, {
      adminNotes,
    });
    return response.data;
  },

  // Analytics
  async getAnalyticsOverview(startDate?: string, endDate?: string) {
    const response = await apiClient.get('/admin/analytics/overview', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  async getRevenueAnalytics(startDate?: string, endDate?: string, groupBy?: 'day' | 'week' | 'month') {
    const response = await apiClient.get('/admin/analytics/revenue', {
      params: { startDate, endDate, groupBy },
    });
    return response.data;
  },

  async getPerformanceAnalytics(startDate?: string, endDate?: string) {
    const response = await apiClient.get('/admin/analytics/performance', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Settings
  async getSettings() {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  async updateSettings(settings: {
    system?: any;
    notifications?: any;
    delivery?: any;
    fees?: any;
  }) {
    const response = await apiClient.put('/admin/settings', settings);
    return response.data;
  },

  // Wallet & Payouts
  async getAdminWallet(): Promise<{
    balance: number;
    totalEarned: number;
    totalPaidOut: number;
    totalDeposited: number;
  }> {
    const response = await apiClient.get('/admin/wallet');
    return response.data;
  },

  async getAdminWalletTransactions(page: number = 1, limit: number = 20): Promise<{
    transactions: WalletTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/admin/wallet/transactions', {
      params: { page, limit },
    });
    return response.data;
  },

  async getAllPayouts(status?: string, page: number = 1, limit: number = 20): Promise<{
    payouts: WalletPayout[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiClient.get('/admin/payouts', {
      params: { status, page, limit },
    });
    return response.data;
  },

  async getAgentsReadyForPayout(): Promise<{
    weekly: Array<{ agentId: string; balance: number; nextPayoutDate: string | null; agentName: string }>;
    monthly: Array<{ agentId: string; balance: number; nextPayoutDate: string | null; agentName: string }>;
  }> {
    const response = await apiClient.get('/admin/payouts/ready');
    return response.data;
  },

  async processPayout(data: {
    agentId: string;
    paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'MOBILE_MONEY';
    bankAccount?: string;
    upiId?: string;
    weekStart?: string;
  }): Promise<{ message: string; payout: WalletPayout }> {
    const response = await apiClient.post('/admin/payouts/process', data);
    return response.data;
  },

  async processAllWeeklyPayouts(paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'MOBILE_MONEY' = 'BANK_TRANSFER'): Promise<{
    totalProcessed: number;
    totalFailed: number;
    results: Array<{ success: boolean; agentId: string; payoutId?: string; error?: string }>;
  }> {
    const response = await apiClient.post('/admin/payouts/process-all-weekly', { paymentMethod });
    return response.data;
  },

  async processAllMonthlyPayouts(paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'MOBILE_MONEY' = 'BANK_TRANSFER'): Promise<{
    message: string;
    totalProcessed: number;
    totalFailed: number;
    results: Array<{ success: boolean; agentId: string; payoutId?: string; error?: string }>;
  }> {
    const response = await apiClient.post('/admin/payouts/process-all-monthly', { paymentMethod });
    return response.data;
  },

  // Sync
  async syncWalletAndRevenue(): Promise<{
    message: string;
    status: string;
  }> {
    const response = await apiClient.post('/admin/sync/wallet-revenue');
    return response.data;
  },
};

