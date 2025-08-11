import { Test, TestingModule } from '@nestjs/testing';
import { JwtBlacklistUtil, RevocationReason, BlacklistEntry, BulkRevocationResult } from './jwt-blacklist.util';
import { AuthRepository } from '../auth.repo';
import { JwtUtil } from './jwt.util';

describe('JwtBlacklistUtil', () => {
  let service: JwtBlacklistUtil;
  let authRepo: AuthRepository;
  let jwtUtil: JwtUtil;

  const mockAuthRepo = {
    markRefreshTokenAsUsed: jest.fn(),
    revokeAllUserRefreshTokens: jest.fn(),
    getRefreshTokenStats: jest.fn(),
    findRefreshTokenByJti: jest.fn(),
    logSecurityEvent: jest.fn(),
  };

  const mockJwtUtil = {
    decodeToken: jest.fn(),
    getTokenExpiry: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: JwtBlacklistUtil,
          useFactory: (authRepo: AuthRepository, jwtUtil: JwtUtil) => {
            // Disable cleanup interval for testing
            return new JwtBlacklistUtil(authRepo, jwtUtil);
          },
          inject: [AuthRepository, JwtUtil],
        },
        {
          provide: AuthRepository,
          useValue: mockAuthRepo,
        },
        {
          provide: JwtUtil,
          useValue: mockJwtUtil,
        },
      ],
    }).compile();

    service = module.get<JwtBlacklistUtil>(JwtBlacklistUtil);
    authRepo = module.get<AuthRepository>(AuthRepository);
    jwtUtil = module.get<JwtUtil>(JwtUtil);

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Clear the blacklist
    service['accessTokenBlacklist'].clear();

    // Setup default mock implementations
    mockAuthRepo.logSecurityEvent.mockResolvedValue(undefined);
    mockAuthRepo.revokeAllUserRefreshTokens.mockResolvedValue(undefined);
    mockAuthRepo.getRefreshTokenStats.mockResolvedValue({
      total: 10,
      active: 5,
      expired: 2,
      used: 3,
    });
  });

  afterEach(() => {
    service.stopCleanupInterval();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('revokeAccessToken', () => {
    it('should revoke an access token and add to blacklist', async () => {
      const jti = 'jwt_123_abc';
      const metadata = {
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      };

      await service.revokeAccessToken(jti, RevocationReason.USER_LOGOUT, metadata);

      expect(service.isAccessTokenBlacklisted(jti)).toBe(true);
      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        event: 'access_token_revoked',
        severity: 'low',
        details: {
          jti,
          reason: RevocationReason.USER_LOGOUT,
          revokedBy: 'user-123',
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should handle revocation without userId', async () => {
      const jti = 'jwt_456_def';
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.revokeAccessToken(jti, RevocationReason.ADMIN_ACTION);

      expect(service.isAccessTokenBlacklisted(jti)).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalledWith(`Revoking access token without userId: ${jti}`);

      loggerWarnSpy.mockRestore();
    });

    it('should set correct severity based on revocation reason', async () => {
      const securityReasons = [
        { reason: RevocationReason.SECURITY_BREACH, expectedSeverity: 'critical' },
        { reason: RevocationReason.TOKEN_COMPROMISE, expectedSeverity: 'critical' },
        { reason: RevocationReason.SUSPICIOUS_ACTIVITY, expectedSeverity: 'high' },
        { reason: RevocationReason.ADMIN_ACTION, expectedSeverity: 'high' },
        { reason: RevocationReason.PASSWORD_CHANGE, expectedSeverity: 'medium' },
        { reason: RevocationReason.ACCOUNT_DEACTIVATION, expectedSeverity: 'medium' },
        { reason: RevocationReason.USER_LOGOUT, expectedSeverity: 'low' },
      ];

      for (const { reason, expectedSeverity } of securityReasons) {
        await service.revokeAccessToken(`jti_${reason}`, reason, { userId: 'user-123' });
        
        expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: expectedSeverity,
          })
        );
      }
    });

    it('should handle errors during revocation', async () => {
      mockAuthRepo.logSecurityEvent.mockRejectedValue(new Error('Logging failed'));
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.revokeAccessToken('jti_error', RevocationReason.USER_LOGOUT))
        .rejects.toThrow('Logging failed');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to revoke access token jti_error:',
        expect.any(Error)
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token by marking as used', async () => {
      const jti = 'refresh_123_abc';
      const metadata = {
        userId: 'user-123',
        adminId: 'admin-456',
        ipAddress: '192.168.1.1',
      };

      await service.revokeRefreshToken(jti, RevocationReason.PASSWORD_CHANGE, metadata);

      expect(mockAuthRepo.markRefreshTokenAsUsed).toHaveBeenCalledWith(jti);
      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        event: 'refresh_token_revoked',
        severity: 'medium',
        details: {
          jti,
          reason: RevocationReason.PASSWORD_CHANGE,
          revokedBy: 'admin-456',
          userId: 'user-123',
          adminId: 'admin-456',
          ipAddress: '192.168.1.1',
        },
        ipAddress: '192.168.1.1',
        userAgent: undefined,
      });
    });

    it('should handle errors during refresh token revocation', async () => {
      mockAuthRepo.markRefreshTokenAsUsed.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.revokeRefreshToken('jti_error', RevocationReason.USER_LOGOUT))
        .rejects.toThrow('Database error');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to revoke refresh token jti_error:',
        expect.any(Error)
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = 'user-123';
      const metadata = {
        adminId: 'admin-456',
        ipAddress: '192.168.1.1',
        userAgent: 'admin-browser',
      };

      mockAuthRepo.getRefreshTokenStats.mockResolvedValue({
        total: 10,
        active: 5,
        expired: 2,
        used: 3,
      });

      const result = await service.revokeAllUserTokens(userId, RevocationReason.SECURITY_BREACH, metadata);

      expect(result).toEqual({
        accessTokensRevoked: 1,
        refreshTokensRevoked: 3,
        totalRevoked: 4,
        errors: [],
      });

      expect(mockAuthRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(userId);
      expect(service.isAccessTokenBlacklisted('any_jti', userId)).toBe(true);
      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        userId,
        event: 'user_tokens_bulk_revoked',
        severity: 'critical',
        details: {
          reason: RevocationReason.SECURITY_BREACH,
          accessTokensRevoked: 1,
          refreshTokensRevoked: 3,
          totalRevoked: 4,
          revokedBy: 'admin-456',
          adminId: 'admin-456',
          ipAddress: '192.168.1.1',
          userAgent: 'admin-browser',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'admin-browser',
      });
    });

    it('should handle errors during bulk revocation', async () => {
      mockAuthRepo.revokeAllUserRefreshTokens.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await expect(service.revokeAllUserTokens('user-error', RevocationReason.ADMIN_ACTION))
        .rejects.toThrow('Database error');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to revoke user tokens for user-error:',
        expect.any(Error)
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('isAccessTokenBlacklisted', () => {
    it('should return true for blacklisted tokens', async () => {
      const jti = 'blacklisted_token';
      await service.revokeAccessToken(jti, RevocationReason.USER_LOGOUT, { userId: 'user-123' });

      expect(service.isAccessTokenBlacklisted(jti)).toBe(true);
    });

    it('should return false for non-blacklisted tokens', () => {
      expect(service.isAccessTokenBlacklisted('unknown_token')).toBe(false);
    });

    it('should return true for user-level revocation', async () => {
      const userId = 'user-123';
      
      await service.revokeAllUserTokens(userId, RevocationReason.PASSWORD_CHANGE);

      expect(service.isAccessTokenBlacklisted('any_token', userId)).toBe(true);
    });

    it('should clean up expired entries automatically', async () => {
      const jti = 'expired_token';
      
      // Mock the entry creation to be already expired
      const expiredEntry: BlacklistEntry = {
        jti,
        userId: 'user-123',
        tokenType: 'access',
        reason: RevocationReason.USER_LOGOUT,
        revokedAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() - 30000), // 30 seconds ago
        metadata: {},
      };

      service['accessTokenBlacklist'].set(jti, expiredEntry);

      // First check should clean up the expired entry
      expect(service.isAccessTokenBlacklisted(jti)).toBe(false);
      expect(service['accessTokenBlacklist'].has(jti)).toBe(false);
    });
  });

  describe('isRefreshTokenRevoked', () => {
    it('should return true for used refresh tokens', async () => {
      const jti = 'used_refresh_token';
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        jti,
        rotationId: 'rot-123',
        tokenHash: 'hash',
        used: true,
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(),
      });

      const result = await service.isRefreshTokenRevoked(jti);
      expect(result).toBe(true);
    });

    it('should return true for expired refresh tokens', async () => {
      const jti = 'expired_refresh_token';
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        jti,
        rotationId: 'rot-123',
        tokenHash: 'hash',
        used: false,
        expiresAt: new Date(Date.now() - 60000), // Expired
        createdAt: new Date(),
      });

      const result = await service.isRefreshTokenRevoked(jti);
      expect(result).toBe(true);
    });

    it('should return false for valid refresh tokens', async () => {
      const jti = 'valid_refresh_token';
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        jti,
        rotationId: 'rot-123',
        tokenHash: 'hash',
        used: false,
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(),
      });

      const result = await service.isRefreshTokenRevoked(jti);
      expect(result).toBe(false);
    });

    it('should return true for non-existent refresh tokens', async () => {
      mockAuthRepo.findRefreshTokenByJti.mockResolvedValue(null);

      const result = await service.isRefreshTokenRevoked('non_existent');
      expect(result).toBe(true);
    });

    it('should return true on database errors for security', async () => {
      mockAuthRepo.findRefreshTokenByJti.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      const result = await service.isRefreshTokenRevoked('error_token');
      expect(result).toBe(true);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error checking refresh token revocation for error_token:',
        expect.any(Error)
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('getBlacklistStats', () => {
    it('should return correct blacklist statistics', async () => {
      // Add some test entries
      await service.revokeAccessToken('token1', RevocationReason.USER_LOGOUT, { userId: 'user1' });
      await service.revokeAccessToken('token2', RevocationReason.PASSWORD_CHANGE, { userId: 'user2' });
      
      // Add an expired entry manually
      const expiredEntry: BlacklistEntry = {
        jti: 'expired_token',
        userId: 'user-3',
        tokenType: 'access',
        reason: RevocationReason.USER_LOGOUT,
        revokedAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() - 30000),
        metadata: {},
      };
      service['accessTokenBlacklist'].set('expired_token', expiredEntry);

      const stats = service.getBlacklistStats();

      expect(stats.totalAccessTokenEntries).toBe(3);
      expect(stats.activeAccessTokenEntries).toBe(2); // Two non-expired
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    it('should handle empty blacklist', () => {
      const stats = service.getBlacklistStats();

      expect(stats.totalAccessTokenEntries).toBe(0);
      expect(stats.activeAccessTokenEntries).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should clean up expired blacklist entries', () => {
      // Add active entry
      const activeEntry: BlacklistEntry = {
        jti: 'active_token',
        userId: 'user-1',
        tokenType: 'access',
        reason: RevocationReason.USER_LOGOUT,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000), // Future
        metadata: {},
      };

      // Add expired entry
      const expiredEntry: BlacklistEntry = {
        jti: 'expired_token',
        userId: 'user-2',
        tokenType: 'access',
        reason: RevocationReason.USER_LOGOUT,
        revokedAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() - 30000), // Past
        metadata: {},
      };

      service['accessTokenBlacklist'].set('active_token', activeEntry);
      service['accessTokenBlacklist'].set('expired_token', expiredEntry);

      const cleaned = service.cleanupExpiredEntries();

      expect(cleaned).toBe(1);
      expect(service['accessTokenBlacklist'].has('active_token')).toBe(true);
      expect(service['accessTokenBlacklist'].has('expired_token')).toBe(false);
    });

    it('should return 0 when no expired entries exist', () => {
      const activeEntry: BlacklistEntry = {
        jti: 'active_token',
        userId: 'user-1',
        tokenType: 'access',
        reason: RevocationReason.USER_LOGOUT,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        metadata: {},
      };

      service['accessTokenBlacklist'].set('active_token', activeEntry);

      const cleaned = service.cleanupExpiredEntries();
      expect(cleaned).toBe(0);
    });
  });

  describe('clearBlacklist', () => {
    it('should clear all blacklist entries and log admin action', async () => {
      // Add some entries
      await service.revokeAccessToken('token1', RevocationReason.USER_LOGOUT);
      await service.revokeAccessToken('token2', RevocationReason.PASSWORD_CHANGE);

      expect(service['accessTokenBlacklist'].size).toBe(2);

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service.clearBlacklist('admin-123', 'Emergency maintenance');

      expect(service['accessTokenBlacklist'].size).toBe(0);
      expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalledWith({
        event: 'blacklist_cleared',
        severity: 'high',
        details: {
          adminId: 'admin-123',
          reason: 'Emergency maintenance',
          entriesCleared: 2,
        },
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Blacklist cleared by admin admin-123: 2 entries removed (reason: Emergency maintenance)'
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('extractTokenInfoForRevocation', () => {
    it('should extract token information successfully', () => {
      const mockTokenPayload = {
        sub: 'user-123',
        jti: 'jwt_123_abc',
        type: 'access',
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      mockJwtUtil.decodeToken.mockReturnValue(mockTokenPayload);
      mockJwtUtil.getTokenExpiry.mockReturnValue(new Date(Date.now() + 900000));

      const result = service.extractTokenInfoForRevocation('valid-token');

      expect(result).toEqual({
        jti: 'jwt_123_abc',
        userId: 'user-123',
        type: 'access',
        expiresAt: expect.any(Date),
      });
    });

    it('should return null for malformed tokens', () => {
      mockJwtUtil.decodeToken.mockImplementation(() => {
        throw new Error('Malformed token');
      });

      const result = service.extractTokenInfoForRevocation('malformed-token');
      expect(result).toBeNull();
    });

    it('should return null when decoding returns null', () => {
      mockJwtUtil.decodeToken.mockReturnValue(null);

      const result = service.extractTokenInfoForRevocation('null-token');
      expect(result).toBeNull();
    });
  });

  describe('cleanup interval', () => {
    it('should start cleanup interval on initialization', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      // Create a new instance with cleanup enabled
      const serviceWithCleanup = new JwtBlacklistUtil(authRepo, jwtUtil);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30 * 60 * 1000);

      // Clean up
      serviceWithCleanup.stopCleanupInterval();
      jest.useRealTimers();
      setIntervalSpy.mockRestore();
    });

    it('should stop cleanup interval when requested', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Create a new instance with cleanup enabled
      const serviceWithCleanup = new JwtBlacklistUtil(authRepo, jwtUtil);
      
      // Stop the cleanup
      serviceWithCleanup.stopCleanupInterval();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});
