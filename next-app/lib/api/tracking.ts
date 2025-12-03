import apiClient from './client';

export interface TrackedOrder {
  id: string;
  trackingNumber: string;
  status: string;
  pickup: {
    latitude: number;
    longitude: number;
  } | null;
  dropoff: {
    latitude: number;
    longitude: number;
  } | null;
  priority: string;
  estimatedDuration?: number;
  actualDuration?: number;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  partner: {
    name: string;
    companyName: string;
  };
  agent?: {
    name: string;
    phone: string;
  } | null;
}

export const trackingApi = {
  trackOrder: async (orderId: string): Promise<TrackedOrder> => {
    const response = await apiClient.get<TrackedOrder>(`/public/orders/${orderId}/track`);
    return response.data;
  },
};

