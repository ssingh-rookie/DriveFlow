import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Environment configuration service for JWT and authentication settings
 * Provides type-safe access to environment variables with validation
 */
@Injectable()
export class EnvConfigService {
  constructor(private readonly configService: ConfigService) {}

  // ===== JWT Configuration =====

  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }
    return secret;
  }

  get jwtAccessTokenExpiry(): string {
    return this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY') || '15m';
  }

  get jwtRefreshTokenExpiry(): string {
    return this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY') || '7d';
  }

  get jwtRefreshRotationEnabled(): boolean {
    return this.configService.get<string>('JWT_REFRESH_ROTATION_ENABLED') === 'true';
  }

  get jwtMaxRefreshTokensPerUser(): number {
    const max = this.configService.get<string>('JWT_MAX_REFRESH_TOKENS_PER_USER');
    return max ? parseInt(max, 10) : 5;
  }

  // ===== Database Configuration =====

  get databaseUrl(): string {
    const url = this.configService.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    return url;
  }

  // ===== Application Configuration =====

  get port(): number {
    const port = this.configService.get<string>('PORT');
    return port ? parseInt(port, 10) : 3001;
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') || 'development';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  // ===== Security Configuration =====

  get corsOrigins(): string[] {
    const origins = this.configService.get<string>('CORS_ORIGINS');
    if (!origins) {
      return this.isDevelopment ? ['http://localhost:3000', 'http://localhost:5173'] : [];
    }
    return origins.split(',').map(origin => origin.trim());
  }

  get rateLimitWindowMs(): number {
    const window = this.configService.get<string>('RATE_LIMIT_WINDOW_MS');
    return window ? parseInt(window, 10) : 15 * 60 * 1000; // 15 minutes
  }

  get rateLimitMaxRequests(): number {
    const max = this.configService.get<string>('RATE_LIMIT_MAX_REQUESTS');
    return max ? parseInt(max, 10) : 100;
  }

  // ===== External Services Configuration =====

  get stripeSecretKey(): string | undefined {
    return this.configService.get<string>('STRIPE_SECRET_KEY');
  }

  get postmarkApiKey(): string | undefined {
    return this.configService.get<string>('POSTMARK_API_KEY');
  }

  get twilioAccountSid(): string | undefined {
    return this.configService.get<string>('TWILIO_ACCOUNT_SID');
  }

  // ===== Validation Method =====

  /**
   * Validate all required environment variables
   * Throws an error if any required variables are missing or invalid
   */
  validateRequiredVars(): void {
    try {
      // Validate JWT configuration
      this.jwtSecret;
      this.jwtAccessTokenExpiry;
      this.jwtRefreshTokenExpiry;

      // Validate database
      this.databaseUrl;

      // Validate application settings
      this.port;
      this.nodeEnv;

      console.log('✅ Environment configuration validated successfully');
    } catch (error) {
      console.error('❌ Environment validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get a safe configuration summary for logging (without secrets)
   */
  getConfigSummary(): Record<string, any> {
    return {
      nodeEnv: this.nodeEnv,
      port: this.port,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      jwtAccessTokenExpiry: this.jwtAccessTokenExpiry,
      jwtRefreshTokenExpiry: this.jwtRefreshTokenExpiry,
      jwtRefreshRotationEnabled: this.jwtRefreshRotationEnabled,
      jwtMaxRefreshTokensPerUser: this.jwtMaxRefreshTokensPerUser,
      corsOrigins: this.corsOrigins,
      rateLimitWindowMs: this.rateLimitWindowMs,
      rateLimitMaxRequests: this.rateLimitMaxRequests,
      // Never log secrets!
      hasJwtSecret: !!this.configService.get('JWT_SECRET'),
      hasDatabaseUrl: !!this.configService.get('DATABASE_URL'),
      hasStripeKey: !!this.stripeSecretKey,
      hasPostmarkKey: !!this.postmarkApiKey,
      hasTwilioSid: !!this.twilioAccountSid,
    };
  }
}
