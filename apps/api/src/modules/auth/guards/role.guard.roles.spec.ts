import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard, ROLES_KEY } from './role.guard';
import { AuthRepository } from '../auth.repo';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { OrgRole } from '@driveflow/contracts';

describe('RoleGuard [Roles]', () => {
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
    logAuthEvent: jest.fn(),
  };
  
  const setupGuardWithRoles = (roles: OrgRole[]) => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === ROLES_KEY) return roles;
      return []; // Default to no permissions required
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

  it('should allow access if user has one of the required roles', async () => {
    setupGuardWithRoles(['admin', 'owner']);
    const context = mockExecutionContext(mockUser('admin'));
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access if user does not have any of the required roles', async () => {
    setupGuardWithRoles(['admin', 'owner']);
    const context = mockExecutionContext(mockUser('instructor'));
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access with a specific reason message', async () => {
    setupGuardWithRoles(['admin']);
    const context = mockExecutionContext(mockUser('student'));
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Required role: admin, user has: student'
    );
  });

  it('should allow access if no roles are required', async () => {
    setupGuardWithRoles([]); // No roles required
    const context = mockExecutionContext(mockUser('student'));
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
