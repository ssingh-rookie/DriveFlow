import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RoleGuard } from './guards/role.guard';
import { OrgScopeGuard } from './guards/org-scope.guard';
import { Reflector } from '@nestjs/core';
import { AuthRepository } from './auth.repo';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthRepository, useValue: {} },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
        { provide: RoleGuard, useValue: { canActivate: () => true } },
        { provide: OrgScopeGuard, useValue: { canActivate: () => true } },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('/me endpoints', () => {
    const mockUser = { id: 'user-1', role: 'student', orgId: 'org-1' };

    it('GET /me should return a user profile', async () => {
      const profile = { id: 'user-1', fullName: 'Test User' };
      mockAuthService.getUserProfile.mockResolvedValue(profile);
      
      const result = await controller.getProfile(mockUser as any);
      
      expect(result).toEqual(profile);
      expect(authService.getUserProfile).toHaveBeenCalledWith('user-1');
    });

    it('PATCH /me should update a user profile', async () => {
      const profileUpdate = { fullName: 'Updated Name' };
      const updatedProfile = { id: 'user-1', fullName: 'Updated Name' };
      mockAuthService.updateUserProfile.mockResolvedValue(updatedProfile);
      
      const result = await controller.updateProfile(profileUpdate, mockUser as any);
      
      expect(result).toEqual(updatedProfile);
      expect(authService.updateUserProfile).toHaveBeenCalledWith('user-1', profileUpdate);
    });
  });
});
