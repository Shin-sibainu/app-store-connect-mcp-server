import { AppStoreConnectAuth } from "./auth.js";
import { ApiResponse, ApiError } from "./types.js";

const BASE_URL = "https://api.appstoreconnect.apple.com/v1";
const ANALYTICS_URL =
  "https://api.appstoreconnect.apple.com/v1/analyticsReportRequests";
const SALES_REPORTS_URL =
  "https://api.appstoreconnect.apple.com/v1/salesReports";
const FINANCE_REPORTS_URL =
  "https://api.appstoreconnect.apple.com/v1/financeReports";

export class AppStoreConnectClient {
  private auth: AppStoreConnectAuth;

  constructor(auth: AppStoreConnectAuth) {
    this.auth = auth;
  }

  /**
   * Make a GET request to the App Store Connect API
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.auth.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;
      throw new Error(
        `API Error: ${error.errors?.[0]?.detail || response.statusText}`
      );
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  /**
   * Make a POST request to the App Store Connect API
   */
  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: this.auth.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;
      throw new Error(
        `API Error: ${error.errors?.[0]?.detail || response.statusText}`
      );
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  /**
   * Make a PATCH request to the App Store Connect API
   */
  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: this.auth.getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;
      throw new Error(
        `API Error: ${error.errors?.[0]?.detail || response.statusText}`
      );
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  /**
   * Make a DELETE request to the App Store Connect API
   */
  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: this.auth.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;
      throw new Error(
        `API Error: ${error.errors?.[0]?.detail || response.statusText}`
      );
    }
  }

  /**
   * Get sales reports (returns gzip compressed TSV)
   */
  async getSalesReport(params: {
    frequency: string;
    reportDate: string;
    reportSubType: string;
    reportType: string;
    vendorNumber: string;
    version?: string;
  }): Promise<string> {
    const url = new URL(SALES_REPORTS_URL);
    url.searchParams.append("filter[frequency]", params.frequency);
    url.searchParams.append("filter[reportDate]", params.reportDate);
    url.searchParams.append("filter[reportSubType]", params.reportSubType);
    url.searchParams.append("filter[reportType]", params.reportType);
    url.searchParams.append("filter[vendorNumber]", params.vendorNumber);
    if (params.version) {
      url.searchParams.append("filter[version]", params.version);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...this.auth.getAuthHeaders(),
        "Accept-Encoding": "gzip",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "No report available for the specified date. Reports may take up to 24 hours to be available."
        );
      }
      const error = (await response.json()) as ApiError;
      throw new Error(
        `API Error: ${error.errors?.[0]?.detail || response.statusText}`
      );
    }

    // The response is gzip compressed TSV data
    const buffer = await response.arrayBuffer();

    // Decompress gzip
    const { gunzipSync } = await import("zlib");
    const decompressed = gunzipSync(Buffer.from(buffer));

    return decompressed.toString("utf-8");
  }

  /**
   * Get finance reports (returns gzip compressed TSV)
   */
  async getFinanceReport(params: {
    regionCode: string;
    reportDate: string;
    reportType: string;
    vendorNumber: string;
  }): Promise<string> {
    const url = new URL(FINANCE_REPORTS_URL);
    url.searchParams.append("filter[regionCode]", params.regionCode);
    url.searchParams.append("filter[reportDate]", params.reportDate);
    url.searchParams.append("filter[reportType]", params.reportType);
    url.searchParams.append("filter[vendorNumber]", params.vendorNumber);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...this.auth.getAuthHeaders(),
        "Accept-Encoding": "gzip",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "No finance report available for the specified date and region."
        );
      }
      const error = (await response.json()) as ApiError;
      throw new Error(
        `API Error: ${error.errors?.[0]?.detail || response.statusText}`
      );
    }

    // The response is gzip compressed TSV data
    const buffer = await response.arrayBuffer();

    // Decompress gzip
    const { gunzipSync } = await import("zlib");
    const decompressed = gunzipSync(Buffer.from(buffer));

    return decompressed.toString("utf-8");
  }

  /**
   * Paginate through all results
   */
  async getAll<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T[]> {
    const results: T[] = [];
    let nextUrl: string | undefined = undefined;

    // First request
    const firstResponse = await this.get<T[]>(endpoint, params);
    if (Array.isArray(firstResponse.data)) {
      results.push(...firstResponse.data);
    }
    nextUrl = firstResponse.links.next;

    // Paginate
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: "GET",
        headers: this.auth.getAuthHeaders(),
      });

      if (!response.ok) {
        break;
      }

      const data = (await response.json()) as ApiResponse<T[]>;
      if (Array.isArray(data.data)) {
        results.push(...data.data);
      }
      nextUrl = data.links.next;
    }

    return results;
  }

  /**
   * Download analytics report segment
   */
  async downloadAnalyticsSegment(url: string): Promise<string> {
    // S3の署名付きURLの場合は認証ヘッダーを送らない（URLに署名が含まれているため）
    const isS3Url = url.includes("s3.") || url.includes("amazonaws.com");

    try {
      const response = await fetch(url, {
        method: "GET",
        // S3の署名付きURLは追加のヘッダー不要（URLパラメータにすべて含まれている）
        headers: isS3Url
          ? {}
          : {
              ...this.auth.getAuthHeaders(),
              "Accept-Encoding": "gzip",
            },
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => response.statusText);
        throw new Error(
          `Failed to download analytics segment: ${response.status} ${
            response.statusText
          } - ${errorText.substring(0, 200)}`
        );
      }

      const buffer = await response.arrayBuffer();

      // Try to decompress if gzipped
      try {
        const { gunzipSync } = await import("zlib");
        const decompressed = gunzipSync(Buffer.from(buffer));
        return decompressed.toString("utf-8");
      } catch (decompressError) {
        // Not gzipped, return as-is
        return new TextDecoder().decode(buffer);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to download analytics segment: ${String(error)}`);
    }
  }
}
