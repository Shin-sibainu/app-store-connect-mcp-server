// App Store Connect API Types

export interface AppStoreConnectConfig {
  issuerId: string;
  keyId: string;
  privateKey: string;
  vendorNumber?: string;
}

// App Types
export interface App {
  type: 'apps';
  id: string;
  attributes: {
    name: string;
    bundleId: string;
    sku: string;
    primaryLocale: string;
    isOrEverWasMadeForKids: boolean;
    subscriptionStatusUrl?: string;
    subscriptionStatusUrlVersion?: string;
    subscriptionStatusUrlForSandbox?: string;
    subscriptionStatusUrlVersionForSandbox?: string;
    contentRightsDeclaration?: string;
    availableInNewTerritories?: boolean;
  };
  relationships?: {
    appStoreVersions?: { data: { type: string; id: string }[] };
    preReleaseVersions?: { data: { type: string; id: string }[] };
    betaGroups?: { data: { type: string; id: string }[] };
  };
}

export interface AppVersion {
  type: 'appStoreVersions';
  id: string;
  attributes: {
    platform: 'IOS' | 'MAC_OS' | 'TV_OS' | 'VISION_OS';
    versionString: string;
    appStoreState: string;
    copyright?: string;
    releaseType?: string;
    earliestReleaseDate?: string;
    downloadable?: boolean;
    createdDate: string;
  };
}

// Review Types
export interface CustomerReview {
  type: 'customerReviews';
  id: string;
  attributes: {
    rating: number;
    title?: string;
    body?: string;
    reviewerNickname: string;
    createdDate: string;
    territory: string;
  };
}

export interface CustomerReviewResponse {
  type: 'customerReviewResponses';
  id: string;
  attributes: {
    responseBody: string;
    lastModifiedDate: string;
    state: 'PENDING_PUBLISH' | 'PUBLISHED';
  };
}

// Sales & Finance Types
export interface SalesReportFilter {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  reportDate: string;
  reportSubType: 'SUMMARY' | 'DETAILED' | 'SUMMARY_INSTALL_TYPE' | 'SUMMARY_TERRITORY' | 'SUMMARY_CHANNEL';
  reportType: 'SALES' | 'PRE_ORDER' | 'NEWSSTAND' | 'SUBSCRIPTION' | 'SUBSCRIPTION_EVENT' | 'SUBSCRIBER';
  vendorNumber: string;
  version?: string;
}

export interface FinanceReportFilter {
  regionCode: string;
  reportDate: string;
  reportType: 'FINANCIAL' | 'FINANCE_DETAIL';
  vendorNumber: string;
}

// Analytics Types
export interface AnalyticsReportRequest {
  type: 'analyticsReportRequests';
  id: string;
  attributes: {
    accessType: 'ONE_TIME_SNAPSHOT' | 'ONGOING';
    stoppedDueToInactivity?: boolean;
  };
  relationships?: {
    reports?: { data: { type: string; id: string }[] };
  };
}

export interface AnalyticsReport {
  type: 'analyticsReports';
  id: string;
  attributes: {
    name: string;
    category: 'APP_USAGE' | 'APP_STORE_ENGAGEMENT' | 'COMMERCE' | 'FRAMEWORK_USAGE' | 'PERFORMANCE';
  };
}

export interface AnalyticsReportInstance {
  type: 'analyticsReportInstances';
  id: string;
  attributes: {
    granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    processingDate: string;
  };
}

// Diagnostics Types
export interface DiagnosticSignature {
  type: 'diagnosticSignatures';
  id: string;
  attributes: {
    diagnosticType: 'DISK_WRITES' | 'HANGS' | 'LAUNCHES';
    signature: string;
    weight: number;
  };
}

export interface PerfPowerMetric {
  type: 'perfPowerMetrics';
  id: string;
  attributes: {
    deviceType: string;
    metricType: 'DISK' | 'HANG' | 'BATTERY' | 'LAUNCH' | 'MEMORY' | 'ANIMATION' | 'TERMINATION';
    platform: string;
  };
}

// Build Types
export interface Build {
  type: 'builds';
  id: string;
  attributes: {
    version: string;
    uploadedDate: string;
    expirationDate: string;
    expired: boolean;
    minOsVersion: string;
    lsMinimumSystemVersion?: string;
    computedMinMacOsVersion?: string;
    iconAssetToken?: object;
    processingState: 'PROCESSING' | 'FAILED' | 'INVALID' | 'VALID';
    buildAudienceType?: string;
    usesNonExemptEncryption?: boolean;
  };
}

// Beta Tester Types
export interface BetaTester {
  type: 'betaTesters';
  id: string;
  attributes: {
    firstName?: string;
    lastName?: string;
    email: string;
    inviteType: 'EMAIL' | 'PUBLIC_LINK';
    state: 'NOT_INVITED' | 'INVITED' | 'ACCEPTED' | 'INSTALLED' | 'REVOKED';
  };
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  included?: unknown[];
  links: {
    self: string;
    next?: string;
    first?: string;
  };
  meta?: {
    paging?: {
      total: number;
      limit: number;
    };
  };
}

export interface ApiError {
  errors: {
    id: string;
    status: string;
    code: string;
    title: string;
    detail: string;
    source?: {
      pointer?: string;
      parameter?: string;
    };
  }[];
}

