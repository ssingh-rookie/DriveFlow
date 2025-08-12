import type { EnvConfigService } from '../../../core/config/env.config'
import type { AuthRepository } from '../auth.repo'
import type { JwtPayload } from '../utils/jwt.util'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

/**
 * User context interface for authenticated requests
 * Contains all necessary information for authorization
 */
export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  orgId?: string
  jti: string
  tokenType: 'access' | 'refresh'
}

/**
 * JWT authentication strategy using Passport
 * Validates access tokens and populates user context
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly envConfig: EnvConfigService,
    private readonly authRepo: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig.jwtSecret,
      algorithms: ['HS256'],
      // Pass request to validate method for additional context
      passReqToCallback: true,
    })
  }

  /**
   * Validate JWT payload and populate user context
   * This method is called after JWT signature and expiry validation
   * @param req - Express request object
   * @param payload - Decoded JWT payload
   * @returns User context for authenticated requests
   * @throws UnauthorizedException if validation fails
   */
  async validate(req: any, payload: JwtPayload): Promise<AuthenticatedUser> {
    try {
      // Validate payload structure
      this.validateJwtPayload(payload)

      // Only allow access tokens for most endpoints
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type. Access token required.')
      }

      // Verify user still exists and is active
      const user = await this.authRepo.findUserById(payload.sub)
      if (!user) {
        throw new UnauthorizedException('User not found or deactivated')
      }

      // Log authentication event for audit
      await this.authRepo.logAuthEvent({
        userId: payload.sub,
        event: 'jwt_access_token_used',
        metadata: {
          orgId: payload.orgId,
          role: payload.role,
          jti: payload.jti,
          endpoint: `${req.method} ${req.path}`,
        },
        ipAddress: this.extractIpAddress(req),
        userAgent: req.headers['user-agent'],
      })

      // Return authenticated user context
      return {
        id: payload.sub,
        email: user.email,
        role: payload.role,
        orgId: payload.orgId,
        jti: payload.jti!,
        tokenType: payload.type,
      }
    }
    catch (error) {
      // Log security event for failed authentication
      await this.authRepo.logSecurityEvent({
        userId: payload?.sub,
        event: 'jwt_validation_failed',
        severity: 'medium',
        details: {
          error: error.message,
          payload: this.sanitizePayloadForLogging(payload),
          endpoint: `${req.method} ${req.path}`,
        },
        ipAddress: this.extractIpAddress(req),
        userAgent: req.headers['user-agent'],
      })

      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('Token validation failed')
    }
  }

  /**
   * Validate JWT payload structure and required claims
   * @param payload - JWT payload to validate
   * @throws UnauthorizedException if payload is invalid
   */
  private validateJwtPayload(payload: any): asserts payload is JwtPayload {
    if (!payload || typeof payload !== 'object') {
      throw new UnauthorizedException('Invalid token payload')
    }

    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Token missing valid user ID')
    }

    if (!payload.role || typeof payload.role !== 'string') {
      throw new UnauthorizedException('Token missing valid role')
    }

    if (!payload.type || !['access', 'refresh'].includes(payload.type)) {
      throw new UnauthorizedException('Token missing valid type')
    }

    if (!payload.jti || typeof payload.jti !== 'string') {
      throw new UnauthorizedException('Token missing valid JTI')
    }

    if (!payload.iat || typeof payload.iat !== 'number') {
      throw new UnauthorizedException('Token missing valid issued at time')
    }

    if (!payload.exp || typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Token missing valid expiry time')
    }

    // Validate role is one of the expected values
    const validRoles = ['owner', 'admin', 'instructor', 'student']
    if (!validRoles.includes(payload.role)) {
      throw new UnauthorizedException(`Invalid role: ${payload.role}`)
    }
  }

  /**
   * Extract IP address from request with proxy support
   * @param req - Express request object
   * @returns Client IP address
   */
  private extractIpAddress(req: any): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || req.socket?.remoteAddress
      || 'unknown'
    )
  }

  /**
   * Sanitize JWT payload for logging (remove sensitive data)
   * @param payload - JWT payload to sanitize
   * @returns Sanitized payload safe for logging
   */
  private sanitizePayloadForLogging(payload: any): any {
    if (!payload)
      return null

    return {
      sub: payload.sub ? '***' : undefined,
      role: payload.role,
      orgId: payload.orgId,
      type: payload.type,
      iat: payload.iat,
      exp: payload.exp,
      jti: payload.jti ? `${payload.jti.slice(0, 8)}***` : undefined,
    }
  }
}
