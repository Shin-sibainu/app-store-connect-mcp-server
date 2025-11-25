import { z } from 'zod';
import { AppStoreConnectClient } from '../client.js';
import { CustomerReview, CustomerReviewResponse } from '../types.js';

// Input schemas
export const listReviewsSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
  sort: z.enum(['rating', '-rating', 'createdDate', '-createdDate']).optional().describe('Sort order'),
  territory: z.string().optional().describe('Filter by territory code (e.g., USA, JPN)'),
  limit: z.number().min(1).max(200).optional().describe('Number of reviews to return'),
});

export const getReviewSchema = z.object({
  reviewId: z.string().describe('The customer review ID'),
});

export const respondToReviewSchema = z.object({
  reviewId: z.string().describe('The customer review ID to respond to'),
  responseBody: z.string().min(1).max(5970).describe('The response text (max 5970 characters)'),
});

export const deleteReviewResponseSchema = z.object({
  responseId: z.string().describe('The review response ID to delete'),
});

// Tool implementations
export async function listReviews(
  client: AppStoreConnectClient,
  input: z.infer<typeof listReviewsSchema>
): Promise<{ reviews: CustomerReview[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.sort) {
    params['sort'] = input.sort;
  }
  if (input.territory) {
    params['filter[territory]'] = input.territory;
  }
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }

  const response = await client.get<CustomerReview[]>(
    `/apps/${input.appId}/customerReviews`,
    params
  );
  
  return {
    reviews: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function getReview(
  client: AppStoreConnectClient,
  input: z.infer<typeof getReviewSchema>
): Promise<{ review: CustomerReview; response?: CustomerReviewResponse }> {
  const params: Record<string, string> = {
    include: 'response',
  };

  const result = await client.get<CustomerReview>(
    `/customerReviews/${input.reviewId}`,
    params
  );
  
  const reviewResponse = result.included?.find(
    (item: unknown) => (item as CustomerReviewResponse).type === 'customerReviewResponses'
  ) as CustomerReviewResponse | undefined;

  return {
    review: result.data as CustomerReview,
    response: reviewResponse,
  };
}

export async function respondToReview(
  client: AppStoreConnectClient,
  input: z.infer<typeof respondToReviewSchema>
): Promise<{ response: CustomerReviewResponse }> {
  const body = {
    data: {
      type: 'customerReviewResponses',
      attributes: {
        responseBody: input.responseBody,
      },
      relationships: {
        review: {
          data: {
            type: 'customerReviews',
            id: input.reviewId,
          },
        },
      },
    },
  };

  const result = await client.post<CustomerReviewResponse>(
    '/customerReviewResponses',
    body
  );

  return {
    response: result.data as CustomerReviewResponse,
  };
}

export async function deleteReviewResponse(
  client: AppStoreConnectClient,
  input: z.infer<typeof deleteReviewResponseSchema>
): Promise<{ success: boolean }> {
  await client.delete(`/customerReviewResponses/${input.responseId}`);
  return { success: true };
}

// Helper function to analyze review sentiment
export function analyzeReviewSentiment(reviews: CustomerReview[]): {
  averageRating: number;
  ratingDistribution: Record<number, number>;
  totalReviews: number;
  recentTrend: 'improving' | 'declining' | 'stable';
  territorySummary: Record<string, { count: number; avgRating: number }>;
} {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      totalReviews: 0,
      recentTrend: 'stable',
      territorySummary: {},
    };
  }

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const territorySummary: Record<string, { count: number; totalRating: number }> = {};
  
  let totalRating = 0;
  
  for (const review of reviews) {
    const rating = review.attributes.rating;
    totalRating += rating;
    ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    
    const territory = review.attributes.territory;
    if (!territorySummary[territory]) {
      territorySummary[territory] = { count: 0, totalRating: 0 };
    }
    territorySummary[territory].count++;
    territorySummary[territory].totalRating += rating;
  }

  // Calculate territory averages
  const territoryResult: Record<string, { count: number; avgRating: number }> = {};
  for (const [territory, data] of Object.entries(territorySummary)) {
    territoryResult[territory] = {
      count: data.count,
      avgRating: Number((data.totalRating / data.count).toFixed(2)),
    };
  }

  // Calculate trend (comparing first half vs second half of reviews by date)
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(a.attributes.createdDate).getTime() - new Date(b.attributes.createdDate).getTime()
  );
  const midpoint = Math.floor(sortedReviews.length / 2);
  const firstHalf = sortedReviews.slice(0, midpoint);
  const secondHalf = sortedReviews.slice(midpoint);
  
  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, r) => sum + r.attributes.rating, 0) / firstHalf.length
    : 0;
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, r) => sum + r.attributes.rating, 0) / secondHalf.length
    : 0;
  
  let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (secondHalfAvg - firstHalfAvg > 0.3) {
    recentTrend = 'improving';
  } else if (firstHalfAvg - secondHalfAvg > 0.3) {
    recentTrend = 'declining';
  }

  return {
    averageRating: Number((totalRating / reviews.length).toFixed(2)),
    ratingDistribution,
    totalReviews: reviews.length,
    recentTrend,
    territorySummary: territoryResult,
  };
}

// Tool definitions for MCP
export const reviewsTools = [
  {
    name: 'list_reviews',
    description: 'List customer reviews for an app. Shows rating, title, body, reviewer nickname, date, and territory.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        sort: {
          type: 'string',
          description: 'Sort order',
          enum: ['rating', '-rating', 'createdDate', '-createdDate'],
        },
        territory: {
          type: 'string',
          description: 'Filter by territory code (e.g., USA, JPN)',
        },
        limit: {
          type: 'number',
          description: 'Number of reviews to return',
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['appId'],
    },
  },
  {
    name: 'get_review',
    description: 'Get a specific customer review with its response (if any).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        reviewId: {
          type: 'string',
          description: 'The customer review ID',
        },
      },
      required: ['reviewId'],
    },
  },
  {
    name: 'respond_to_review',
    description: 'Respond to a customer review. Only one response per review is allowed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        reviewId: {
          type: 'string',
          description: 'The customer review ID to respond to',
        },
        responseBody: {
          type: 'string',
          description: 'The response text (max 5970 characters)',
          maxLength: 5970,
        },
      },
      required: ['reviewId', 'responseBody'],
    },
  },
  {
    name: 'delete_review_response',
    description: 'Delete a response to a customer review.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        responseId: {
          type: 'string',
          description: 'The review response ID to delete',
        },
      },
      required: ['responseId'],
    },
  },
  {
    name: 'analyze_reviews',
    description: 'Analyze customer reviews to get sentiment summary, rating distribution, and trends. Fetches reviews and provides statistical analysis.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        territory: {
          type: 'string',
          description: 'Filter by territory code (e.g., USA, JPN)',
        },
        limit: {
          type: 'number',
          description: 'Number of reviews to analyze (max 200)',
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['appId'],
    },
  },
];

