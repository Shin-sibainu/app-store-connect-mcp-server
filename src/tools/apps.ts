import { z } from 'zod';
import { AppStoreConnectClient } from '../client.js';
import { App, AppVersion, Build } from '../types.js';

// Input schemas
export const listAppsSchema = z.object({
  limit: z.number().min(1).max(200).optional().describe('Number of apps to return (max 200)'),
  sort: z.enum(['name', '-name', 'bundleId', '-bundleId']).optional().describe('Sort order'),
});

export const getAppSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
  includeVersions: z.boolean().optional().describe('Include app versions in response'),
});

export const listAppVersionsSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
  platform: z.enum(['IOS', 'MAC_OS', 'TV_OS', 'VISION_OS']).optional().describe('Filter by platform'),
  limit: z.number().min(1).max(200).optional().describe('Number of versions to return'),
});

export const listBuildsSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
  version: z.string().optional().describe('Filter by version string'),
  processingState: z.enum(['PROCESSING', 'FAILED', 'INVALID', 'VALID']).optional().describe('Filter by processing state'),
  limit: z.number().min(1).max(200).optional().describe('Number of builds to return'),
});

// Tool implementations
export async function listApps(
  client: AppStoreConnectClient,
  input: z.infer<typeof listAppsSchema>
): Promise<{ apps: App[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }
  if (input.sort) {
    params['sort'] = input.sort;
  }

  const response = await client.get<App[]>('/apps', params);
  
  return {
    apps: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function getApp(
  client: AppStoreConnectClient,
  input: z.infer<typeof getAppSchema>
): Promise<{ app: App; versions?: AppVersion[] }> {
  const params: Record<string, string> = {};
  
  if (input.includeVersions) {
    params['include'] = 'appStoreVersions';
  }

  const response = await client.get<App>(`/apps/${input.appId}`, params);
  
  // If versions were included, they'll be in the 'included' array
  const versions = input.includeVersions && response.included
    ? (response.included as AppVersion[]).filter(item => item.type === 'appStoreVersions')
    : undefined;

  return {
    app: response.data as App,
    versions,
  };
}

export async function listAppVersions(
  client: AppStoreConnectClient,
  input: z.infer<typeof listAppVersionsSchema>
): Promise<{ versions: AppVersion[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.platform) {
    params['filter[platform]'] = input.platform;
  }
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }

  const response = await client.get<AppVersion[]>(
    `/apps/${input.appId}/appStoreVersions`,
    params
  );
  
  return {
    versions: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function listBuilds(
  client: AppStoreConnectClient,
  input: z.infer<typeof listBuildsSchema>
): Promise<{ builds: Build[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.version) {
    params['filter[version]'] = input.version;
  }
  if (input.processingState) {
    params['filter[processingState]'] = input.processingState;
  }
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }

  const response = await client.get<Build[]>(
    `/apps/${input.appId}/builds`,
    params
  );
  
  return {
    builds: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

// Tool definitions for MCP
export const appsTools = [
  {
    name: 'list_apps',
    description: 'List all apps in your App Store Connect account. Returns app name, bundle ID, SKU, and other metadata.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Number of apps to return (max 200)',
          minimum: 1,
          maximum: 200,
        },
        sort: {
          type: 'string',
          description: 'Sort order',
          enum: ['name', '-name', 'bundleId', '-bundleId'],
        },
      },
    },
  },
  {
    name: 'get_app',
    description: 'Get detailed information about a specific app, optionally including its versions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        includeVersions: {
          type: 'boolean',
          description: 'Include app versions in response',
        },
      },
      required: ['appId'],
    },
  },
  {
    name: 'list_app_versions',
    description: 'List all App Store versions for a specific app. Shows version string, platform, release state, and dates.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        platform: {
          type: 'string',
          description: 'Filter by platform',
          enum: ['IOS', 'MAC_OS', 'TV_OS', 'VISION_OS'],
        },
        limit: {
          type: 'number',
          description: 'Number of versions to return',
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['appId'],
    },
  },
  {
    name: 'list_builds',
    description: 'List all builds for a specific app. Shows build version, upload date, processing state, and more.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        version: {
          type: 'string',
          description: 'Filter by version string',
        },
        processingState: {
          type: 'string',
          description: 'Filter by processing state',
          enum: ['PROCESSING', 'FAILED', 'INVALID', 'VALID'],
        },
        limit: {
          type: 'number',
          description: 'Number of builds to return',
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['appId'],
    },
  },
];

