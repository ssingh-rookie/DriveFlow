import type { TestingModule } from '@nestjs/testing'
import type { JwtPayload } from './jwt.util'
import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { EnvConfigService } from '../../../core/config/env.config'
import { AuthRepository } from '../auth.repo'
import { JwtUtil } from './jwt.util'
import { RefreshTokenRotationUtil } from './refresh-token-rotation.util'

describe('refreshTokenRotationUtil', () => {
  let service: RefreshTokenRotationUtil
  let authRepo: AuthRepository
  let jwtUtil: JwtUtil
  let envConfig: EnvConfigService

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    phone: '+61400000000',
    password: 'hashed-password',
    externalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockRefreshTokenPayload: JwtPayload = {
    sub: 'user-123',
    role: 'instructor',
    orgId: 'org-456',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    jti: 'jwt_123_abc',
    type: 'refresh',
    rotationId: 'rot_123_def',
  }

  const mockStoredToken = {
    id: 'token-1',
    userId: 'user-123',
    jti: 'jwt_123_abc',
    rotationId: 'rot_123_def',
    tokenHash: 'hashed-token-value',
    used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
  }

  const mockClientInfo = {
    ipAddress: '192.168.1.1',
    userAgent: 'test-agent',
  }

  const mockAuthRepo = {
    findRefreshTokenByJti: jest.fn(),
    markRefreshTokenAsUsed: jest.fn(),
    findUserById: jest.fn(),
    countUserActiveRefreshTokens: jest.fn(),
    createRefreshToken: jest.fn(),
    revokeRefreshTokensByRotationId: jest.fn(),
    deleteRefreshToken: jest.fn(),
    getUserRefreshTokens: jest.fn(),
    logAuthEvent: jest.fn(),
    logSecurityEvent: jest.fn(),
  }

  const mockJwtUtil = {
    verifyToken: jest.fn(),
    hashToken: jest.fn(),
    generateRotationId: jest.fn(),
    generateJwtId: jest.fn(),
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    extractJti: jest.fn(),
    decodeToken: jest.fn(),
    isTokenExpired: jest.fn(),
  }

  const mockEnvConfig = {
    jwtMaxRefreshTokensPerUser: 5,
    jwtRefreshTokenExpiry: '7d',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenRotationUtil,
        {
          provide: AuthRepository,
          useValue: mockAuthRepo,
        },
        {
          provide: JwtUtil,
          useValue: mockJwtUtil,
        },
        {
          provide: EnvConfigService,
          useValue: mockEnvConfig,
        },
      ],
    }).compile()

    service = module.get<RefreshTokenRotationUtil>(RefreshTokenRotationUtil)
    authRepo = module.get<AuthRepository>(AuthRepository)
    jwtUtil = module.get<JwtUtil>(JwtUtil)
    envConfig = module.get<EnvConfigService>(EnvConfigService)

    // Clear all mocks before each test
    jest.clearAllMocks()

    // Setup default mock implementations
    mockJwtUtil.verifyToken.mockReturnValue(mockRefreshTokenPayload)
    mockJwtUtil.hashToken.mockReturnValue('hashed-token-value')
    mockJwtUtil.generateRotationId.mockReturnValue('rot_456_ghi')
    mockJwtUtil.generateJwtId.mockReturnValue('jwt_456_def')
    mockJwtUtil.generateAccessToken.mockReturnValue('new-access-token')
    mockJwtUtil.generateRefreshToken.mockReturnValue('new-refresh-token')
    mockJwtUtil.extractJti.mockReturnValue('jwt_456_def')

    mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(mockStoredToken)
    mockAuthRepo.findUserById.mockResolvedValue(mockUser)
    mockAuthRepo.countUserActiveRefreshTokens.mockResolvedValue(2)
    mockAuthRepo.markRefreshTokenAsUsed.mockResolvedValue(undefined)
    mockAuthRepo.createRefreshToken.mockResolvedValue(undefined)
    mockAuthRepo.logAuthEvent.mockResolvedValue(undefined)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('rotateRefreshToken', () => {
    it('should successfully rotate a valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token'

      const result = await service.rotateRefreshToken(refreshToken, mockClientInfo)

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        rotationId: 'rot_456_ghi',
        expiresAt: expect.any(Date),
      })

      expect(mockJwtUtil.verifyToken).toHaveBeenCalledWith(refreshToken)
      expect(mockAuthRepo.findRefreshTokenByJti).toHaveBeenCalledWith('jwt_123_abc')
      expect(mockAuthRepo.markRefreshTokenAsUsed).toHaveBeenCalledWith('jwt_123_abc')
      expect(mockAuthRepo.findUserById).toHaveBeenCalledWith('user-123')
      expect(mockAuthRepo.createRefreshToken).toHaveBeenCalled()
      expect(mockAuthRepo.logAuthEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        event: 'refresh_token_rotated',
        metadata: expect.objectContaining({
          oldRotationId: 'rot_123_def',
          newRotationId: 'rot_456_ghi',
        }),
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      })
    })

    it('should reject access tokens', async () => {
      const accessTokenPayload = { ...mockRefreshTokenPayload, type: 'access' }
      mockJwtUtil.verifyToken.mockReturnValue(accessTokenPayload)

      await expect(service.rotateRefreshToken('access-token', mockClientInfo))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(service.rotateRefreshToken('access-token', mockClientInfo))
        .rejects
        .toThrow('Invalid token type. Refresh token required.')
    })

    it('should reject tokens with invalid structure', async () => {
      const invalidPayload = { ...mockRefreshTokenPayload, jti: undefined }
      mockJwtUtil.verifyToken.mockReturnValue(invalidPayload)

      await expect(service.rotateRefreshToken('invalid-token', mockClientInfo))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(service.rotateRefreshToken('invalid-token', mockClientInfo))
        .rejects
        .toThrow('Invalid refresh token structure')
    })

    it('should handle token not found in database', async () => {
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(null)

      await expect(service.rotateRefreshToken('unknown-token', mockClientInfo))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(service.rotateRefreshToken('unknown-token', mockClientInfo))
        .rejects
        .toThrow('Refresh token not found or already used')

      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        event: 'refresh_token_suspicious_activity',
        severity: 'high',
        details: {
          reason: 'token_not_found',
          rotationId: 'rot_123_def',
          jti: 'jwt_123_abc',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      })
    })

    it('should handle replay attack (already used token)', async () => {
      const usedToken = { ...mockStoredToken, used: true }
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(usedToken)

      await expect(service.rotateRefreshToken('used-token', mockClientInfo))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(service.rotateRefreshToken('used-token', mockClientInfo))
        .rejects
        .toThrow('Refresh token already used')

      expect(mockAuthRepo.revokeRefreshTokensByRotationId).toHaveBeenCalledWith('rot_123_def')
      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        event: 'refresh_token_replay_attack',
        severity: 'critical',
        details: {
          rotationId: 'rot_123_def',
          jti: 'jwt_123_abc',
          message: 'Used refresh token presented again - rotation chain revoked',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      })
    })

    it('should handle expired tokens', async () => {
      const expiredToken = {
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
      }
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(expiredToken)

      await expect(service.rotateRefreshToken('expired-token', mockClientInfo))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(service.rotateRefreshToken('expired-token', mockClientInfo))
        .rejects
        .toThrow('Refresh token has expired')

      expect(mockAuthRepo.deleteRefreshToken).toHaveBeenCalledWith('jwt_123_abc')
    })

    it('should handle token hash mismatch', async () => {
      mockJwtUtil.hashToken.mockReturnValue('different-hash')

      await expect(service.rotateRefreshToken('tampered-token', mockClientInfo))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(service.rotateRefreshToken('tampered-token', mockClientInfo))
        .rejects
        .toThrow('Invalid refresh token')

      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        event: 'refresh_token_suspicious_activity',
        severity: 'high',
        details: {
          reason: 'token_hash_mismatch',
          rotationId: 'rot_123_def',
          jti: 'jwt_123_abc',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      })
    })

    it('should handle deactivated user', async () => {
      mockAuthRepo.findUserById.mockResolvedValue(null)

      await expect(service.rotateRefreshToken('valid-token', mockClientInfo))
        .rejects
        .toThrow(UnauthorizedException)
      await expect(service.rotateRefreshToken('valid-token', mockClientInfo))
        .rejects
        .toThrow('User not found or deactivated')
    })

    it('should warn about too many active tokens but still proceed', async () => {
      mockAuthRepo.countUserActiveRefreshTokens.mockResolvedValue(10) // Over limit
      const loggerWarnSpy = jest.spyOn(service.logger, 'warn').mockImplementation()

      const result = await service.rotateRefreshToken('valid-token', mockClientInfo)

      expect(result.accessToken).toBe('new-access-token')
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'User user-123 has too many active refresh tokens: 10',
      )

      loggerWarnSpy.mockRestore()
    })

    it('should mark old token as used before creating new one', async () => {
      const callOrder: string[] = []

      mockAuthRepo.markRefreshTokenAsUsed.mockImplementation(async () => {
        callOrder.push('markUsed')
      })

      mockAuthRepo.createRefreshToken.mockImplementation(async () => {
        callOrder.push('createToken')
      })

      await service.rotateRefreshToken('valid-token', mockClientInfo)

      // Verify order: mark used is called before create
      expect(mockAuthRepo.markRefreshTokenAsUsed).toHaveBeenCalledWith('jwt_123_abc')
      expect(mockAuthRepo.createRefreshToken).toHaveBeenCalled()
      expect(callOrder).toEqual(['markUsed', 'createToken'])
    })

    it('should handle JWT verification errors', async () => {
      mockJwtUtil.verifyToken.mockImplementation(() => {
        throw new Error('JWT expired')
      })

      await expect(service.rotateRefreshToken('invalid-jwt', mockClientInfo))
        .rejects
        .toThrow('JWT expired')

      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        event: 'refresh_token_rotation_failed',
        severity: 'high',
        details: {
          error: 'JWT expired',
          tokenStructure: expect.any(Object),
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      })
    })

    it('should schedule cleanup of rotation chain asynchronously', async () => {
      jest.useFakeTimers()
      mockAuthRepo.getUserRefreshTokens.mockResolvedValue([
        { ...mockStoredToken, used: true, createdAt: new Date(Date.now() - 60000) },
        { ...mockStoredToken, id: 'token-2', jti: 'jwt_456_def', used: true, createdAt: new Date() },
      ])

      await service.rotateRefreshToken('valid-token', mockClientInfo)

      // Fast-forward the cleanup timeout
      jest.advanceTimersByTime(5000)

      // Allow async operations to complete
      await jest.runOnlyPendingTimersAsync()

      expect(mockAuthRepo.getUserRefreshTokens).toHaveBeenCalledWith('user-123')
      expect(mockAuthRepo.deleteRefreshToken).toHaveBeenCalledWith('jwt_123_abc')

      jest.useRealTimers()
    }, 10000)
  })

  describe('validateRefreshToken', () => {
    it('should validate a valid refresh token', async () => {
      const result = await service.validateRefreshToken('valid-refresh-token')

      expect(result.isValid).toBe(true)
      expect(result.payload).toEqual(mockRefreshTokenPayload)
      expect(result.storedToken).toEqual(mockStoredToken)
    })

    it('should reject access tokens', async () => {
      const accessTokenPayload = { ...mockRefreshTokenPayload, type: 'access' }
      mockJwtUtil.verifyToken.mockReturnValue(accessTokenPayload)

      const result = await service.validateRefreshToken('access-token')

      expect(result.isValid).toBe(false)
      expect(result.payload).toBeUndefined()
      expect(result.storedToken).toBeUndefined()
    })

    it('should reject tokens not found in database', async () => {
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(null)

      const result = await service.validateRefreshToken('unknown-token')

      expect(result.isValid).toBe(false)
    })

    it('should reject used tokens', async () => {
      const usedToken = { ...mockStoredToken, used: true }
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(usedToken)

      const result = await service.validateRefreshToken('used-token')

      expect(result.isValid).toBe(false)
    })

    it('should reject expired tokens', async () => {
      const expiredToken = {
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 60000),
      }
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(expiredToken)

      const result = await service.validateRefreshToken('expired-token')

      expect(result.isValid).toBe(false)
    })

    it('should reject tokens with hash mismatch', async () => {
      mockJwtUtil.hashToken.mockReturnValue('different-hash')

      const result = await service.validateRefreshToken('tampered-token')

      expect(result.isValid).toBe(false)
    })

    it('should handle JWT verification errors gracefully', async () => {
      mockJwtUtil.verifyToken.mockImplementation(() => {
        throw new Error('JWT malformed')
      })

      const result = await service.validateRefreshToken('invalid-jwt')

      expect(result.isValid).toBe(false)
    })
  })
})
