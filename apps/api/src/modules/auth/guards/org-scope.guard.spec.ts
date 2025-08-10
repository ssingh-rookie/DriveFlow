import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgScopeGuard, ORG_CONTEXT_KEY } from './org-scope.guard';
import { AuthRepository } from '../auth.repo';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('OrgScopeGuard', () => {
  let guard: OrgScopeGuard;
  let reflector: Reflector;
  let authRepo: AuthRepository;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'instructor',
    orgId: 'org-456',
    jti: 'jwt-123',
    tokenType: 'access',
  };

  const mockRequest = (orgId?: string) => ({
    user: mockUser,
    method: 'GET',
    path: `/api/orgs/${orgId}/data`,
    params: { orgId },
    headers: { 'user-agent': 'test-agent' },
    ip: '192.168.1.1',
  });

  const mockExecutionContext = (orgId?: string) => ({
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => mockRequest(orgId)),
    })),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext);

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockAuthRepo = {
    isUserMemberOfOrg: jest.fn(),
    logSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgScopeGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthRepository, useValue: mockAuthRepo },
      ],
    }).compile();

    guard = module.get<OrgScopeGuard>(OrgScopeGuard);
    reflector = module.get<Reflector>(Reflector);
    authRepo = module.get<AuthRepository>(AuthRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if decorator is not present', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const result = await guard.canActivate(mockExecutionContext('org-456'));
    expect(result).toBe(true);
  });

  it('should allow access for a valid organization member', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockAuthRepo.isUserMemberOfOrg.mockResolvedValue(true);
    const result = await guard.canActivate(mockExecutionContext('org-456'));
    expect(result).toBe(true);
  });

  it('should deny access if orgId is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(mockExecutionContext(undefined)))
      .rejects.toThrow(ForbiddenException);
  });

  it('should deny access if user is not a member of the organization', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockAuthRepo.isUserMemberOfOrg.mockResolvedValue(false);
    await expect(guard.canActivate(mockExecutionContext('org-789')))
      .rejects.toThrow(ForbiddenException);
  });

  it('should deny access if token orgId does not match request orgId', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const userWithMismatchedOrgId = { ...mockUser, orgId: 'org-000' };
    const request = mockRequest('org-456');
    request.user = userWithMismatchedOrgId;
    const context = {
      ...mockExecutionContext('org-456'),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access for unauthenticated users', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const request = mockRequest('org-456');
    request.user = undefined as any;
    const context = {
      ...mockExecutionContext('org-456'),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should log a security event on access denial', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockAuthRepo.isUserMemberOfOrg.mockResolvedValue(false);
    
    await expect(guard.canActivate(mockExecutionContext('org-789')))
      .rejects.toThrow(ForbiddenException);
      
    expect(mockAuthRepo.logSecurityEvent).toHaveBeenCalled();
  });
});
