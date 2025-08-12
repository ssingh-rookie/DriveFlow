import type { TestingModule } from '@nestjs/testing'
import type { JwtPayload } from './jwt.util'
import { Test } from '@nestjs/testing'
import * as jwt from 'jsonwebtoken'
import { EnvConfigService } from '../../../core/config/env.config'
import { JwtUtil } from './jwt.util'

describe('jwtUtil', () => {
  let jwtUtil: JwtUtil
  let envConfigService: EnvConfigService

  const mockEnvConfig = {
    jwtSecret: 'test-secret-key-that-is-at-least-32-characters-long',
    jwtAccessTokenExpiry: '15m',
    jwtRefreshTokenExpiry: '7d',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtUtil,
        {
          provide: EnvConfigService,
          useValue: mockEnvConfig,
        },
      ],
    }).compile()

    jwtUtil = module.get<JwtUtil>(JwtUtil)
    envConfigService = module.get<EnvConfigService>(EnvConfigService)
  })

  it('should be defined', () => {
    expect(jwtUtil).toBeDefined()
  })

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = {
        userId: 'user-123',
        role: 'instructor',
        orgId: 'org-456',
      }

      const token = jwtUtil.generateAccessToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      // Verify the token structure
      const decoded = jwt.decode(token) as JwtPayload
      expect(decoded.sub).toBe(payload.userId)
      expect(decoded.role).toBe(payload.role)
      expect(decoded.orgId).toBe(payload.orgId)
      expect(decoded.type).toBe('access')
      expect(decoded.jti).toBeDefined()
      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
    })

    it('should generate tokens with different JTIs', () => {
      const payload = {
        userId: 'user-123',
        role: 'instructor',
      }

      const token1 = jwtUtil.generateAccessToken(payload)
      const token2 = jwtUtil.generateAccessToken(payload)

      const decoded1 = jwt.decode(token1) as JwtPayload
      const decoded2 = jwt.decode(token2) as JwtPayload

      expect(decoded1.jti).not.toBe(decoded2.jti)
    })

    it('should set correct expiry time for access token', () => {
      const beforeGeneration = Math.floor(Date.now() / 1000)
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })
      const afterGeneration = Math.floor(Date.now() / 1000)

      const decoded = jwt.decode(token) as JwtPayload
      const expectedExpiry = beforeGeneration + (15 * 60) // 15 minutes

      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry)
      expect(decoded.exp).toBeLessThanOrEqual(afterGeneration + (15 * 60))
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        role: 'instructor',
        orgId: 'org-456',
        rotationId: 'rotation-789',
      }

      const token = jwtUtil.generateRefreshToken(payload)
      expect(token).toBeDefined()

      const decoded = jwt.decode(token) as JwtPayload
      expect(decoded.sub).toBe(payload.userId)
      expect(decoded.role).toBe(payload.role)
      expect(decoded.orgId).toBe(payload.orgId)
      expect(decoded.type).toBe('refresh')
      expect(decoded.rotationId).toBe(payload.rotationId)
    })

    it('should set correct expiry time for refresh token', () => {
      const beforeGeneration = Math.floor(Date.now() / 1000)
      const token = jwtUtil.generateRefreshToken({
        userId: 'user-123',
        role: 'instructor',
        rotationId: 'rotation-789',
      })

      const decoded = jwt.decode(token) as JwtPayload
      const expectedExpiry = beforeGeneration + (7 * 24 * 60 * 60) // 7 days

      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const originalPayload = {
        userId: 'user-123',
        role: 'instructor',
        orgId: 'org-456',
      }

      const token = jwtUtil.generateAccessToken(originalPayload)
      const verified = jwtUtil.verifyToken(token)

      expect(verified.sub).toBe(originalPayload.userId)
      expect(verified.role).toBe(originalPayload.role)
      expect(verified.orgId).toBe(originalPayload.orgId)
      expect(verified.type).toBe('access')
    })

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here'

      expect(() => jwtUtil.verifyToken(invalidToken)).toThrow('Invalid token')
    })

    it('should throw error for token with wrong secret', () => {
      const token = jwt.sign(
        { sub: 'user-123', role: 'instructor', type: 'access' },
        'wrong-secret',
      )

      expect(() => jwtUtil.verifyToken(token)).toThrow('Invalid token')
    })

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          role: 'instructor',
          type: 'access',
          iat: Math.floor(Date.now() / 1000) - 3600,
          exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30 minutes ago
        },
        mockEnvConfig.jwtSecret,
      )

      expect(() => jwtUtil.verifyToken(expiredToken)).toThrow('Token has expired')
    })
  })

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const payload = {
        userId: 'user-123',
        role: 'instructor',
      }

      const token = jwtUtil.generateAccessToken(payload)
      const decoded = jwtUtil.decodeToken(token)

      expect(decoded).toBeDefined()
      expect(decoded!.sub).toBe(payload.userId)
      expect(decoded!.role).toBe(payload.role)
    })

    it('should decode expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          role: 'instructor',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) - 1800,
        },
        'any-secret',
      )

      const decoded = jwtUtil.decodeToken(expiredToken)
      expect(decoded).toBeDefined()
      expect(decoded!.sub).toBe('user-123')
    })

    it('should return null for malformed token', () => {
      const malformedToken = 'not.a.token'

      expect(() => jwtUtil.decodeToken(malformedToken)).toThrow('Failed to decode token')
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })

      expect(jwtUtil.isTokenExpired(token)).toBe(false)
    })

    it('should return true for expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          role: 'instructor',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) - 1800,
        },
        mockEnvConfig.jwtSecret,
      )

      expect(jwtUtil.isTokenExpired(expiredToken)).toBe(true)
    })

    it('should return true for malformed token', () => {
      expect(jwtUtil.isTokenExpired('invalid.token')).toBe(true)
    })
  })

  describe('getTokenExpiry', () => {
    it('should return correct expiry date', () => {
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })

      const expiry = jwtUtil.getTokenExpiry(token)
      expect(expiry).toBeInstanceOf(Date)
      expect(expiry!.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return null for invalid token', () => {
      const expiry = jwtUtil.getTokenExpiry('invalid.token')
      expect(expiry).toBeNull()
    })
  })

  describe('extractUserId', () => {
    it('should extract user ID from token', () => {
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })

      const userId = jwtUtil.extractUserId(token)
      expect(userId).toBe('user-123')
    })

    it('should return null for invalid token', () => {
      const userId = jwtUtil.extractUserId('invalid.token')
      expect(userId).toBeNull()
    })
  })

  describe('extractJti', () => {
    it('should extract JTI from token', () => {
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })

      const jti = jwtUtil.extractJti(token)
      expect(jti).toBeDefined()
      expect(typeof jti).toBe('string')
      expect(jti).toMatch(/^jwt_\d+_[a-z0-9]+$/)
    })

    it('should return null for invalid token', () => {
      const jti = jwtUtil.extractJti('invalid.token')
      expect(jti).toBeNull()
    })
  })

  describe('generateJwtId', () => {
    it('should generate unique JWT IDs', () => {
      const jti1 = jwtUtil.generateJwtId()
      const jti2 = jwtUtil.generateJwtId()

      expect(jti1).not.toBe(jti2)
      expect(jti1).toMatch(/^jwt_\d+_[a-z0-9]+$/)
      expect(jti2).toMatch(/^jwt_\d+_[a-z0-9]+$/)
    })
  })

  describe('generateRotationId', () => {
    it('should generate unique rotation IDs', () => {
      const rot1 = jwtUtil.generateRotationId()
      const rot2 = jwtUtil.generateRotationId()

      expect(rot1).not.toBe(rot2)
      expect(rot1).toMatch(/^rot_\d+_[a-z0-9]+$/)
      expect(rot2).toMatch(/^rot_\d+_[a-z0-9]+$/)
    })
  })

  describe('hashToken', () => {
    it('should generate consistent hash for same token', () => {
      const token = 'test-token'
      const hash1 = jwtUtil.hashToken(token)
      const hash2 = jwtUtil.hashToken(token)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex string
    })

    it('should generate different hashes for different tokens', () => {
      const hash1 = jwtUtil.hashToken('token1')
      const hash2 = jwtUtil.hashToken('token2')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('getTimeUntilExpiry', () => {
    it('should return correct time until expiry', () => {
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })

      const timeUntilExpiry = jwtUtil.getTimeUntilExpiry(token)
      expect(timeUntilExpiry).toBeGreaterThan(14 * 60) // At least 14 minutes
      expect(timeUntilExpiry).toBeLessThanOrEqual(15 * 60) // At most 15 minutes
    })

    it('should return 0 for expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          role: 'instructor',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) - 1800,
        },
        mockEnvConfig.jwtSecret,
      )

      const timeUntilExpiry = jwtUtil.getTimeUntilExpiry(expiredToken)
      expect(timeUntilExpiry).toBe(0)
    })
  })

  describe('willExpireWithin', () => {
    it('should return true if token expires within timeframe', () => {
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })

      // Token expires in 15 minutes, check if expires within 20 minutes
      const willExpire = jwtUtil.willExpireWithin(token, 20 * 60)
      expect(willExpire).toBe(true)
    })

    it('should return false if token expires outside timeframe', () => {
      const token = jwtUtil.generateAccessToken({
        userId: 'user-123',
        role: 'instructor',
      })

      // Token expires in 15 minutes, check if expires within 10 minutes
      const willExpire = jwtUtil.willExpireWithin(token, 10 * 60)
      expect(willExpire).toBe(false)
    })

    it('should return false for expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          role: 'instructor',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) - 1800,
        },
        mockEnvConfig.jwtSecret,
      )

      const willExpire = jwtUtil.willExpireWithin(expiredToken, 60)
      expect(willExpire).toBe(false)
    })
  })
})
