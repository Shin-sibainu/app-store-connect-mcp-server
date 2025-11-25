import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AppStoreConnectConfig } from './types.js';

const AUDIENCE = 'appstoreconnect-v1';
const ALGORITHM = 'ES256';
const TOKEN_EXPIRY = '20m'; // Apple allows max 20 minutes

interface JWTPayload {
  iss: string;
  iat: number;
  exp: number;
  aud: string;
}

export class AppStoreConnectAuth {
  private config: AppStoreConnectConfig;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AppStoreConnectConfig) {
    this.config = config;
  }

  /**
   * Load configuration from environment variables
   */
  static fromEnv(): AppStoreConnectAuth {
    const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
    const keyId = process.env.APP_STORE_CONNECT_KEY_ID;
    const privateKeyPath = process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;
    const privateKeyContent = process.env.APP_STORE_CONNECT_PRIVATE_KEY;
    const vendorNumber = process.env.APP_STORE_CONNECT_VENDOR_NUMBER;

    if (!issuerId) {
      throw new Error('APP_STORE_CONNECT_ISSUER_ID environment variable is required');
    }
    if (!keyId) {
      throw new Error('APP_STORE_CONNECT_KEY_ID environment variable is required');
    }

    let privateKey: string;

    if (privateKeyContent) {
      // Use the key content directly
      privateKey = privateKeyContent;
    } else if (privateKeyPath) {
      // Load from file
      const resolvedPath = path.resolve(privateKeyPath);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Private key file not found: ${resolvedPath}`);
      }
      privateKey = fs.readFileSync(resolvedPath, 'utf-8');
    } else {
      throw new Error(
        'Either APP_STORE_CONNECT_PRIVATE_KEY_PATH or APP_STORE_CONNECT_PRIVATE_KEY environment variable is required'
      );
    }

    return new AppStoreConnectAuth({
      issuerId,
      keyId,
      privateKey,
      vendorNumber,
    });
  }

  /**
   * Generate a JWT token for App Store Connect API
   */
  generateToken(): string {
    const now = Math.floor(Date.now() / 1000);
    
    // Return cached token if still valid (with 1 minute buffer)
    if (this.cachedToken && this.tokenExpiry > now + 60) {
      return this.cachedToken;
    }

    const payload: JWTPayload = {
      iss: this.config.issuerId,
      iat: now,
      exp: now + 20 * 60, // 20 minutes
      aud: AUDIENCE,
    };

    const token = jwt.sign(payload, this.config.privateKey, {
      algorithm: ALGORITHM,
      keyid: this.config.keyId,
    });

    this.cachedToken = token;
    this.tokenExpiry = payload.exp;

    return token;
  }

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.generateToken()}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get the vendor number for sales reports
   */
  getVendorNumber(): string | undefined {
    return this.config.vendorNumber;
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.issuerId) {
      errors.push('Issuer ID is required');
    }
    if (!this.config.keyId) {
      errors.push('Key ID is required');
    }
    if (!this.config.privateKey) {
      errors.push('Private key is required');
    }
    if (!this.config.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      errors.push('Private key appears to be invalid (missing BEGIN header)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

