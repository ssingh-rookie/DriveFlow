import type { TestingModule } from '@nestjs/testing'
import type { User } from '@prisma/client'
import type { JwtPayload } from '../utils/jwt.util'
import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { EnvConfigService } from '../../../core/config/env.config'
import { AuthRepository } from '../auth.repo'
import { JwtStrategy } from './jwt.strategy'

describe('jwtStrategy', () => {
  let jwtStrategy: JwtStrategy
  let authRepository: AuthRepository
  let envConfigService: EnvConfigService

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    phone: '+61400000000',
    password: 'hashed-password',
    externalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockValidPayload: JwtPayload = {
    sub: 'user-123',
    role: 'instructor',
    orgId: 'org-456',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    jti: 'jwt_123_abc',
    type: 'access',
  }

  const mockRequest = {
    method: 'GET',
    path: '/api/test',
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
    connection: { remoteAddress: '192.168.1.100' },
  }

  const mockEnvConfig = {
    jwtSecret: 'test-secret-key-that-is-at-least-32-characters-long',
  }

  const mockAuthRepository = {
    findUserById: jest.fn(),
    logAuthEvent: jest.fn(),
    logSecurityEvent: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: EnvConfigService,
          useValue: mockEnvConfig,
        },
        {
          provide: AuthRepository,
          useValue: mockAuthRepository,
        },
      ],
    }).compile()

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy)
    authRepository = module.get<AuthRepository>(AuthRepository)
    envConfigService = module.get<EnvConfigService>(EnvConfigService)

    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined()
  })

  describe('validate', () => {
    beforeEach(() => {
      mockAuthRepository.findUserById.mockResolvedValue(mockUser)
      mockAuthRepository.logAuthEvent.mockResolvedValue(undefined)
    })

    it('should validate a valid access token payload', async () => {
      const result = await jwtStrategy.validate(mockRequest, mockValidPayload)

      expect(result).toEqual({
        id: mockValidPayload.sub,
        email: mockUser.email,
        role: mockValidPayload.role,
        orgId: mockValidPayload.orgId,
        jti: mockValidPayload.jti,
        tokenType: mockValidPayload.type,
      })

      expect(mockAuthRepository.findUserById).toHaveBeenCalledWith(mockValidPayload.sub)
      expect(mockAuthRepository.logAuthEvent).toHaveBeenCalledWith({
        userId: mockValidPayload.sub,
        event: 'jwt_access_token_used',
        metadata: {
          orgId: mockValidPayload.orgId,
          role: mockValidPayload.role,
          jti: mockValidPayload.jti,
          endpoint: 'GET /api/test',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      })
    })

    it('should reject refresh token for regular endpoints', async () => {
      const refreshTokenPayload: JwtPayload = {
        ...mockValidPayload,
        type: 'refresh',
      }

      await expect(jwtStrategy.validate(mockRequest, refreshTokenPayload))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(jwtStrategy.validate(mockRequest, refreshTokenPayload))
        .rejects
        .toThrow('Invalid token type. Access token required.')
    })

    it('should reject token for non-existent user', async () => {
      mockAuthRepository.findUserById.mockResolvedValue(null)

      await expect(jwtStrategy.validate(mockRequest, mockValidPayload))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(jwtStrategy.validate(mockRequest, mockValidPayload))
        .rejects
        .toThrow('User not found or deactivated')
    })

    it('should reject token with invalid payload structure', async () => {
      const invalidPayload = {
        sub: 'user-123',
        // Missing required fields
      }

      await expect(jwtStrategy.validate(mockRequest, invalidPayload as any))
        .rejects
        .toThrow(UnauthorizedException)
    })

    it('should reject token with invalid role', async () => {
      const invalidRolePayload: JwtPayload = {
        ...mockValidPayload,
        role: 'invalid-role',
      }

      await expect(jwtStrategy.validate(mockRequest, invalidRolePayload))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(jwtStrategy.validate(mockRequest, invalidRolePayload))
        .rejects
        .toThrow('Invalid role: invalid-role')
    })

    it('should accept all valid roles', async () => {
      const validRoles = ['owner', 'admin', 'instructor', 'student']

      for (const role of validRoles) {
        const payload: JwtPayload = {
          ...mockValidPayload,
          role,
        }

        const result = await jwtStrategy.validate(mockRequest, payload)
        expect(result.role).toBe(role)
      }
    })

    it('should extract IP address from x-forwarded-for header', async () => {
      const result = await jwtStrategy.validate(mockRequest, mockValidPayload)

      expect(mockAuthRepository.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
        }),
      )
    })

    it('should extract IP address from connection when no forwarded header', async () => {
      const requestWithoutForwarded = {
        ...mockRequest,
        headers: { 'user-agent': 'test-agent' },
      }

      await jwtStrategy.validate(requestWithoutForwarded, mockValidPayload)

      expect(mockAuthRepository.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.100',
        }),
      )
    })

    it('should log security event on validation failure', async () => {
      mockAuthRepository.findUserById.mockRejectedValue(new Error('Database error'))
      mockAuthRepository.logSecurityEvent.mockResolvedValue(undefined)

      await expect(jwtStrategy.validate(mockRequest, mockValidPayload))
        .rejects
        .toThrow(UnauthorizedException)

      expect(mockAuthRepository.logSecurityEvent).toHaveBeenCalledWith({
        userId: mockValidPayload.sub,
        event: 'jwt_validation_failed',
        severity: 'medium',
        details: {
          error: 'Database error',
          payload: expect.objectContaining({
            sub: '***',
            role: 'instructor',
            orgId: 'org-456',
            type: 'access',
            jti: 'jwt_123_***',
          }),
          endpoint: 'GET /api/test',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      })
    })

    it('should validate payload with missing optional fields', async () => {
      const payloadWithoutOrgId: JwtPayload = {
        sub: 'user-123',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
        jti: 'jwt_123_abc',
        type: 'access',
        // orgId is optional
      }

      const result = await jwtStrategy.validate(mockRequest, payloadWithoutOrgId)

      expect(result).toEqual({
        id: payloadWithoutOrgId.sub,
        email: mockUser.email,
        role: payloadWithoutOrgId.role,
        orgId: undefined,
        jti: payloadWithoutOrgId.jti,
        tokenType: payloadWithoutOrgId.type,
      })
    })

    it('should handle missing JTI gracefully', async () => {
      const payloadWithoutJti = {
        ...mockValidPayload,
        jti: undefined,
      }

      await expect(jwtStrategy.validate(mockRequest, payloadWithoutJti as any))
        .rejects
        .toThrow('Token missing valid JTI')
    })

    it('should handle missing type gracefully', async () => {
      const payloadWithoutType = {
        ...mockValidPayload,
        type: undefined,
      }

      await expect(jwtStrategy.validate(mockRequest, payloadWithoutType as any))
        .rejects
        .toThrow('Token missing valid type')
    })

    it('should sanitize sensitive data in security logs', async () => {
      mockAuthRepository.findUserById.mockRejectedValue(new Error('Test error'))
      mockAuthRepository.logSecurityEvent.mockResolvedValue(undefined)

      await expect(jwtStrategy.validate(mockRequest, mockValidPayload))
        .rejects
        .toThrow(UnauthorizedException)

      const securityEventCall = mockAuthRepository.logSecurityEvent.mock.calls[0][0]
      expect(securityEventCall.details.payload.sub).toBe('***')
      expect(securityEventCall.details.payload.jti).toBe('jwt_123_***')
      expect(securityEventCall.details.payload.role).toBe('instructor') // Non-sensitive data preserved
    })
  })
})
