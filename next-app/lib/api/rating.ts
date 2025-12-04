import apiClient from './client';

export interface AgentRating {
  id: string;
  orderId: string;
  agentId: string;
  partnerId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
  updatedAt: string;
  partner?: {
    id: string;
    companyName: string;
    user: {
      name: string;
    };
  };
  order?: {
    id: string;
  };
}

export interface RatingResponse {
  message: string;
  rating: AgentRating;
}

export interface AgentRatingsResponse {
  ratings: AgentRating[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const ratingApi = {
  // Submit a rating for an agent
  submitRating: async (data: {
    orderId: string;
    rating: number; // 1-5
    comment?: string;
  }): Promise<RatingResponse> => {
    const response = await apiClient.post<RatingResponse>('/ratings', data);
    return response.data;
  },

  // Get all ratings for an agent
  getAgentRatings: async (
    agentId: string,
    params?: { page?: number; limit?: number }
  ): Promise<AgentRatingsResponse> => {
    const response = await apiClient.get<AgentRatingsResponse>(
      `/ratings/agent/${agentId}`,
      { params }
    );
    return response.data;
  },

  // Get rating for a specific order
  getOrderRating: async (orderId: string): Promise<{ rating: AgentRating }> => {
    const response = await apiClient.get<{ rating: AgentRating }>(
      `/ratings/order/${orderId}`
    );
    return response.data;
  },
};

