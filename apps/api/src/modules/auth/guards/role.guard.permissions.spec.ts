import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard, PERMISSIONS_KEY } from './role.guard';
import { AuthRepository } from '../auth.repo';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { OrgRole, PermissionAction } from '@driveflow/contracts';

describe('RoleGuard [Permissions]', () => {
  let guard: RoleGuard;
  let reflector: Reflector;

  const mockUser = (role: OrgRole): AuthenticatedUser => ({
    id: 'user-123',
    email: 'test@example.com',
    role,
    orgId: 'org-456',
    jti: 'jwt-123',
    tokenType: 'access',
  });

  const mockExecutionContext = (user: AuthenticatedUser): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user, method: 'GET', path: '/test' }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext);

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockAuthRepo = {
    getUserPermissions: jest.fn(), // Not used in these tests
    logAuthEvent: jest.fn(),
  };
  
  const setupGuardWithPermissions = (permissions: PermissionAction[]) => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return permissions;
      return []; // Default to no roles required
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthRepository, useValue: mockAuthRepo },
      ],
    }).compile();

    guard = module.get<RoleGuard>(RoleGuard);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
    mockAuthRepo.logAuthEvent.mockResolvedValue(undefined);
  });

  it('should allow access if user role has the required permission', async () => {
    setupGuardWithPermissions(['users:read']);
    const context = mockExecutionContext(mockUser('admin'));
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access if user role does not have the required permission', async () => {
    setupGuardWithPermissions(['users:delete']);
    const context = mockExecutionContext(mockUser('admin'));
    await expect(guard.canActivate(context)).rejects.toThrow('Missing permissions: users:delete');
  });

  it('should allow owner to access everything their role permits', async () => {
    setupGuardWithPermissions(['org:settings', 'users:delete']);
    const context = mockExecutionContext(mockUser('owner'));
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should handle multiple required permissions', async () => {
    setupGuardWithPermissions(['students:read', 'students:write']);
    const context = mockExecutionContext(mockUser('admin'));
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny if one of multiple required permissions is missing', async () => {
    setupGuardWithPermissions(['students:read', 'org:settings']); // Admin doesn't have org:settings
    const context = mockExecutionContext(mockUser('admin'));
    await expect(guard.canActivate(context)).rejects.toThrow('Missing permissions: org:settings');
  });
});
