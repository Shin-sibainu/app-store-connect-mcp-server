import { z } from 'zod';
import { AppStoreConnectClient } from '../client.js';
import { AppStoreConnectAuth } from '../auth.js';

// Input schemas
export const getSalesReportSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).describe('Report frequency'),
  reportDate: z.string().describe('Report date (format: YYYY-MM-DD for daily, YYYY-MM for monthly, YYYY for yearly)'),
  reportType: z.enum(['SALES', 'PRE_ORDER', 'NEWSSTAND', 'SUBSCRIPTION', 'SUBSCRIPTION_EVENT', 'SUBSCRIBER']).optional().default('SALES').describe('Type of report'),
  reportSubType: z.enum(['SUMMARY', 'DETAILED', 'SUMMARY_INSTALL_TYPE', 'SUMMARY_TERRITORY', 'SUMMARY_CHANNEL']).optional().default('SUMMARY').describe('Report sub-type'),
  vendorNumber: z.string().optional().describe('Vendor number (uses configured value if not provided)'),
});

export const getFinanceReportSchema = z.object({
  regionCode: z.string().describe('Region code (e.g., US, JP, Z1 for Euro-Zone, etc.)'),
  reportDate: z.string().describe('Report date in format YYYY-MM'),
  reportType: z.enum(['FINANCIAL', 'FINANCE_DETAIL']).optional().default('FINANCIAL').describe('Type of finance report'),
  vendorNumber: z.string().optional().describe('Vendor number (uses configured value if not provided)'),
});

// Region codes reference
export const REGION_CODES = {
  'US': 'United States',
  'CA': 'Canada',
  'MX': 'Mexico',
  'JP': 'Japan',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'GB': 'United Kingdom',
  'Z1': 'Euro-Zone',
  'CH': 'Switzerland',
  'NO': 'Norway',
  'DK': 'Denmark',
  'SE': 'Sweden',
  'CN': 'China',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'TW': 'Taiwan',
  'KR': 'South Korea',
  'IN': 'India',
  'RU': 'Russia',
  'BR': 'Brazil',
  'ZA': 'South Africa',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'IL': 'Israel',
  'TR': 'Turkey',
  'WW': 'Rest of World',
};

// Tool implementations
export async function getSalesReport(
  client: AppStoreConnectClient,
  auth: AppStoreConnectAuth,
  input: z.infer<typeof getSalesReportSchema>
): Promise<{ report: string; parsed?: SalesReportRow[] }> {
  const vendorNumber = input.vendorNumber || auth.getVendorNumber();
  
  if (!vendorNumber) {
    throw new Error('Vendor number is required. Set APP_STORE_CONNECT_VENDOR_NUMBER or provide vendorNumber parameter.');
  }

  const reportData = await client.getSalesReport({
    frequency: input.frequency,
    reportDate: input.reportDate,
    reportSubType: input.reportSubType || 'SUMMARY',
    reportType: input.reportType || 'SALES',
    vendorNumber,
  });

  // Parse TSV data
  const parsed = parseSalesReport(reportData);

  return {
    report: reportData,
    parsed,
  };
}

export async function getFinanceReport(
  client: AppStoreConnectClient,
  auth: AppStoreConnectAuth,
  input: z.infer<typeof getFinanceReportSchema>
): Promise<{ report: string; parsed?: FinanceReportRow[] }> {
  const vendorNumber = input.vendorNumber || auth.getVendorNumber();
  
  if (!vendorNumber) {
    throw new Error('Vendor number is required. Set APP_STORE_CONNECT_VENDOR_NUMBER or provide vendorNumber parameter.');
  }

  const reportData = await client.getFinanceReport({
    regionCode: input.regionCode,
    reportDate: input.reportDate,
    reportType: input.reportType || 'FINANCIAL',
    vendorNumber,
  });

  // Parse TSV data
  const parsed = parseFinanceReport(reportData);

  return {
    report: reportData,
    parsed,
  };
}

// Sales report row type
interface SalesReportRow {
  provider: string;
  providerCountry: string;
  sku: string;
  developer: string;
  title: string;
  version: string;
  productTypeIdentifier: string;
  units: number;
  developerProceeds: number;
  beginDate: string;
  endDate: string;
  customerCurrency: string;
  countryCode: string;
  currencyOfProceeds: string;
  appleIdentifier: string;
  customerPrice: number;
  promoCode: string;
  parentIdentifier: string;
  subscription: string;
  period: string;
  category: string;
  cmb: string;
  device: string;
  supportedPlatforms: string;
  proceedsReason: string;
  preservedPricing: string;
  client: string;
  orderType: string;
}

// Finance report row type
interface FinanceReportRow {
  startDate: string;
  endDate: string;
  uccBegin: string;
  uccEnd: string;
  country: string;
  appleTaxWithholding?: number;
  taxOnProceeds?: number;
  exchangeRate?: number;
  proceeds?: number;
  partnershare?: number;
  // Additional fields may be present
  [key: string]: unknown;
}

function parseSalesReport(tsv: string): SalesReportRow[] {
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map(h => h.trim().replace(/\s+/g, ''));
  const rows: SalesReportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    if (values.length < headers.length) continue;

    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j]?.trim() || '';
      
      // Convert numeric fields
      if (['Units', 'DeveloperProceeds', 'CustomerPrice'].includes(header)) {
        row[header.charAt(0).toLowerCase() + header.slice(1)] = parseFloat(value) || 0;
      } else {
        row[header.charAt(0).toLowerCase() + header.slice(1)] = value;
      }
    }
    rows.push(row as unknown as SalesReportRow);
  }

  return rows;
}

function parseFinanceReport(tsv: string): FinanceReportRow[] {
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map(h => h.trim());
  const rows: FinanceReportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    if (values.length < headers.length) continue;

    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j]?.trim() || '';
      row[header] = value;
    }
    rows.push(row as unknown as FinanceReportRow);
  }

  return rows;
}

// Helper function to summarize sales data
export function summarizeSalesReport(rows: SalesReportRow[]): {
  totalUnits: number;
  totalProceeds: number;
  byProduct: Record<string, { units: number; proceeds: number }>;
  byCountry: Record<string, { units: number; proceeds: number }>;
  byDevice: Record<string, { units: number; proceeds: number }>;
  byProductType: Record<string, { units: number; proceeds: number }>;
} {
  const summary = {
    totalUnits: 0,
    totalProceeds: 0,
    byProduct: {} as Record<string, { units: number; proceeds: number }>,
    byCountry: {} as Record<string, { units: number; proceeds: number }>,
    byDevice: {} as Record<string, { units: number; proceeds: number }>,
    byProductType: {} as Record<string, { units: number; proceeds: number }>,
  };

  for (const row of rows) {
    const units = row.units || 0;
    const proceeds = row.developerProceeds || 0;

    summary.totalUnits += units;
    summary.totalProceeds += proceeds;

    // By product
    const product = row.title || row.sku;
    if (!summary.byProduct[product]) {
      summary.byProduct[product] = { units: 0, proceeds: 0 };
    }
    summary.byProduct[product].units += units;
    summary.byProduct[product].proceeds += proceeds;

    // By country
    const country = row.countryCode;
    if (country) {
      if (!summary.byCountry[country]) {
        summary.byCountry[country] = { units: 0, proceeds: 0 };
      }
      summary.byCountry[country].units += units;
      summary.byCountry[country].proceeds += proceeds;
    }

    // By device
    const device = row.device;
    if (device) {
      if (!summary.byDevice[device]) {
        summary.byDevice[device] = { units: 0, proceeds: 0 };
      }
      summary.byDevice[device].units += units;
      summary.byDevice[device].proceeds += proceeds;
    }

    // By product type
    const productType = row.productTypeIdentifier;
    if (productType) {
      if (!summary.byProductType[productType]) {
        summary.byProductType[productType] = { units: 0, proceeds: 0 };
      }
      summary.byProductType[productType].units += units;
      summary.byProductType[productType].proceeds += proceeds;
    }
  }

  // Round proceeds to 2 decimal places
  summary.totalProceeds = Math.round(summary.totalProceeds * 100) / 100;
  
  return summary;
}

// Tool definitions for MCP
export const salesTools = [
  {
    name: 'get_sales_report',
    description: 'Get sales report data. Returns download counts, revenue, and transaction details for your apps. Reports are available daily, weekly, monthly, or yearly.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        frequency: {
          type: 'string',
          description: 'Report frequency',
          enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
        },
        reportDate: {
          type: 'string',
          description: 'Report date (format: YYYY-MM-DD for daily, YYYY-MM for monthly, YYYY for yearly)',
        },
        reportType: {
          type: 'string',
          description: 'Type of report',
          enum: ['SALES', 'PRE_ORDER', 'NEWSSTAND', 'SUBSCRIPTION', 'SUBSCRIPTION_EVENT', 'SUBSCRIBER'],
          default: 'SALES',
        },
        reportSubType: {
          type: 'string',
          description: 'Report sub-type',
          enum: ['SUMMARY', 'DETAILED', 'SUMMARY_INSTALL_TYPE', 'SUMMARY_TERRITORY', 'SUMMARY_CHANNEL'],
          default: 'SUMMARY',
        },
        vendorNumber: {
          type: 'string',
          description: 'Vendor number (uses configured value if not provided)',
        },
      },
      required: ['frequency', 'reportDate'],
    },
  },
  {
    name: 'get_finance_report',
    description: 'Get financial report data by region. Shows proceeds, taxes, and payment details.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        regionCode: {
          type: 'string',
          description: 'Region code (e.g., US, JP, Z1 for Euro-Zone)',
        },
        reportDate: {
          type: 'string',
          description: 'Report date in format YYYY-MM',
        },
        reportType: {
          type: 'string',
          description: 'Type of finance report',
          enum: ['FINANCIAL', 'FINANCE_DETAIL'],
          default: 'FINANCIAL',
        },
        vendorNumber: {
          type: 'string',
          description: 'Vendor number (uses configured value if not provided)',
        },
      },
      required: ['regionCode', 'reportDate'],
    },
  },
  {
    name: 'list_region_codes',
    description: 'List available region codes for finance reports.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

