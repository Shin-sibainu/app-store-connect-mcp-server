#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { AppStoreConnectAuth } from './auth.js';
import { AppStoreConnectClient } from './client.js';

// Import tools
import {
  appsTools,
  listApps,
  getApp,
  listAppVersions,
  listBuilds,
  listAppsSchema,
  getAppSchema,
  listAppVersionsSchema,
  listBuildsSchema,
} from './tools/apps.js';

import {
  reviewsTools,
  listReviews,
  getReview,
  respondToReview,
  deleteReviewResponse,
  analyzeReviewSentiment,
  listReviewsSchema,
  getReviewSchema,
  respondToReviewSchema,
  deleteReviewResponseSchema,
} from './tools/reviews.js';

import {
  salesTools,
  getSalesReport,
  getFinanceReport,
  summarizeSalesReport,
  getSalesReportSchema,
  getFinanceReportSchema,
  REGION_CODES,
} from './tools/sales.js';

import {
  analyticsTools,
  listAnalyticsReportRequests,
  createAnalyticsReportRequest,
  listAnalyticsReports,
  listAnalyticsReportInstances,
  getAnalyticsReportSegments,
  deleteAnalyticsReportRequest,
  downloadAnalyticsData,
  listAnalyticsReportRequestsSchema,
  createAnalyticsReportRequestSchema,
  listAnalyticsReportsSchema,
  listAnalyticsReportInstancesSchema,
  getAnalyticsReportSegmentsSchema,
  deleteAnalyticsReportRequestSchema,
  ANALYTICS_CATEGORIES,
} from './tools/analytics.js';

import {
  diagnosticsTools,
  getPerfPowerMetrics,
  getDiagnosticSignatures,
  getDiagnosticLogs,
  getLatestBuilds,
  summarizeDiagnostics,
  getPerfPowerMetricsSchema,
  getDiagnosticSignaturesSchema,
  getDiagnosticLogsSchema,
  METRIC_TYPES,
  DIAGNOSTIC_TYPES,
} from './tools/diagnostics.js';

import {
  testersTools,
  listBetaTesters,
  getBetaTester,
  inviteBetaTester,
  removeBetaTester,
  listBetaGroups,
  createBetaGroup,
  summarizeTesterStats,
  listBetaTestersSchema,
  getBetaTesterSchema,
  inviteBetaTesterSchema,
  removeBetaTesterSchema,
  listBetaGroupsSchema,
  createBetaGroupSchema,
} from './tools/testers.js';

// Create server instance
const server = new Server(
  {
    name: 'app-store-connect-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize auth and client
let auth: AppStoreConnectAuth;
let client: AppStoreConnectClient;

try {
  auth = AppStoreConnectAuth.fromEnv();
  const validation = auth.validateConfig();
  if (!validation.valid) {
    console.error('Configuration errors:', validation.errors);
    process.exit(1);
  }
  client = new AppStoreConnectClient(auth);
} catch (error) {
  console.error('Failed to initialize App Store Connect client:', error);
  console.error('\nPlease set the required environment variables:');
  console.error('  - APP_STORE_CONNECT_ISSUER_ID');
  console.error('  - APP_STORE_CONNECT_KEY_ID');
  console.error('  - APP_STORE_CONNECT_PRIVATE_KEY_PATH or APP_STORE_CONNECT_PRIVATE_KEY');
  console.error('  - APP_STORE_CONNECT_VENDOR_NUMBER (optional, for sales reports)');
  process.exit(1);
}

// Combine all tools
const allTools = [
  ...appsTools,
  ...reviewsTools,
  ...salesTools,
  ...analyticsTools,
  ...diagnosticsTools,
  ...testersTools,
];

// Register tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Apps tools
      case 'list_apps': {
        const input = listAppsSchema.parse(args);
        const result = await listApps(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_app': {
        const input = getAppSchema.parse(args);
        const result = await getApp(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_app_versions': {
        const input = listAppVersionsSchema.parse(args);
        const result = await listAppVersions(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_builds': {
        const input = listBuildsSchema.parse(args);
        const result = await listBuilds(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // Reviews tools
      case 'list_reviews': {
        const input = listReviewsSchema.parse(args);
        const result = await listReviews(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_review': {
        const input = getReviewSchema.parse(args);
        const result = await getReview(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'respond_to_review': {
        const input = respondToReviewSchema.parse(args);
        const result = await respondToReview(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_review_response': {
        const input = deleteReviewResponseSchema.parse(args);
        const result = await deleteReviewResponse(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'analyze_reviews': {
        const input = listReviewsSchema.parse(args);
        const reviewsResult = await listReviews(client, input);
        const analysis = analyzeReviewSentiment(reviewsResult.reviews);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      }

      // Sales tools
      case 'get_sales_report': {
        const input = getSalesReportSchema.parse(args);
        const result = await getSalesReport(client, auth, input);
        const summary = result.parsed ? summarizeSalesReport(result.parsed) : null;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ ...result, summary }, null, 2),
            },
          ],
        };
      }

      case 'get_finance_report': {
        const input = getFinanceReportSchema.parse(args);
        const result = await getFinanceReport(client, auth, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_region_codes': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(REGION_CODES, null, 2),
            },
          ],
        };
      }

      // Analytics tools
      case 'list_analytics_report_requests': {
        const input = listAnalyticsReportRequestsSchema.parse(args);
        const result = await listAnalyticsReportRequests(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_analytics_report_request': {
        const input = createAnalyticsReportRequestSchema.parse(args);
        const result = await createAnalyticsReportRequest(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_analytics_reports': {
        const input = listAnalyticsReportsSchema.parse(args);
        const result = await listAnalyticsReports(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_analytics_report_instances': {
        const input = listAnalyticsReportInstancesSchema.parse(args);
        const result = await listAnalyticsReportInstances(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_analytics_report_segments': {
        const input = getAnalyticsReportSegmentsSchema.parse(args);
        const result = await getAnalyticsReportSegments(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'download_analytics_data': {
        const input = getAnalyticsReportSegmentsSchema.parse(args);
        const segments = await getAnalyticsReportSegments(client, input);
        const data = await downloadAnalyticsData(client, segments.segments);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ data }, null, 2),
            },
          ],
        };
      }

      case 'delete_analytics_report_request': {
        const input = deleteAnalyticsReportRequestSchema.parse(args);
        const result = await deleteAnalyticsReportRequest(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_analytics_categories': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(ANALYTICS_CATEGORIES, null, 2),
            },
          ],
        };
      }

      // Diagnostics tools
      case 'get_perf_power_metrics': {
        const input = getPerfPowerMetricsSchema.parse(args);
        const result = await getPerfPowerMetrics(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_diagnostic_signatures': {
        const input = getDiagnosticSignaturesSchema.parse(args);
        const result = await getDiagnosticSignatures(client, input);
        const summary = summarizeDiagnostics(result.signatures);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ ...result, summary }, null, 2),
            },
          ],
        };
      }

      case 'get_diagnostic_logs': {
        const input = getDiagnosticLogsSchema.parse(args);
        const result = await getDiagnosticLogs(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_metric_types': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(METRIC_TYPES, null, 2),
            },
          ],
        };
      }

      case 'list_diagnostic_types': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(DIAGNOSTIC_TYPES, null, 2),
            },
          ],
        };
      }

      // Testers tools
      case 'list_beta_testers': {
        const input = listBetaTestersSchema.parse(args);
        const result = await listBetaTesters(client, input);
        const stats = summarizeTesterStats(result.testers);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ ...result, stats }, null, 2),
            },
          ],
        };
      }

      case 'get_beta_tester': {
        const input = getBetaTesterSchema.parse(args);
        const result = await getBetaTester(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'invite_beta_tester': {
        const input = inviteBetaTesterSchema.parse(args);
        const result = await inviteBetaTester(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'remove_beta_tester': {
        const input = removeBetaTesterSchema.parse(args);
        const result = await removeBetaTester(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_beta_groups': {
        const input = listBetaGroupsSchema.parse(args);
        const result = await listBetaGroups(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_beta_group': {
        const input = createBetaGroupSchema.parse(args);
        const result = await createBetaGroup(client, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('App Store Connect MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

