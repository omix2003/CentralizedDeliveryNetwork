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
    const params = status && status !== 'all' ? { status } : {};
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

  // Scanning endpoints
  scanBarcode: async (barcode: string) => {
    const response = await apiClient.post('/agent/scan/barcode', { barcode });
    return response.data;
  },

  scanQRCode: async (qrCode: string) => {
    const response = await apiClient.post('/agent/scan/qr', { qrCode });
    return response.data;
  },

  // Delivery verification endpoints
  generateVerification: async (orderId: string) => {
    const response = await apiClient.post(`/agent/orders/${orderId}/generate-verification`);
    return response.data;
  },

  verifyWithOTP: async (orderId: string, otp: string) => {
    const response = await apiClient.post(`/agent/orders/${orderId}/verify-otp`, { otp });
    return response.data;
  },

  verifyWithQR: async (orderId: string, qrCode: string) => {
    const response = await apiClient.post(`/agent/orders/${orderId}/verify-qr`, { qrCode });
    return response.data;
  },

  getVerification: async (orderId: string) => {
    const response = await apiClient.get(`/agent/orders/${orderId}/verification`);
    return response.data;
  },

  // Payment endpoints
  getPayments: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/agent/payments', { params });
    return response.data;
  },

  getPaymentSummary: async () => {
    const response = await apiClient.get('/agent/payments/summary');
    return response.data;
  },

  getPayrolls: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/agent/payrolls', { params });
    return response.data;
  },

  calculatePayroll: async (data: {
    periodStart: string;
    periodEnd: string;
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }) => {
    const response = await apiClient.post('/agent/payrolls/calculate', data);
    return response.data;
  },

  // Schedule endpoints
  setSchedule: async (data: {
    date: string;
    startTime?: string;
    endTime?: string;
    isAvailable?: boolean;
    notes?: string;
  }) => {
    const response = await apiClient.post('/agent/schedule', data);
    return response.data;
  },

  getSchedule: async (params: { startDate: string; endDate: string }) => {
    const response = await apiClient.get('/agent/schedule', { params });
    return response.data;
  },

  getCalendar: async (params: { viewType: 'MONTHLY' | 'WEEKLY'; startDate: string }) => {
    const response = await apiClient.get('/agent/calendar', { params });
    return response.data;
  },

  checkAvailability: async (params: { date: string; time?: string }) => {
    const response = await apiClient.get('/agent/schedule/availability', { params });
    return response.data;
  },

  // Wallet & Payouts
  getWallet: async () => {
    const response = await apiClient.get('/agent/wallet');
    return response.data;
  },

  getWalletTransactions: async (page: number = 1, limit: number = 20) => {
    const response = await apiClient.get('/agent/wallet/transactions', {
      params: { page, limit },
    });
    return response.data;
  },

  getPayouts: async (page: number = 1, limit: number = 20) => {
    const response = await apiClient.get('/agent/payouts', {
      params: { page, limit },
    });
    return response.data;
  },

  getSupportTickets: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/agent/support/tickets', { params });
    return response.data;
  },

  createSupportTicket: async (data: {
    orderId?: string;
    issueType: 'DELAY' | 'MISSING' | 'DAMAGE' | 'OTHER';
    description: string;
  }) => {
    const response = await apiClient.post('/agent/support/tickets', data);
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
  activeOrder?: {
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
    pickedUpAt?: string;
    assignedAt?: string;
    timing?: OrderTiming;
    partner: {
      name: string;
      companyName: string;
      phone: string;
    };
  } | null;
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

export interface OrderTiming {
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  isDelayed: boolean;
  elapsedTime: string | null;
  remainingTime: string | null;
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
  timing?: OrderTiming;
  barcode?: string;
  qrCode?: string;
  partner: {
    id: string;
    name: string;
    companyName: string;
    phone: string;
    email: string;
  };
}

export interface Payment {
  id: string;
  agentId: string;
  orderId: string;
  amount: number;
  paymentType: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  processedAt?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  order?: {
    id: string;
    status: string;
    deliveredAt?: string;
  };
}

export interface Payroll {
  id: string;
  agentId: string;
  periodStart: string;
  periodEnd: string;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  totalEarnings: number;
  totalOrders: number;
  basePay: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  status: 'PENDING' | 'PROCESSED' | 'PAID' | 'FAILED';
  processedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface AgentSchedule {
  id: string;
  agentId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarData {
  schedules: AgentSchedule[];
  deliveries: Array<{
    id: string;
    deliveredAt: string;
    payoutAmount: number;
    status: string;
  }>;
  period: {
    start: string;
    end: string;
    type: 'MONTHLY' | 'WEEKLY';
  };
}

export interface VerificationData {
  hasOtp: boolean;
  hasQrCode: boolean;
  expiresAt?: string;
  verifiedAt?: string;
  verificationMethod?: string;
  isExpired: boolean;
}

export interface PaymentSummary {
  today: { amount: number; count: number };
  week: { amount: number; count: number };
  month: { amount: number; count: number };
  pending: { amount: number; count: number };
}

