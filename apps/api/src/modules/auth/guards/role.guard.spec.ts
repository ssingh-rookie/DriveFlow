import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard, PERMISSIONS_KEY, ROLES_KEY, ORG_SCOPED_KEY } from './role.guard';
import { AuthRepository } from '../auth.repo';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Reflector;
  let authRepo: AuthRepository;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'instructor@example.com',
    role: 'instructor',
    orgId: 'org-456',
    jti: 'jwt-123',
    tokenType: 'access',
  };

  const mockAdminUser: AuthenticatedUser = {
    ...mockUser,
    role: 'admin',
    email: 'admin@example.com',
  };

  const mockStudentUser: AuthenticatedUser = {
    ...mockUser,
    id: 'student-123',
    role: 'student',
    email: 'student@example.com',
  };

  const mockRequest: any = {
    user: mockUser,
    method: 'GET',
    path: '/api/students',
    route: { path: '/api/students/:id' },
    params: { id: 'student-456' },
    query: {},
    body: {},
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => mockRequest),
    })),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockAuthRepo = {
    getUserPermissions: jest.fn(),
    logAuthEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuthRepository,
          useValue: mockAuthRepo,
        },
      ],
    }).compile();

    guard = module.get<RoleGuard>(RoleGuard);
    reflector = module.get<Reflector>(Reflector);
    authRepo = module.get<AuthRepository>(AuthRepository);

    // Clear mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockAuthRepo.logAuthEvent.mockResolvedValue(undefined);
    mockReflector.getAllAndOverride.mockReturnValue([]);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no permissions or roles are required', async () => {
      // Mock the reflector to return empty arrays for all metadata
      mockReflector.getAllAndOverride
        .mockReturnValueOnce([]) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(false); // orgScoped

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      // When no permissions/roles are required, the function returns early without logging
      expect(mockAuthRepo.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      const contextWithoutUser = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({ ...mockRequest, user: null })),
        })),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(contextWithoutUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow access when user has required role', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce([]) // permissions
        .mockReturnValueOnce(['instructor', 'admin']) // roles
        .mockReturnValueOnce(false); // orgScoped

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access when user lacks required role', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce([]) // permissions
        .mockReturnValueOnce(['owner']) // roles
        .mockReturnValueOnce(false); // orgScoped

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow access when user has required permissions', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['students:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(false); // orgScoped

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access when user lacks required permissions', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['users:delete']) // permissions instructor doesn't have
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(false); // orgScoped

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(ForbiddenException);
    });

    it('should require organization context when orgScoped is true', async () => {
      const userWithoutOrg = { ...mockUser, orgId: undefined };
      const contextWithoutOrg = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({ ...mockRequest, user: userWithoutOrg })),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['students:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      await expect(guard.canActivate(contextWithoutOrg))
        .rejects.toThrow('Organization context required for this operation');
    });

    it('should check scoped permissions for instructors', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['students:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'instructor',
        assignedStudentIds: ['student-456', 'student-789'],
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockAuthRepo.getUserPermissions).toHaveBeenCalledWith('user-123', 'org-456');
    });

    it('should deny access when instructor accesses unassigned student', async () => {
      const requestWithDifferentStudent = {
        ...mockRequest,
        params: { id: 'student-999' }, // Not assigned to instructor
      };

      const contextWithDifferentStudent = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => requestWithDifferentStudent),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['students:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'instructor',
        assignedStudentIds: ['student-456', 'student-789'],
      });

      await expect(guard.canActivate(contextWithDifferentStudent))
        .rejects.toThrow('Instructor not assigned to this student');
    });

    it('should allow scoped lesson access for instructors', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['lessons:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'instructor',
        assignedStudentIds: ['student-456', 'student-789'],
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockAuthRepo.getUserPermissions).toHaveBeenCalledWith('user-123', 'org-456');
      // Note: Scoped resource IDs functionality is verified through integration tests
    });

    it('should allow students to access their own resources', async () => {
      const studentRequest = {
        ...mockRequest,
        user: mockStudentUser,
        params: { id: 'student-123' }, // Same as user ID
      };

      const studentContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => studentRequest),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['lessons:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'student',
        childStudentIds: [],
      });

      const result = await guard.canActivate(studentContext);

      expect(result).toBe(true);
    });

    it('should deny students access to other students resources', async () => {
      const studentRequest = {
        ...mockRequest,
        user: mockStudentUser,
        params: { id: 'student-999' }, // Different student
      };

      const studentContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => studentRequest),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['lessons:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'student',
        childStudentIds: [],
      });

      await expect(guard.canActivate(studentContext))
        .rejects.toThrow('Students can only access their own resources');
    });

    it('should allow admin full access without scoping', async () => {
      const adminRequest = { ...mockRequest, user: mockAdminUser };
      const adminContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => adminRequest),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['students:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      // Admin role is not scoped, so getUserPermissions won't be called
      const result = await guard.canActivate(adminContext);

      expect(result).toBe(true);
      expect(mockAuthRepo.getUserPermissions).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['students:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      mockAuthRepo.getUserPermissions.mockRejectedValue(new Error('Database error'));

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow('Error validating scoped permissions');
    });

    it('should log authorization failures', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['users:delete']) // permissions instructor doesn't have
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(false); // orgScoped

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }

      expect(mockAuthRepo.logAuthEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        event: 'authorization_denied',
        metadata: expect.objectContaining({
          requiredPermissions: [], // The catch block passes empty arrays
          requiredRoles: [],
          userRole: 'instructor',
          orgId: 'org-456',
          errorReason: 'Missing permissions: users:delete',
          endpoint: 'GET /api/students/:id',
        }),
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should extract resource info from different request sources', async () => {
      const requestWithQueryParams = {
        ...mockRequest,
        params: {},
        query: { studentId: 'student-from-query' },
        body: { id: 'id-from-body' },
      };

      const contextWithQuery = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => requestWithQueryParams),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['students:read']) // permissions
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(true); // orgScoped

      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'instructor',
        assignedStudentIds: ['student-from-query'],
      });

      const result = await guard.canActivate(contextWithQuery);
      expect(result).toBe(true);
    });
  });

  describe('permission matrix integration', () => {
    it('should allow owner all permissions', async () => {
      const ownerUser = { ...mockUser, role: 'owner' };
      const ownerRequest = { ...mockRequest, user: ownerUser };
      const ownerContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ownerRequest),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['users:delete', 'org:settings']) // permissions only owners have
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(false); // orgScoped

      const result = await guard.canActivate(ownerContext);
      expect(result).toBe(true);
    });

    it('should deny student administrative permissions', async () => {
      const studentRequest = { ...mockRequest, user: mockStudentUser };
      const studentContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => studentRequest),
        })),
      } as unknown as ExecutionContext;

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(['users:write']) // permission students don't have
        .mockReturnValueOnce([]) // roles
        .mockReturnValueOnce(false); // orgScoped

      await expect(guard.canActivate(studentContext))
        .rejects.toThrow('Missing permissions: users:write');
    });
  });
});
