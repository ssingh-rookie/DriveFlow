import type { AuthRepository } from '../auth.repo'
import type { JwtUtil } from './jwt.util'
import { Injectable, Logger } from '@nestjs/common'

/**
 * Token revocation reason enum for audit logging
 */
export enum RevocationReason {
  USER_LOGOUT = 'user_logout',
  PASSWORD_CHANGE = 'password_change',
  SECURITY_BREACH = 'security_breach',
  ADMIN_ACTION = 'admin_action',
  TOKEN_COMPROMISE = 'token_compromise',
  ACCOUNT_DEACTIVATION = 'account_deactivation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Blacklist entry interface for tracking revoked tokens
 */
export interface BlacklistEntry {
  jti: string
  userId: string
  tokenType: 'access' | 'refresh'
  reason: RevocationReason
  revokedAt: Date
  expiresAt: Date
  metadata?: Record<string, any>
}

/**
 * Bulk revocation result interface
 */
export interface BulkRevocationResult {
  accessTokensRevoked: number
  refreshTokensRevoked: number
  totalRevoked: number
  errors: string[]
}

/**
 * JWT Blacklist and Revocation Utility
 * Manages token revocation and blacklisting for security purposes
 *
 * Note: In production, consider using Redis or a dedicated cache for blacklist
 * to improve performance for high-traffic applications
 */
@Injectable()
export class JwtBlacklistUtil {
  private readonly logger = new Logger(JwtBlacklistUtil.name)

  // In-memory blacklist for access tokens (production should use Redis)
  private readonly accessTokenBlacklist = new Map<string, BlacklistEntry>()
  private cleanupInterval?: NodeJS.Timeout

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtUtil: JwtUtil,
  ) {
    this.startCleanupInterval()
  }

  /**
   * Revoke a specific access token by JTI
   * @param jti - JWT ID to revoke
   * @param reason - Reason for revocation
   * @param metadata - Additional context
   */
  async revokeAccessToken(
    jti: string,
    reason: RevocationReason,
    metadata: {
      userId?: string
      adminId?: string
      ipAddress?: string
      userAgent?: string
    } = {},
  ): Promise<void> {
    try {
      // Determine token expiry (we don't need to verify signature for blacklisting)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // Default 15 minutes
      const userId = metadata.userId

      // Try to extract more info from the JTI if available
      if (!userId) {
        // In a real implementation, you might store JTI->userId mapping
        this.logger.warn(`Revoking access token without userId: ${jti}`)
      }

      const entry: BlacklistEntry = {
        jti,
        userId: userId || 'unknown',
        tokenType: 'access',
        reason,
        revokedAt: new Date(),
        expiresAt,
        metadata,
      }

      // Add to in-memory blacklist
      this.accessTokenBlacklist.set(jti, entry)

      // Log revocation event
      await this.authRepo.logSecurityEvent({
        userId,
        event: 'access_token_revoked',
        severity: this.getRevocationSeverity(reason),
        details: {
          jti,
          reason,
          revokedBy: metadata.adminId || userId,
          ...metadata,
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      })

      this.logger.log(`Access token revoked: ${jti} (reason: ${reason})`)
    }
    catch (error) {
      this.logger.error(`Failed to revoke access token ${jti}:`, error)
      throw error
    }
  }

  /**
   * Revoke a specific refresh token by JTI
   * @param jti - JWT ID to revoke
   * @param reason - Reason for revocation
   * @param metadata - Additional context
   */
  async revokeRefreshToken(
    jti: string,
    reason: RevocationReason,
    metadata: {
      userId?: string
      adminId?: string
      ipAddress?: string
      userAgent?: string
    } = {},
  ): Promise<void> {
    try {
      // For refresh tokens, mark as used in database
      await this.authRepo.markRefreshTokenAsUsed(jti)

      // Log revocation event
      await this.authRepo.logSecurityEvent({
        userId: metadata.userId,
        event: 'refresh_token_revoked',
        severity: this.getRevocationSeverity(reason),
        details: {
          jti,
          reason,
          revokedBy: metadata.adminId || metadata.userId,
          ...metadata,
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      })

      this.logger.log(`Refresh token revoked: ${jti} (reason: ${reason})`)
    }
    catch (error) {
      this.logger.error(`Failed to revoke refresh token ${jti}:`, error)
      throw error
    }
  }

  /**
   * Revoke all tokens for a specific user
   * @param userId - User ID whose tokens to revoke
   * @param reason - Reason for revocation
   * @param metadata - Additional context
   */
  async revokeAllUserTokens(
    userId: string,
    reason: RevocationReason,
    metadata: {
      adminId?: string
      ipAddress?: string
      userAgent?: string
    } = {},
  ): Promise<BulkRevocationResult> {
    const result: BulkRevocationResult = {
      accessTokensRevoked: 0,
      refreshTokensRevoked: 0,
      totalRevoked: 0,
      errors: [],
    }

    try {
      // Revoke all refresh tokens in database
      await this.authRepo.revokeAllUserRefreshTokens(userId)

      // Get count of revoked refresh tokens (for reporting)
      const refreshTokenStats = await this.authRepo.getRefreshTokenStats()
      result.refreshTokensRevoked = refreshTokenStats.used

      // For access tokens, we need to add all active user tokens to blacklist
      // In a real implementation, you'd query a token store or have JTI tracking
      // For now, we'll add a blanket user revocation entry
      const userRevocationEntry: BlacklistEntry = {
        jti: `user_revocation_${userId}_${Date.now()}`,
        userId,
        tokenType: 'access',
        reason,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: { bulkRevocation: true, ...metadata },
      }

      this.accessTokenBlacklist.set(`user_${userId}`, userRevocationEntry)
      result.accessTokensRevoked = 1 // Placeholder

      result.totalRevoked = result.accessTokensRevoked + result.refreshTokensRevoked

      // Log bulk revocation event
      await this.authRepo.logSecurityEvent({
        userId,
        event: 'user_tokens_bulk_revoked',
        severity: this.getRevocationSeverity(reason),
        details: {
          reason,
          accessTokensRevoked: result.accessTokensRevoked,
          refreshTokensRevoked: result.refreshTokensRevoked,
          totalRevoked: result.totalRevoked,
          revokedBy: metadata.adminId || userId,
          ...metadata,
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      })

      this.logger.log(`Bulk revocation completed for user ${userId}: ${result.totalRevoked} tokens revoked`)
      return result
    }
    catch (error) {
      result.errors.push(error.message)
      this.logger.error(`Failed to revoke user tokens for ${userId}:`, error)
      throw error
    }
  }

  /**
   * Check if an access token is blacklisted
   * @param jti - JWT ID to check
   * @param userId - Optional user ID for user-level revocation check
   * @returns true if token is blacklisted
   */
  isAccessTokenBlacklisted(jti: string, userId?: string): boolean {
    // Check specific token blacklist
    if (this.accessTokenBlacklist.has(jti)) {
      const entry = this.accessTokenBlacklist.get(jti)!

      // Check if blacklist entry is still valid (not expired)
      if (entry.expiresAt > new Date()) {
        return true
      }
      else {
        // Clean up expired entry
        this.accessTokenBlacklist.delete(jti)
      }
    }

    // Check user-level revocation if userId provided
    if (userId && this.accessTokenBlacklist.has(`user_${userId}`)) {
      const entry = this.accessTokenBlacklist.get(`user_${userId}`)!

      if (entry.expiresAt > new Date()) {
        return true
      }
      else {
        this.accessTokenBlacklist.delete(`user_${userId}`)
      }
    }

    return false
  }

  /**
   * Check if a refresh token is revoked (marked as used)
   * @param jti - JWT ID to check
   * @returns true if token is revoked
   */
  async isRefreshTokenRevoked(jti: string): Promise<boolean> {
    try {
      const token = await this.authRepo.findRefreshTokenByJti(jti)
      return !token || token.used || token.expiresAt < new Date()
    }
    catch (error) {
      this.logger.error(`Error checking refresh token revocation for ${jti}:`, error)
      return true // Assume revoked on error for security
    }
  }

  /**
   * Get blacklist statistics for monitoring
   */
  getBlacklistStats(): {
    activeAccessTokenEntries: number
    totalAccessTokenEntries: number
    oldestEntry: Date | null
    newestEntry: Date | null
  } {
    const entries = Array.from(this.accessTokenBlacklist.values())
    const activeEntries = entries.filter(entry => entry.expiresAt > new Date())

    return {
      activeAccessTokenEntries: activeEntries.length,
      totalAccessTokenEntries: entries.length,
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.revokedAt.getTime()))) : null,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.revokedAt.getTime()))) : null,
    }
  }

  /**
   * Cleanup expired blacklist entries
   */
  cleanupExpiredEntries(): number {
    const now = new Date()
    let cleaned = 0

    for (const [key, entry] of this.accessTokenBlacklist.entries()) {
      if (entry.expiresAt <= now) {
        this.accessTokenBlacklist.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired blacklist entries`)
    }

    return cleaned
  }

  /**
   * Emergency: Clear all blacklist entries (admin function)
   */
  clearBlacklist(adminId: string, reason: string): void {
    const entriesCount = this.accessTokenBlacklist.size
    this.accessTokenBlacklist.clear()

    this.authRepo.logSecurityEvent({
      event: 'blacklist_cleared',
      severity: 'high',
      details: {
        adminId,
        reason,
        entriesCleared: entriesCount,
      },
    })

    this.logger.warn(`Blacklist cleared by admin ${adminId}: ${entriesCount} entries removed (reason: ${reason})`)
  }

  /**
   * Extract token information safely for revocation operations
   * @param token - JWT token string
   * @returns Safe token information or null
   */
  extractTokenInfoForRevocation(token: string): {
    jti: string | null
    userId: string | null
    type: string | null
    expiresAt: Date | null
  } | null {
    try {
      const decoded = this.jwtUtil.decodeToken(token)
      if (!decoded)
        return null

      return {
        jti: decoded.jti || null,
        userId: decoded.sub || null,
        type: decoded.type || null,
        expiresAt: this.jwtUtil.getTokenExpiry(token),
      }
    }
    catch {
      return null
    }
  }

  /**
   * Determine severity level based on revocation reason
   */
  private getRevocationSeverity(reason: RevocationReason): 'low' | 'medium' | 'high' | 'critical' {
    switch (reason) {
      case RevocationReason.SECURITY_BREACH:
      case RevocationReason.TOKEN_COMPROMISE:
        return 'critical'

      case RevocationReason.SUSPICIOUS_ACTIVITY:
      case RevocationReason.ADMIN_ACTION:
        return 'high'

      case RevocationReason.PASSWORD_CHANGE:
      case RevocationReason.ACCOUNT_DEACTIVATION:
        return 'medium'

      case RevocationReason.USER_LOGOUT:
      default:
        return 'low'
    }
  }

  /**
   * Start periodic cleanup of expired blacklist entries
   */
  private startCleanupInterval(): void {
    // Clean up every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries()
    }, 30 * 60 * 1000)

    this.logger.log('JWT blacklist cleanup interval started (30 minutes)')
  }

  /**
   * Stop the cleanup interval (useful for testing and shutdown)
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
      this.logger.log('JWT blacklist cleanup interval stopped')
    }
  }
}
