import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthRepository } from '../auth.repo';
import { JwtUtil } from './jwt.util';
import { EnvConfigService } from '../../../core/config/env.config';

/**
 * Refresh token rotation result interface
 */
export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  rotationId: string;
  expiresAt: Date;
}

/**
 * Token rotation metadata for security tracking
 */
export interface TokenRotationMetadata {
  userId: string;
  oldRotationId: string;
  newRotationId: string;
  oldJti: string;
  newJti: string;
  clientInfo: {
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Refresh Token Rotation Utility
 * Implements secure refresh token rotation with single-use enforcement and replay detection
 * Based on OAuth 2.1 best practices for refresh token security
 */
@Injectable()
export class RefreshTokenRotationUtil {
  private readonly logger = new Logger(RefreshTokenRotationUtil.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtUtil: JwtUtil,
    private readonly envConfig: EnvConfigService,
  ) {}

  /**
   * Perform refresh token rotation
   * Validates the current refresh token and issues new access/refresh token pair
   * @param refreshToken - Current refresh token to rotate
   * @param clientInfo - Client information for security logging
   * @returns New token pair or throws exception
   */
  async rotateRefreshToken(
    refreshToken: string,
    clientInfo: {
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<RefreshTokenResult> {
    try {
      // Step 1: Verify and decode the refresh token
      const payload = this.jwtUtil.verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type. Refresh token required.');
      }

      if (!payload.jti || !payload.rotationId) {
        throw new UnauthorizedException('Invalid refresh token structure');
      }

      // Step 2: Check if the refresh token exists and is unused
      const storedToken = await this.authRepo.findRefreshTokenByJti(payload.jti);
      
      if (!storedToken) {
        // Token not found - could be replay attack or already rotated
        await this.handleSuspiciousActivity(payload, clientInfo, 'token_not_found');
        throw new UnauthorizedException('Refresh token not found or already used');
      }

      if (storedToken.used) {
        // Token already used - definite replay attack
        await this.handleReplayAttack(payload, clientInfo);
        throw new UnauthorizedException('Refresh token already used');
      }

      if (storedToken.expiresAt < new Date()) {
        // Token expired
        await this.cleanupExpiredToken(payload.jti);
        throw new UnauthorizedException('Refresh token has expired');
      }

      // Step 3: Verify token hash matches
      const tokenHash = this.jwtUtil.hashToken(refreshToken);
      if (storedToken.tokenHash !== tokenHash) {
        await this.handleSuspiciousActivity(payload, clientInfo, 'token_hash_mismatch');
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Step 4: Verify user still exists and is active
      const user = await this.authRepo.findUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found or deactivated');
      }

      // Step 5: Check rotation limits (optional security measure)
      const activeTokenCount = await this.authRepo.countUserActiveRefreshTokens(payload.sub);
      if (activeTokenCount >= this.envConfig.jwtMaxRefreshTokensPerUser) {
        this.logger.warn(`User ${payload.sub} has too many active refresh tokens: ${activeTokenCount}`);
        // Still allow rotation but log for monitoring
      }

      // Step 6: Mark current token as used (BEFORE generating new ones)
      await this.authRepo.markRefreshTokenAsUsed(payload.jti);

      // Step 7: Generate new token pair
      const newRotationId = this.jwtUtil.generateRotationId();
      const newRefreshJti = this.jwtUtil.generateJwtId();
      const newAccessJti = this.jwtUtil.generateJwtId();

      const newAccessToken = this.jwtUtil.generateAccessToken({
        userId: payload.sub,
        role: payload.role,
        orgId: payload.orgId,
      });

      const newRefreshToken = this.jwtUtil.generateRefreshToken({
        userId: payload.sub,
        role: payload.role,
        orgId: payload.orgId,
        rotationId: newRotationId,
      });

      // Step 8: Calculate refresh token expiry
      const expiresAt = new Date();
      expiresAt.setTime(
        expiresAt.getTime() + 
        this.parseTimeToMilliseconds(this.envConfig.jwtRefreshTokenExpiry)
      );

      // Step 9: Store new refresh token
      const newRefreshTokenHash = this.jwtUtil.hashToken(newRefreshToken);
      await this.authRepo.createRefreshToken({
        userId: payload.sub,
        jti: this.jwtUtil.extractJti(newRefreshToken)!,
        rotationId: newRotationId,
        tokenHash: newRefreshTokenHash,
        expiresAt,
      });

      // Step 10: Log successful rotation
      await this.logSuccessfulRotation({
        userId: payload.sub,
        oldRotationId: payload.rotationId,
        newRotationId,
        oldJti: payload.jti,
        newJti: newRefreshJti,
        clientInfo,
      });

      // Step 11: Schedule cleanup of old tokens in the same rotation chain
      this.scheduleRotationChainCleanup(payload.rotationId, payload.sub);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        rotationId: newRotationId,
        expiresAt,
      };

    } catch (error) {
      // Log any errors for security monitoring
      await this.authRepo.logSecurityEvent({
        event: 'refresh_token_rotation_failed',
        severity: error instanceof UnauthorizedException ? 'medium' : 'high',
        details: {
          error: error.message,
          tokenStructure: this.safeTokenAnalysis(refreshToken),
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      throw error;
    }
  }

  /**
   * Handle suspected replay attacks
   * Revokes all tokens in the rotation chain as a security measure
   */
  private async handleReplayAttack(
    payload: any,
    clientInfo: any,
  ): Promise<void> {
    this.logger.error(`Replay attack detected for user ${payload.sub}, rotation ${payload.rotationId}`);

    // Revoke entire rotation chain
    await this.authRepo.revokeRefreshTokensByRotationId(payload.rotationId);

    // Log critical security event
    await this.authRepo.logSecurityEvent({
      userId: payload.sub,
      event: 'refresh_token_replay_attack',
      severity: 'critical',
      details: {
        rotationId: payload.rotationId,
        jti: payload.jti,
        message: 'Used refresh token presented again - rotation chain revoked',
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  /**
   * Handle other suspicious activities
   */
  private async handleSuspiciousActivity(
    payload: any,
    clientInfo: any,
    reason: string,
  ): Promise<void> {
    this.logger.warn(`Suspicious refresh token activity: ${reason} for user ${payload?.sub}`);

    // If we have a rotation ID, revoke the chain as a precaution
    if (payload?.rotationId) {
      await this.authRepo.revokeRefreshTokensByRotationId(payload.rotationId);
    }

    await this.authRepo.logSecurityEvent({
      userId: payload?.sub,
      event: 'refresh_token_suspicious_activity',
      severity: 'high',
      details: {
        reason,
        rotationId: payload?.rotationId,
        jti: payload?.jti,
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  /**
   * Clean up expired token
   */
  private async cleanupExpiredToken(jti: string): Promise<void> {
    try {
      await this.authRepo.deleteRefreshToken(jti);
    } catch (error) {
      this.logger.error(`Failed to cleanup expired token ${jti}:`, error);
    }
  }

  /**
   * Log successful token rotation
   */
  private async logSuccessfulRotation(metadata: TokenRotationMetadata): Promise<void> {
    await this.authRepo.logAuthEvent({
      userId: metadata.userId,
      event: 'refresh_token_rotated',
      metadata: {
        oldRotationId: metadata.oldRotationId,
        newRotationId: metadata.newRotationId,
        // Don't log full JTIs for security
        oldJtiPrefix: metadata.oldJti.substring(0, 8),
        newJtiPrefix: metadata.newJti.substring(0, 8),
      },
      ipAddress: metadata.clientInfo.ipAddress,
      userAgent: metadata.clientInfo.userAgent,
    });
  }

  /**
   * Schedule cleanup of old tokens in rotation chain
   * This is done asynchronously to avoid delaying the rotation response
   */
  private scheduleRotationChainCleanup(rotationId: string, userId: string): void {
    // Use setTimeout for simple async cleanup
    // In production, you might use a job queue like Bull/BullMQ
    setTimeout(async () => {
      try {
        // Keep only the most recent token in each rotation chain
        const userTokens = await this.authRepo.getUserRefreshTokens(userId);
        const rotationChainTokens = userTokens.filter(token => 
          token.rotationId === rotationId && token.used
        );

        // Delete all but the most recently created used token
        if (rotationChainTokens.length > 1) {
          const sortedTokens = rotationChainTokens.sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          );
          
          // Keep the most recent, delete the rest
          for (let i = 1; i < sortedTokens.length; i++) {
            await this.authRepo.deleteRefreshToken(sortedTokens[i].jti);
          }

          this.logger.debug(`Cleaned up ${sortedTokens.length - 1} old tokens from rotation chain ${rotationId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to cleanup rotation chain ${rotationId}:`, error);
      }
    }, 5000); // 5 second delay
  }

  /**
   * Safely analyze token structure for logging (without exposing sensitive data)
   */
  private safeTokenAnalysis(token: string): any {
    try {
      const decoded = this.jwtUtil.decodeToken(token);
      return {
        hasValidStructure: !!decoded,
        type: decoded?.type,
        hasJti: !!decoded?.jti,
        hasRotationId: !!decoded?.rotationId,
        isExpired: this.jwtUtil.isTokenExpired(token),
      };
    } catch {
      return {
        hasValidStructure: false,
        malformed: true,
      };
    }
  }

  /**
   * Parse time string to milliseconds
   */
  private parseTimeToMilliseconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }

  /**
   * Validate refresh token without rotation (for logout, etc.)
   */
  async validateRefreshToken(refreshToken: string): Promise<{
    isValid: boolean;
    payload?: any;
    storedToken?: any;
  }> {
    try {
      const payload = this.jwtUtil.verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        return { isValid: false };
      }

      const storedToken = await this.authRepo.findRefreshTokenByJti(payload.jti!);
      
      if (!storedToken || storedToken.used || storedToken.expiresAt < new Date()) {
        return { isValid: false };
      }

      const tokenHash = this.jwtUtil.hashToken(refreshToken);
      if (storedToken.tokenHash !== tokenHash) {
        return { isValid: false };
      }

      return { isValid: true, payload, storedToken };
    } catch {
      return { isValid: false };
    }
  }
}
