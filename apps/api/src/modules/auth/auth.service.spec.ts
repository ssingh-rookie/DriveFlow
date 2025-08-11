import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repo';
import { JwtUtil } from './utils/jwt.util';
import { RefreshTokenRotationUtil } from './utils/refresh-token-rotation.util';
import { JwtBlacklistUtil } from './utils/jwt-blacklist.util';
import { PasswordUtil } from './utils/password.util';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let authRepo: AuthRepository;
  let jwtUtil: JwtUtil;
  let refreshTokenRotationUtil: RefreshTokenRotationUtil;
  let blacklistUtil: JwtBlacklistUtil;

  const mockAuthRepo = {
    findUserByEmail: jest.fn(),
    findUserByEmailWithPassword: jest.fn(),
    createUser: jest.fn(),
    createOrganization: jest.fn(),
    addUserToOrg: jest.fn(),
    getUserPrimaryOrg: jest.fn(),
    createRefreshToken: jest.fn(),
    logAuthEvent: jest.fn(),
    logSecurityEvent: jest.fn(),
  };

  const mockJwtUtil = {
    generateRotationId: jest.fn(),
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    extractJti: jest.fn(),
    hashToken: jest.fn(),
    decodeToken: jest.fn(),
  };

  const mockRefreshTokenRotationUtil = {
    rotateRefreshToken: jest.fn(),
  };

  const mockBlacklistUtil = {
    revokeRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepo },
        { provide: JwtUtil, useValue: mockJwtUtil },
        { provide: RefreshTokenRotationUtil, useValue: mockRefreshTokenRotationUtil },
        { provide: JwtBlacklistUtil, useValue: mockBlacklistUtil },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepo = module.get<AuthRepository>(AuthRepository);
    jwtUtil = module.get<JwtUtil>(JwtUtil);
    refreshTokenRotationUtil = module.get<RefreshTokenRotationUtil>(RefreshTokenRotationUtil);
    blacklistUtil = module.get<JwtBlacklistUtil>(JwtBlacklistUtil);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and organization', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthRepo.createUser.mockResolvedValue({ id: 'user-1' });
      mockAuthRepo.createOrganization.mockResolvedValue({ id: 'org-1' });
      
      const loginSpy = jest.spyOn(service, 'login').mockResolvedValue({} as any);

      const registerDto = { email: 'test@test.com', password: 'password', fullName: 'Test User', orgName: 'Test Org' };
      await service.register(registerDto);

      expect(mockAuthRepo.createUser).toHaveBeenCalled();
      expect(mockAuthRepo.createOrganization).toHaveBeenCalled();
      expect(mockAuthRepo.addUserToOrg).toHaveBeenCalled();
      expect(loginSpy).toHaveBeenCalled();
    });

    it('should throw an error if user already exists', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({ id: 'user-1' });
      const registerDto = { email: 'test@test.com', password: 'password', fullName: 'Test User', orgName: 'Test Org' };
      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should return tokens and user info on successful login', async () => {
      const user = { id: 'user-1', password: 'hashedPassword' };
      mockAuthRepo.findUserByEmailWithPassword.mockResolvedValue(user);
      mockAuthRepo.getUserPrimaryOrg.mockResolvedValue({ role: 'owner', orgId: 'org-1' });
      
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(true);
      
      const result = await service.login({ email: 'test@test.com', password: 'password' });
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockAuthRepo.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw an error for invalid credentials', async () => {
      mockAuthRepo.findUserByEmailWithPassword.mockResolvedValue({ id: 'user-1', password: 'hashedPassword' });
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(false);
      
      await expect(service.login({ email: 'test@test.com', password: 'wrong-password' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens on successful refresh', async () => {
      mockRefreshTokenRotationUtil.rotateRefreshToken.mockResolvedValue({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });
      const result = await service.refreshToken('old-refresh-token');
      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      mockJwtUtil.decodeToken.mockReturnValue({ jti: 'jti-1' });
      const user = { id: 'user-1' } as any;
      await service.logout('refresh-token', user);
      expect(blacklistUtil.revokeRefreshToken).toHaveBeenCalledWith('jti-1', 'user_logout', { userId: 'user-1' });
    });
  });
});
