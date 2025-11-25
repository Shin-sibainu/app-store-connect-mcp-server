import { z } from 'zod';
import { AppStoreConnectClient } from '../client.js';
import { AnalyticsReportRequest, AnalyticsReport, AnalyticsReportInstance } from '../types.js';

// Input schemas
export const listAnalyticsReportRequestsSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
});

export const createAnalyticsReportRequestSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
  accessType: z.enum(['ONE_TIME_SNAPSHOT', 'ONGOING']).describe('Access type for the report'),
});

export const listAnalyticsReportsSchema = z.object({
  requestId: z.string().describe('The analytics report request ID'),
  category: z.enum(['APP_USAGE', 'APP_STORE_ENGAGEMENT', 'COMMERCE', 'FRAMEWORK_USAGE', 'PERFORMANCE']).optional().describe('Filter by report category'),
});

export const listAnalyticsReportInstancesSchema = z.object({
  reportId: z.string().describe('The analytics report ID'),
  granularity: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().describe('Filter by granularity'),
  limit: z.number().min(1).max(200).optional().describe('Number of instances to return'),
});

export const getAnalyticsReportSegmentsSchema = z.object({
  instanceId: z.string().describe('The analytics report instance ID'),
});

export const deleteAnalyticsReportRequestSchema = z.object({
  requestId: z.string().describe('The analytics report request ID to delete'),
});

// Tool implementations
export async function listAnalyticsReportRequests(
  client: AppStoreConnectClient,
  input: z.infer<typeof listAnalyticsReportRequestsSchema>
): Promise<{ requests: AnalyticsReportRequest[]; total: number }> {
  const response = await client.get<AnalyticsReportRequest[]>(
    `/apps/${input.appId}/analyticsReportRequests`
  );
  
  return {
    requests: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function createAnalyticsReportRequest(
  client: AppStoreConnectClient,
  input: z.infer<typeof createAnalyticsReportRequestSchema>
): Promise<{ request: AnalyticsReportRequest }> {
  const body = {
    data: {
      type: 'analyticsReportRequests',
      attributes: {
        accessType: input.accessType,
      },
      relationships: {
        app: {
          data: {
            type: 'apps',
            id: input.appId,
          },
        },
      },
    },
  };

  const response = await client.post<AnalyticsReportRequest>(
    '/analyticsReportRequests',
    body
  );

  return {
    request: response.data as AnalyticsReportRequest,
  };
}

export async function listAnalyticsReports(
  client: AppStoreConnectClient,
  input: z.infer<typeof listAnalyticsReportsSchema>
): Promise<{ reports: AnalyticsReport[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.category) {
    params['filter[category]'] = input.category;
  }

  const response = await client.get<AnalyticsReport[]>(
    `/analyticsReportRequests/${input.requestId}/reports`,
    params
  );
  
  return {
    reports: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function listAnalyticsReportInstances(
  client: AppStoreConnectClient,
  input: z.infer<typeof listAnalyticsReportInstancesSchema>
): Promise<{ instances: AnalyticsReportInstance[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.granularity) {
    params['filter[granularity]'] = input.granularity;
  }
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }

  const response = await client.get<AnalyticsReportInstance[]>(
    `/analyticsReports/${input.reportId}/instances`,
    params
  );
  
  return {
    instances: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function getAnalyticsReportSegments(
  client: AppStoreConnectClient,
  input: z.infer<typeof getAnalyticsReportSegmentsSchema>
): Promise<{ segments: AnalyticsSegment[] }> {
  const response = await client.get<AnalyticsSegment[]>(
    `/analyticsReportInstances/${input.instanceId}/segments`
  );
  
  return {
    segments: Array.isArray(response.data) ? response.data : [response.data],
  };
}

export async function deleteAnalyticsReportRequest(
  client: AppStoreConnectClient,
  input: z.infer<typeof deleteAnalyticsReportRequestSchema>
): Promise<{ success: boolean }> {
  await client.delete(`/analyticsReportRequests/${input.requestId}`);
  return { success: true };
}

// Analytics segment type
interface AnalyticsSegment {
  type: 'analyticsReportSegments';
  id: string;
  attributes: {
    checksum: string;
    sizeInBytes: number;
    url: string;
  };
}

// Download and parse analytics data
export async function downloadAnalyticsData(
  client: AppStoreConnectClient,
  segments: AnalyticsSegment[]
): Promise<string[]> {
  const results: string[] = [];
  
  for (const segment of segments) {
    const data = await client.downloadAnalyticsSegment(segment.attributes.url);
    results.push(data);
  }
  
  return results;
}

// Analytics report categories description
export const ANALYTICS_CATEGORIES = {
  'APP_USAGE': {
    description: 'App usage metrics including sessions, active devices, and crashes',
    reports: [
      'App Sessions',
      'Active Devices',
      'Installations',
      'Deletions',
      'App Crashes',
    ],
  },
  'APP_STORE_ENGAGEMENT': {
    description: 'App Store engagement metrics including impressions and page views',
    reports: [
      'App Store Impressions',
      'Product Page Views',
      'App Units',
      'In-App Purchases',
    ],
  },
  'COMMERCE': {
    description: 'Commerce metrics including proceeds, refunds, and subscriptions',
    reports: [
      'Sales',
      'Proceeds',
      'Refunds',
      'Subscription State',
      'Subscription Events',
    ],
  },
  'FRAMEWORK_USAGE': {
    description: 'Framework and API usage within your app',
    reports: [
      'API Usage',
      'Framework Adoption',
    ],
  },
  'PERFORMANCE': {
    description: 'App performance metrics',
    reports: [
      'Launch Time',
      'Battery Usage',
      'Memory Usage',
      'Disk Writes',
      'Hang Rate',
    ],
  },
};

// Tool definitions for MCP
export const analyticsTools = [
  {
    name: 'list_analytics_report_requests',
    description: 'List existing analytics report requests for an app. These requests enable access to analytics data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
      },
      required: ['appId'],
    },
  },
  {
    name: 'create_analytics_report_request',
    description: 'Create a new analytics report request for an app. This enables access to analytics data. Use ONE_TIME_SNAPSHOT for a single report, or ONGOING for continuous access.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        accessType: {
          type: 'string',
          description: 'Access type: ONE_TIME_SNAPSHOT or ONGOING',
          enum: ['ONE_TIME_SNAPSHOT', 'ONGOING'],
        },
      },
      required: ['appId', 'accessType'],
    },
  },
  {
    name: 'list_analytics_reports',
    description: 'List available analytics reports for a report request. Reports are categorized into APP_USAGE, APP_STORE_ENGAGEMENT, COMMERCE, FRAMEWORK_USAGE, and PERFORMANCE.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        requestId: {
          type: 'string',
          description: 'The analytics report request ID',
        },
        category: {
          type: 'string',
          description: 'Filter by report category',
          enum: ['APP_USAGE', 'APP_STORE_ENGAGEMENT', 'COMMERCE', 'FRAMEWORK_USAGE', 'PERFORMANCE'],
        },
      },
      required: ['requestId'],
    },
  },
  {
    name: 'list_analytics_report_instances',
    description: 'List instances (snapshots) of an analytics report. Each instance contains data for a specific time period.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        reportId: {
          type: 'string',
          description: 'The analytics report ID',
        },
        granularity: {
          type: 'string',
          description: 'Filter by time granularity',
          enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
        },
        limit: {
          type: 'number',
          description: 'Number of instances to return',
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['reportId'],
    },
  },
  {
    name: 'get_analytics_report_segments',
    description: 'Get downloadable segments for an analytics report instance. Each segment contains actual report data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instanceId: {
          type: 'string',
          description: 'The analytics report instance ID',
        },
      },
      required: ['instanceId'],
    },
  },
  {
    name: 'download_analytics_data',
    description: 'Download and parse analytics data from report segments.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instanceId: {
          type: 'string',
          description: 'The analytics report instance ID to download data from',
        },
      },
      required: ['instanceId'],
    },
  },
  {
    name: 'delete_analytics_report_request',
    description: 'Delete an analytics report request.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        requestId: {
          type: 'string',
          description: 'The analytics report request ID to delete',
        },
      },
      required: ['requestId'],
    },
  },
  {
    name: 'list_analytics_categories',
    description: 'List available analytics report categories and their descriptions.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

