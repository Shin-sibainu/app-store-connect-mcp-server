import { z } from 'zod';
import { AppStoreConnectClient } from '../client.js';
import { DiagnosticSignature, PerfPowerMetric, Build } from '../types.js';

// Input schemas
export const getPerfPowerMetricsSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
  metricType: z.enum(['DISK', 'HANG', 'BATTERY', 'LAUNCH', 'MEMORY', 'ANIMATION', 'TERMINATION']).optional().describe('Filter by metric type'),
  platform: z.enum(['IOS', 'MAC_OS']).optional().describe('Filter by platform'),
});

export const getDiagnosticSignaturesSchema = z.object({
  buildId: z.string().describe('The build ID to get diagnostics for'),
  diagnosticType: z.enum(['DISK_WRITES', 'HANGS', 'LAUNCHES']).optional().describe('Filter by diagnostic type'),
  limit: z.number().min(1).max(200).optional().describe('Number of signatures to return'),
});

export const getDiagnosticLogsSchema = z.object({
  signatureId: z.string().describe('The diagnostic signature ID'),
  limit: z.number().min(1).max(200).optional().describe('Number of logs to return'),
});

export const getBetaAppLocalizationsSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
});

// Diagnostic log type
interface DiagnosticLog {
  type: 'diagnosticLogs';
  id: string;
  attributes: {
    diagnostic: string;
  };
}

// Tool implementations
export async function getPerfPowerMetrics(
  client: AppStoreConnectClient,
  input: z.infer<typeof getPerfPowerMetricsSchema>
): Promise<{ metrics: PerfPowerMetric[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.metricType) {
    params['filter[metricType]'] = input.metricType;
  }
  if (input.platform) {
    params['filter[platform]'] = input.platform;
  }

  const response = await client.get<PerfPowerMetric[]>(
    `/apps/${input.appId}/perfPowerMetrics`,
    params
  );
  
  return {
    metrics: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function getDiagnosticSignatures(
  client: AppStoreConnectClient,
  input: z.infer<typeof getDiagnosticSignaturesSchema>
): Promise<{ signatures: DiagnosticSignature[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.diagnosticType) {
    params['filter[diagnosticType]'] = input.diagnosticType;
  }
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }

  const response = await client.get<DiagnosticSignature[]>(
    `/builds/${input.buildId}/diagnosticSignatures`,
    params
  );
  
  return {
    signatures: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function getDiagnosticLogs(
  client: AppStoreConnectClient,
  input: z.infer<typeof getDiagnosticLogsSchema>
): Promise<{ logs: DiagnosticLog[] }> {
  const params: Record<string, string> = {};
  
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }

  const response = await client.get<DiagnosticLog[]>(
    `/diagnosticSignatures/${input.signatureId}/logs`,
    params
  );
  
  return {
    logs: Array.isArray(response.data) ? response.data : [response.data],
  };
}

// Get the latest builds for an app (useful for diagnostics)
export async function getLatestBuilds(
  client: AppStoreConnectClient,
  appId: string,
  limit: number = 10
): Promise<{ builds: Build[] }> {
  const params: Record<string, string> = {
    'filter[processingState]': 'VALID',
    'sort': '-uploadedDate',
    'limit': limit.toString(),
  };

  const response = await client.get<Build[]>(
    `/apps/${appId}/builds`,
    params
  );
  
  return {
    builds: Array.isArray(response.data) ? response.data : [response.data],
  };
}

// Metric type descriptions
export const METRIC_TYPES = {
  'DISK': {
    description: 'Disk write metrics - tracks how much data your app writes to disk',
    importance: 'High disk writes can drain battery and cause performance issues',
  },
  'HANG': {
    description: 'App hang metrics - tracks main thread hangs',
    importance: 'Hangs make your app feel unresponsive to users',
  },
  'BATTERY': {
    description: 'Battery usage metrics',
    importance: 'High battery usage leads to poor user experience and app uninstalls',
  },
  'LAUNCH': {
    description: 'App launch time metrics',
    importance: 'Slow launch times frustrate users and may cause them to abandon your app',
  },
  'MEMORY': {
    description: 'Memory usage metrics',
    importance: 'High memory usage can cause crashes and affect device performance',
  },
  'ANIMATION': {
    description: 'Animation and scrolling performance metrics',
    importance: 'Poor animation performance makes your app feel sluggish',
  },
  'TERMINATION': {
    description: 'App termination metrics - tracks how your app is terminated',
    importance: 'Understanding termination reasons helps identify crashes and issues',
  },
};

// Diagnostic type descriptions
export const DIAGNOSTIC_TYPES = {
  'DISK_WRITES': {
    description: 'Detailed information about disk write operations',
    actionable: 'Identify code paths causing excessive disk writes',
  },
  'HANGS': {
    description: 'Stack traces and context for main thread hangs',
    actionable: 'Find and fix code blocking the main thread',
  },
  'LAUNCHES': {
    description: 'Information about slow app launches',
    actionable: 'Optimize app startup code and reduce initial loading time',
  },
};

// Helper function to summarize diagnostic data
export function summarizeDiagnostics(signatures: DiagnosticSignature[]): {
  totalSignatures: number;
  byType: Record<string, { count: number; totalWeight: number }>;
  topIssues: { signature: string; weight: number; type: string }[];
} {
  const byType: Record<string, { count: number; totalWeight: number }> = {};
  const issues: { signature: string; weight: number; type: string }[] = [];

  for (const sig of signatures) {
    const type = sig.attributes.diagnosticType;
    
    if (!byType[type]) {
      byType[type] = { count: 0, totalWeight: 0 };
    }
    byType[type].count++;
    byType[type].totalWeight += sig.attributes.weight;

    issues.push({
      signature: sig.attributes.signature,
      weight: sig.attributes.weight,
      type,
    });
  }

  // Sort by weight and get top 10
  issues.sort((a, b) => b.weight - a.weight);
  const topIssues = issues.slice(0, 10);

  return {
    totalSignatures: signatures.length,
    byType,
    topIssues,
  };
}

// Tool definitions for MCP
export const diagnosticsTools = [
  {
    name: 'get_perf_power_metrics',
    description: 'Get performance and power metrics for an app. Includes battery usage, disk writes, memory usage, launch times, and more.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        metricType: {
          type: 'string',
          description: 'Filter by metric type',
          enum: ['DISK', 'HANG', 'BATTERY', 'LAUNCH', 'MEMORY', 'ANIMATION', 'TERMINATION'],
        },
        platform: {
          type: 'string',
          description: 'Filter by platform',
          enum: ['IOS', 'MAC_OS'],
        },
      },
      required: ['appId'],
    },
  },
  {
    name: 'get_diagnostic_signatures',
    description: 'Get diagnostic signatures for a specific build. Shows hang points, disk write issues, and launch problems with their relative weight/frequency.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        buildId: {
          type: 'string',
          description: 'The build ID to get diagnostics for',
        },
        diagnosticType: {
          type: 'string',
          description: 'Filter by diagnostic type',
          enum: ['DISK_WRITES', 'HANGS', 'LAUNCHES'],
        },
        limit: {
          type: 'number',
          description: 'Number of signatures to return',
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['buildId'],
    },
  },
  {
    name: 'get_diagnostic_logs',
    description: 'Get detailed diagnostic logs for a specific signature. Contains stack traces and detailed diagnostic information.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        signatureId: {
          type: 'string',
          description: 'The diagnostic signature ID',
        },
        limit: {
          type: 'number',
          description: 'Number of logs to return',
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['signatureId'],
    },
  },
  {
    name: 'list_metric_types',
    description: 'List available performance metric types and their descriptions.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'list_diagnostic_types',
    description: 'List available diagnostic types and their descriptions.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

