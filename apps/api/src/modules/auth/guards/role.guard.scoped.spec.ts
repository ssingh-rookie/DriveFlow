import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard, PERMISSIONS_KEY } from './role.guard';
import { AuthRepository } from '../auth.repo';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { OrgRole, PermissionAction } from '@driveflow/contracts';

describe('RoleGuard [Scoped Permissions]', () => {
  let guard: RoleGuard;
  let reflector: Reflector;
  let authRepo: AuthRepository;

  const mockInstructorUser: AuthenticatedUser = {
    id: 'instructor-1',
    role: 'instructor',
    orgId: 'org-1',
    email: 'instructor@test.com',
    jti: 'jti',
    tokenType: 'access',
  };

  const mockStudentUser: AuthenticatedUser = {
    id: 'student-1',
    role: 'student',
    orgId: 'org-1',
    email: 'student@test.com',
    jti: 'jti',
    tokenType: 'access',
  };
  
  const mockRequest = (user: AuthenticatedUser, params: any = {}) => ({
    user,
    params,
    method: 'GET',
    path: '/test',
    headers: { 'user-agent': 'test-agent' },
  });

  const mockExecutionContext = (request: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext);

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockAuthRepo = {
    getUserPermissions: jest.fn(),
    logAuthEvent: jest.fn(),
  };
  
  const setupGuardWithScopedPermissions = (permissions: PermissionAction[]) => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return permissions;
      return [];
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
    authRepo = module.get<AuthRepository>(AuthRepository);
    jest.clearAllMocks();
    mockAuthRepo.logAuthEvent.mockResolvedValue(undefined);
  });

  // Instructor Scoped Tests
  describe('Instructor Scenarios', () => {
    beforeEach(() => {
      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'instructor',
        assignedStudentIds: ['student-1', 'student-2'],
      });
    });

    it('should allow an instructor to access their assigned student', async () => {
      setupGuardWithScopedPermissions(['students:read']);
      const request = mockRequest(mockInstructorUser, { id: 'student-1' });
      const context = mockExecutionContext(request);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny an instructor from accessing an unassigned student', async () => {
      setupGuardWithScopedPermissions(['students:read']);
      const request = mockRequest(mockInstructorUser, { id: 'student-3' });
      const context = mockExecutionContext(request);
      await expect(guard.canActivate(context)).rejects.toThrow('Instructor not assigned to this student');
    });
  });

  // Student and Parent Scoped Tests
  describe('Student and Parent Scenarios', () => {
    it('should allow a student to access their own resource', async () => {
      setupGuardWithScopedPermissions(['lessons:read']);
      mockAuthRepo.getUserPermissions.mockResolvedValue({ role: 'student', childStudentIds: [] });
      const request = mockRequest(mockStudentUser, { id: 'student-1' });
      const context = mockExecutionContext(request);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it("should deny a student from accessing another student's resource", async () => {
      setupGuardWithScopedPermissions(['lessons:read']);
      mockAuthRepo.getUserPermissions.mockResolvedValue({ role: 'student', childStudentIds: [] });
      const request = mockRequest(mockStudentUser, { id: 'student-2' });
      const context = mockExecutionContext(request);
      await expect(guard.canActivate(context)).rejects.toThrow("Students can only access their own resources or their children's resources");
    });

    it("should allow a parent to access their child's resource", async () => {
      const parentUser = { ...mockStudentUser, id: 'parent-1' };
      setupGuardWithScopedPermissions(['lessons:read']);
      mockAuthRepo.getUserPermissions.mockResolvedValue({
        role: 'student',
        childStudentIds: ['student-1'],
      });
      const request = mockRequest(parentUser, { id: 'student-1' });
      const context = mockExecutionContext(request);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
