import { z } from 'zod';
import { AppStoreConnectClient } from '../client.js';
import { BetaTester } from '../types.js';

// Input schemas
export const listBetaTestersSchema = z.object({
  appId: z.string().optional().describe('Filter by app ID'),
  email: z.string().optional().describe('Filter by email'),
  firstName: z.string().optional().describe('Filter by first name'),
  lastName: z.string().optional().describe('Filter by last name'),
  limit: z.number().min(1).max(200).optional().describe('Number of testers to return'),
});

export const getBetaTesterSchema = z.object({
  testerId: z.string().describe('The beta tester ID'),
});

export const inviteBetaTesterSchema = z.object({
  email: z.string().email().describe('Email address of the tester'),
  firstName: z.string().optional().describe('First name of the tester'),
  lastName: z.string().optional().describe('Last name of the tester'),
  betaGroupIds: z.array(z.string()).describe('Beta group IDs to add the tester to'),
});

export const removeBetaTesterSchema = z.object({
  testerId: z.string().describe('The beta tester ID to remove'),
});

export const listBetaGroupsSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
});

export const createBetaGroupSchema = z.object({
  appId: z.string().describe('The App Store Connect app ID'),
  name: z.string().describe('Name of the beta group'),
  publicLinkEnabled: z.boolean().optional().describe('Enable public TestFlight link'),
  publicLinkLimit: z.number().optional().describe('Limit for public link signups'),
  feedbackEnabled: z.boolean().optional().describe('Enable feedback from testers'),
});

// Beta group type
interface BetaGroup {
  type: 'betaGroups';
  id: string;
  attributes: {
    name: string;
    createdDate: string;
    isInternalGroup: boolean;
    hasAccessToAllBuilds: boolean;
    publicLinkEnabled: boolean;
    publicLinkId?: string;
    publicLinkLimit?: number;
    publicLinkLimitEnabled: boolean;
    publicLink?: string;
    feedbackEnabled: boolean;
  };
}

// Tool implementations
export async function listBetaTesters(
  client: AppStoreConnectClient,
  input: z.infer<typeof listBetaTestersSchema>
): Promise<{ testers: BetaTester[]; total: number }> {
  const params: Record<string, string> = {};
  
  if (input.appId) {
    params['filter[apps]'] = input.appId;
  }
  if (input.email) {
    params['filter[email]'] = input.email;
  }
  if (input.firstName) {
    params['filter[firstName]'] = input.firstName;
  }
  if (input.lastName) {
    params['filter[lastName]'] = input.lastName;
  }
  if (input.limit) {
    params['limit'] = input.limit.toString();
  }

  const response = await client.get<BetaTester[]>('/betaTesters', params);
  
  return {
    testers: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function getBetaTester(
  client: AppStoreConnectClient,
  input: z.infer<typeof getBetaTesterSchema>
): Promise<{ tester: BetaTester }> {
  const response = await client.get<BetaTester>(`/betaTesters/${input.testerId}`);
  
  return {
    tester: response.data as BetaTester,
  };
}

export async function inviteBetaTester(
  client: AppStoreConnectClient,
  input: z.infer<typeof inviteBetaTesterSchema>
): Promise<{ tester: BetaTester }> {
  const body = {
    data: {
      type: 'betaTesters',
      attributes: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      relationships: {
        betaGroups: {
          data: input.betaGroupIds.map(id => ({
            type: 'betaGroups',
            id,
          })),
        },
      },
    },
  };

  const response = await client.post<BetaTester>('/betaTesters', body);

  return {
    tester: response.data as BetaTester,
  };
}

export async function removeBetaTester(
  client: AppStoreConnectClient,
  input: z.infer<typeof removeBetaTesterSchema>
): Promise<{ success: boolean }> {
  await client.delete(`/betaTesters/${input.testerId}`);
  return { success: true };
}

export async function listBetaGroups(
  client: AppStoreConnectClient,
  input: z.infer<typeof listBetaGroupsSchema>
): Promise<{ groups: BetaGroup[]; total: number }> {
  const params: Record<string, string> = {
    'filter[app]': input.appId,
  };

  const response = await client.get<BetaGroup[]>('/betaGroups', params);
  
  return {
    groups: Array.isArray(response.data) ? response.data : [response.data],
    total: response.meta?.paging?.total || (Array.isArray(response.data) ? response.data.length : 1),
  };
}

export async function createBetaGroup(
  client: AppStoreConnectClient,
  input: z.infer<typeof createBetaGroupSchema>
): Promise<{ group: BetaGroup }> {
  const body = {
    data: {
      type: 'betaGroups',
      attributes: {
        name: input.name,
        publicLinkEnabled: input.publicLinkEnabled ?? false,
        publicLinkLimit: input.publicLinkLimit,
        publicLinkLimitEnabled: input.publicLinkLimit !== undefined,
        feedbackEnabled: input.feedbackEnabled ?? true,
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

  const response = await client.post<BetaGroup>('/betaGroups', body);

  return {
    group: response.data as BetaGroup,
  };
}

// Helper function to summarize tester stats
export function summarizeTesterStats(testers: BetaTester[]): {
  total: number;
  byState: Record<string, number>;
  byInviteType: Record<string, number>;
} {
  const byState: Record<string, number> = {};
  const byInviteType: Record<string, number> = {};

  for (const tester of testers) {
    const state = tester.attributes.state;
    const inviteType = tester.attributes.inviteType;
    
    byState[state] = (byState[state] || 0) + 1;
    byInviteType[inviteType] = (byInviteType[inviteType] || 0) + 1;
  }

  return {
    total: testers.length,
    byState,
    byInviteType,
  };
}

// Tool definitions for MCP
export const testersTools = [
  {
    name: 'list_beta_testers',
    description: 'List TestFlight beta testers. Can filter by app, email, or name.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'Filter by app ID',
        },
        email: {
          type: 'string',
          description: 'Filter by email',
        },
        firstName: {
          type: 'string',
          description: 'Filter by first name',
        },
        lastName: {
          type: 'string',
          description: 'Filter by last name',
        },
        limit: {
          type: 'number',
          description: 'Number of testers to return',
          minimum: 1,
          maximum: 200,
        },
      },
    },
  },
  {
    name: 'get_beta_tester',
    description: 'Get details for a specific beta tester.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        testerId: {
          type: 'string',
          description: 'The beta tester ID',
        },
      },
      required: ['testerId'],
    },
  },
  {
    name: 'invite_beta_tester',
    description: 'Invite a new beta tester via email to one or more beta groups.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        email: {
          type: 'string',
          description: 'Email address of the tester',
        },
        firstName: {
          type: 'string',
          description: 'First name of the tester',
        },
        lastName: {
          type: 'string',
          description: 'Last name of the tester',
        },
        betaGroupIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Beta group IDs to add the tester to',
        },
      },
      required: ['email', 'betaGroupIds'],
    },
  },
  {
    name: 'remove_beta_tester',
    description: 'Remove a beta tester from TestFlight.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        testerId: {
          type: 'string',
          description: 'The beta tester ID to remove',
        },
      },
      required: ['testerId'],
    },
  },
  {
    name: 'list_beta_groups',
    description: 'List TestFlight beta groups for an app.',
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
    name: 'create_beta_group',
    description: 'Create a new TestFlight beta group.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store Connect app ID',
        },
        name: {
          type: 'string',
          description: 'Name of the beta group',
        },
        publicLinkEnabled: {
          type: 'boolean',
          description: 'Enable public TestFlight link',
        },
        publicLinkLimit: {
          type: 'number',
          description: 'Limit for public link signups',
        },
        feedbackEnabled: {
          type: 'boolean',
          description: 'Enable feedback from testers',
        },
      },
      required: ['appId', 'name'],
    },
  },
];

