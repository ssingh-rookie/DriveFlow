import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard, PERMISSIONS_KEY, ROLES_KEY } from './role.guard';
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

  const mockRequest = {
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

  const setupGuardWithMetadata = (permissions: string[] = [], roles: string[] = [], orgScoped = false) => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return permissions;
      if (key === ROLES_KEY) return roles;
      if (key === 'orgScoped') return orgScoped;
      return undefined;
    });
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
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no permissions or roles are required', async () => {
      setupGuardWithMetadata([], []);
      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockAuthRepo.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      const contextWithoutUser = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({ ...mockRequest, user: null })),
        })),
      } as unknown as ExecutionContext;
      await expect(guard.canActivate(contextWithoutUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when user has required role', async () => {
      setupGuardWithMetadata([], ['instructor', 'admin']);
      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should deny access when user lacks required role', async () => {
      setupGuardWithMetadata([], ['owner']);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when user has required permissions', async () => {
      setupGuardWithMetadata(['students:read']);
      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should deny access when user lacks required permissions', async () => {
      setupGuardWithMetadata(['users:delete']);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
    });

    it('should require organization context when orgScoped is true', async () => {
      const userWithoutOrg = { ...mockUser, orgId: undefined };
      const contextWithoutOrg = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({ ...mockRequest, user: userWithoutOrg })),
        })),
      } as unknown as ExecutionContext;
      setupGuardWithMetadata(['students:read'], [], true);
      await expect(guard.canActivate(contextWithoutOrg)).rejects.toThrow('Organization context required for this operation');
    });

    it('should check scoped permissions for instructors', async () => {
      setupGuardWithMetadata(['students:read'], [], true);
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
      setupGuardWithMetadata(['students:read'], [], true);
      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'instructor',
        assignedStudentIds: ['student-456', 'student-789'],
      });
      await expect(guard.canActivate(contextWithDifferentStudent)).rejects.toThrow('Instructor not assigned to this student');
    });

    it('should allow scoped lesson access for instructors', async () => {
      const lessonRequest: any = { ...mockRequest };
      const lessonContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => lessonRequest),
        })),
      } as unknown as ExecutionContext;
      setupGuardWithMetadata(['lessons:read'], [], true);
      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'instructor',
        assignedStudentIds: ['student-456', 'student-789'],
      });
      const result = await guard.canActivate(lessonContext);
      expect(result).toBe(true);
      expect(lessonRequest.scopedResourceIds).toEqual(['student-456', 'student-789']);
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
      setupGuardWithMetadata(['lessons:read'], [], true);
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
      setupGuardWithMetadata(['lessons:read'], [], true);
      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'student',
        childStudentIds: [],
      });
      await expect(guard.canActivate(studentContext)).rejects.toThrow('Students can only access their own resources or their children\'s resources');
    });

    it('should allow admin full access without scoping', async () => {
      const adminRequest = { ...mockRequest, user: mockAdminUser };
      const adminContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => adminRequest),
        })),
      } as unknown as ExecutionContext;
      setupGuardWithMetadata(['students:read'], [], true);
      const result = await guard.canActivate(adminContext);
      expect(result).toBe(true);
      expect(mockAuthRepo.getUserPermissions).not.toHaveBeenCalled();
    });

    it('should allow parents to access their children\'s resources', async () => {
      const parentUser = { ...mockStudentUser, role: 'student' };
      const childId = 'child-1';
      const parentRequest = {
        ...mockRequest,
        user: parentUser,
        params: { id: childId },
      };
      const parentContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => parentRequest),
        })),
      } as unknown as ExecutionContext;
      setupGuardWithMetadata(['lessons:read'], [], true);
      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'student',
        childStudentIds: [childId],
      });
      const result = await guard.canActivate(parentContext);
      expect(result).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      setupGuardWithMetadata(['students:read'], [], true);
      mockAuthRepo.getUserPermissions.mockRejectedValue(new Error('Database error'));
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Error validating scoped permissions');
    });

    it('should log authorization failures', async () => {
      setupGuardWithMetadata(['users:delete']);
      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }
      expect(mockAuthRepo.logAuthEvent).toHaveBeenCalledWith(expect.objectContaining({
        event: 'authorization_denied',
      }));
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
      setupGuardWithMetadata(['students:read'], [], true);
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
      setupGuardWithMetadata(['users:delete', 'org:settings']);
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
      setupGuardWithMetadata(['users:write']);
      await expect(guard.canActivate(studentContext)).rejects.toThrow('Missing permissions: users:write');
    });
  });
});
