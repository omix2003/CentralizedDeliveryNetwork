import apiClient from './client';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// NOTIFICATIONS FEATURE DISABLED
// All notification API calls return empty responses
export const notificationApi = {
  getNotifications: async (unreadOnly: boolean = false, limit: number = 50): Promise<NotificationsResponse> => {
    // Notifications disabled - return empty response
    return {
      notifications: [],
      unreadCount: 0,
    };
    // const response = await apiClient.get<NotificationsResponse>('/notifications', {
    //   params: {
    //     unreadOnly,
    //     limit,
    //   },
    // });
    // return response.data;
  },

  markAsRead: async (notificationId: string): Promise<{ message: string }> => {
    // Notifications disabled - return success without action
    return { message: 'Notification marked as read' };
    // const response = await apiClient.put<{ message: string }>(`/notifications/${notificationId}/read`);
    // return response.data;
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    // Notifications disabled - return success without action
    return { message: 'All notifications marked as read' };
    // const response = await apiClient.put<{ message: string }>('/notifications/read-all');
    // return response.data;
  },
};


