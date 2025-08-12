import type { EnvConfigService } from '../../../core/config/env.config'
import { Injectable } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'

/**
 * JWT token payload interface based on the PRD requirements
 */
export interface JwtPayload {
  sub: string // User ID
  role: string // OrgRole: owner, admin, instructor, student
  orgId?: string // Organization ID for multi-tenancy
  iat: number // Issued at timestamp
  exp: number // Expiry timestamp
  jti?: string // JWT ID for token tracking
  type: 'access' | 'refresh' // Token type
  rotationId?: string // For refresh token rotation tracking
}

/**
 * JWT token generation and verification utility
 * Provides secure token operations with proper claims and validation
 */
@Injectable()
export class JwtUtil {
  constructor(private readonly envConfig: EnvConfigService) {}

  /**
   * Generate an access token with user claims
   * @param payload - User information for token claims
   * @returns Signed JWT access token
   */
  generateAccessToken(payload: {
    userId: string
    role: string
    orgId?: string
  }): string {
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload: JwtPayload = {
      sub: payload.userId,
      role: payload.role,
      orgId: payload.orgId,
      iat: now,
      exp: now + this.parseTimeToSeconds(this.envConfig.jwtAccessTokenExpiry),
      type: 'access',
      jti: this.generateJwtId(),
    }

    return jwt.sign(jwtPayload, this.envConfig.jwtSecret, {
      algorithm: 'HS256',
    })
  }

  /**
   * Generate a refresh token with rotation tracking
   * @param payload - User information and rotation data
   * @returns Signed JWT refresh token
   */
  generateRefreshToken(payload: {
    userId: string
    role: string
    orgId?: string
    rotationId: string
  }): string {
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload: JwtPayload = {
      sub: payload.userId,
      role: payload.role,
      orgId: payload.orgId,
      iat: now,
      exp: now + this.parseTimeToSeconds(this.envConfig.jwtRefreshTokenExpiry),
      type: 'refresh',
      jti: this.generateJwtId(),
      rotationId: payload.rotationId,
    }

    return jwt.sign(jwtPayload, this.envConfig.jwtSecret, {
      algorithm: 'HS256',
    })
  }

  /**
   * Verify and decode a JWT token
   * @param token - JWT token to verify
   * @returns Decoded JWT payload if valid
   * @throws Error if token is invalid, expired, or malformed
   */
  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.envConfig.jwtSecret, {
        algorithms: ['HS256'],
      }) as JwtPayload

      // Validate token structure
      this.validateTokenPayload(decoded)

      return decoded
    }
    catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TypeError('Token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new TypeError(`Invalid token: ${error.message}`)
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new TypeError('Token not active yet')
      }
      throw new Error(`Token verification failed: ${error.message}`)
    }
  }

  /**
   * Decode a JWT token without verification (useful for extracting claims from expired tokens)
   * @param token - JWT token to decode
   * @returns Decoded JWT payload without verification
   * @throws Error if token is malformed
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload
      if (!decoded) {
        throw new Error('Token is null or malformed')
      }
      return decoded
    }
    catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`)
    }
  }

  /**
   * Check if a token is expired without full verification
   * @param token - JWT token to check
   * @returns true if token is expired, false otherwise
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token)
      if (!decoded || !decoded.exp) {
        return true
      }

      const now = Math.floor(Date.now() / 1000)
      return decoded.exp < now
    }
    catch {
      return true // If we can't decode, consider it expired
    }
  }

  /**
   * Get token expiry date
   * @param token - JWT token
   * @returns Date object representing token expiry
   */
  getTokenExpiry(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token)
      if (!decoded || !decoded.exp) {
        return null
      }
      return new Date(decoded.exp * 1000)
    }
    catch {
      return null
    }
  }

  /**
   * Extract user ID from token without full verification
   * @param token - JWT token
   * @returns User ID or null if extraction fails
   */
  extractUserId(token: string): string | null {
    try {
      const decoded = this.decodeToken(token)
      return decoded?.sub || null
    }
    catch {
      return null
    }
  }

  /**
   * Extract JTI (JWT ID) from token
   * @param token - JWT token
   * @returns JTI or null if extraction fails
   */
  extractJti(token: string): string | null {
    try {
      const decoded = this.decodeToken(token)
      return decoded?.jti || null
    }
    catch {
      return null
    }
  }

  /**
   * Generate a unique JWT ID for token tracking
   * @returns Unique JTI string
   */
  generateJwtId(): string {
    return `jwt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate a rotation ID for refresh token rotation
   * @returns Unique rotation ID string
   */
  generateRotationId(): string {
    return `rot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create token hash for database storage (for refresh tokens)
   * @param token - Token to hash
   * @returns SHA-256 hash of the token
   */
  hashToken(token: string): string {
    const crypto = require('node:crypto')
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * Validate the structure of a JWT payload
   * @param payload - JWT payload to validate
   * @throws Error if payload is invalid
   */
  private validateTokenPayload(payload: any): asserts payload is JwtPayload {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid token payload structure')
    }

    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Token missing valid subject (sub) claim')
    }

    if (!payload.role || typeof payload.role !== 'string') {
      throw new Error('Token missing valid role claim')
    }

    if (!payload.type || !['access', 'refresh'].includes(payload.type)) {
      throw new Error('Token missing valid type claim')
    }

    if (!payload.iat || typeof payload.iat !== 'number') {
      throw new Error('Token missing valid issued at (iat) claim')
    }

    if (!payload.exp || typeof payload.exp !== 'number') {
      throw new Error('Token missing valid expiry (exp) claim')
    }

    // Validate refresh token specific claims
    if (payload.type === 'refresh') {
      if (!payload.rotationId || typeof payload.rotationId !== 'string') {
        throw new Error('Refresh token missing valid rotation ID')
      }
    }
  }

  /**
   * Parse time string (like "15m", "7d") to seconds
   * @param timeStr - Time string to parse
   * @returns Time in seconds
   */
  private parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/)
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`)
    }

    const value = Number.parseInt(match[1], 10)
    const unit = match[2]

    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 60 * 60
      case 'd': return value * 60 * 60 * 24
      default:
        throw new Error(`Unsupported time unit: ${unit}`)
    }
  }

  /**
   * Get time remaining until token expires
   * @param token - JWT token
   * @returns Time remaining in seconds, or 0 if expired/invalid
   */
  getTimeUntilExpiry(token: string): number {
    try {
      const decoded = this.decodeToken(token)
      if (!decoded || !decoded.exp) {
        return 0
      }

      const now = Math.floor(Date.now() / 1000)
      const remaining = decoded.exp - now
      return Math.max(0, remaining)
    }
    catch {
      return 0
    }
  }

  /**
   * Check if token will expire within a certain time frame
   * @param token - JWT token
   * @param withinSeconds - Check if expires within this many seconds
   * @returns true if token expires within the timeframe
   */
  willExpireWithin(token: string, withinSeconds: number): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry(token)
    return timeUntilExpiry > 0 && timeUntilExpiry <= withinSeconds
  }
}
