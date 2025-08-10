import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard, PERMISSIONS_KEY, ROLES_KEY } from './role.guard';
import { AuthRepository } from '../auth.repo';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { OrgRole, PermissionAction } from '@driveflow/contracts';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Reflector;
  let authRepo: AuthRepository;

  // --- MOCK DATA ---
  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'instructor@example.com',
    role: 'instructor',
    orgId: 'org-456',
    jti: 'jwt-123',
    tokenType: 'access',
  };

  const mockAdminUser: AuthenticatedUser = { ...mockUser, role: 'admin' };
  const mockStudentUser: AuthenticatedUser = { ...mockUser, id: 'student-123', role: 'student' };
  const mockOwnerUser: AuthenticatedUser = { ...mockUser, role: 'owner' };

  const mockRequest = (user: AuthenticatedUser = mockUser, params: any = { id: 'student-456' }) => ({
    user,
    method: 'GET',
    path: '/api/test',
    route: { path: '/api/test/:id' },
    params,
    query: {},
    body: {},
    headers: { 'user-agent': 'test-agent', 'x-forwarded-for': '192.168.1.1' },
  });

  const mockExecutionContext = (request: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext);

  // --- MOCK PROVIDERS ---
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockAuthRepo = {
    getUserPermissions: jest.fn(),
    logAuthEvent: jest.fn(),
  };

  // --- HELPER FUNCTION FOR MOCKING METADATA ---
  const setupGuardWithMetadata = (
    permissions: PermissionAction[] = [],
    roles: OrgRole[] = []
  ) => {
    mockReflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return permissions;
      if (key === ROLES_KEY) return roles;
      return undefined;
    });
  };

  // --- TEST SETUP ---
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

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // --- CORE LOGIC TESTS ---
  describe('canActivate', () => {
    it('should allow access if no decorators are present', async () => {
      setupGuardWithMetadata([], []);
      const context = mockExecutionContext(mockRequest());
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockAuthRepo.logAuthEvent).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not authenticated', async () => {
      setupGuardWithMetadata(['users:read']);
      const request = mockRequest();
      request.user = null as any;
      const context = mockExecutionContext(request);
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    // --- ROLE-BASED TESTS ---
    it('should allow access if user has the required role', async () => {
      setupGuardWithMetadata([], ['instructor']);
      const context = mockExecutionContext(mockRequest());
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access if user does not have the required role', async () => {
      setupGuardWithMetadata([], ['admin']);
      const context = mockExecutionContext(mockRequest());
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    // --- PERMISSION-BASED TESTS ---
    it('should allow access if user role has the required permission', async () => {
      setupGuardWithMetadata(['students:read']);
      const context = mockExecutionContext(mockRequest(mockAdminUser));
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access if user role does not have the required permission', async () => {
      setupGuardWithMetadata(['users:delete']);
      const context = mockExecutionContext(mockRequest(mockUser)); // Assuming mockUser is the default user
      await expect(guard.canActivate(context)).rejects.toThrow('Missing permissions: users:delete');
    });

    // --- SCOPED PERMISSION TESTS (INSTRUCTOR) ---
    describe('Instructor Scoped Permissions', () => {
        it('should allow access to an assigned student', async () => {
            setupGuardWithMetadata(['students:read'], [], true);
            mockAuthRepo.getUserPermissions.mockResolvedValue({
              role: 'instructor',
              assignedStudentIds: ['student-456'],
            });
            const context = mockExecutionContext(mockRequest(mockUser)); // Assuming mockUser is the default user
            const result = await guard.canActivate(context);
            expect(result).toBe(true);
            expect(mockAuthRepo.getUserPermissions).toHaveBeenCalledWith(mockUser.id, mockUser.orgId);
          });
    
          it('should deny access to an unassigned student', async () => {
            setupGuardWithMetadata(['students:read'], [], true);
            mockAuthRepo.getUserPermissions.mockResolvedValue({
              role: 'instructor',
              assignedStudentIds: ['student-789'], // Does not include student-456
            });
            const request = mockRequest(mockUser, { id: 'student-456' });
            const context = mockExecutionContext(request);
            await expect(guard.canActivate(context)).rejects.toThrow('Instructor not assigned to this student');
          });
    
          it('should attach scoped resource IDs to the request for lessons', async () => {
            setupGuardWithMetadata(['lessons:read'], [], true);
            mockAuthRepo.getUserPermissions.mockResolvedValue({
              role: 'instructor',
              assignedStudentIds: ['student-1', 'student-2'],
            });
            const request = mockRequest(mockUser);
            const context = mockExecutionContext(request);
            await guard.canActivate(context);
            expect((request as any).scopedResourceIds).toEqual(['student-1', 'student-2']);
          });
    });

    // --- SCOPED PERMISSION TESTS (STUDENT/PARENT) ---
    describe('Student and Parent Scoped Permissions', () => {
      it('should allow a student to access their own resource', async () => {
        setupGuardWithMetadata(['lessons:read'], [], true);
        mockAuthRepo.getUserPermissions.mockResolvedValue({ role: 'student' });
        const request = mockRequest(mockStudentUser, { id: mockStudentUser.id }); // Accessing own resource
        const context = mockExecutionContext(request);
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it("should deny a student from accessing another student's resource", async () => {
        setupGuardWithMetadata(['lessons:read'], [], true);
        mockAuthRepo.getUserPermissions.mockResolvedValue({ role: 'student', childStudentIds: [] });
        const request = mockRequest(mockStudentUser, { id: 'another-student-id' }); // Accessing other's resource
        const context = mockExecutionContext(request);
        await expect(guard.canActivate(context)).rejects.toThrow("Students can only access their own resources or their children's resources");
      });

      it("should allow a parent to access their child's resource", async () => {
        const parentUser = { ...mockUser, role: 'student' }; // Parents have 'student' role in this model
        setupGuardWithMetadata(['lessons:read'], [], true);
        mockAuthRepo.getUserPermissions.mockResolvedValue({
          role: 'student',
          childStudentIds: ['child-student-id'],
        });
        const request = mockRequest(parentUser, { id: 'child-student-id' }); // Accessing child's resource
        const context = mockExecutionContext(request);
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
    
    // --- LOGGING TESTS ---
    it('should log authorization failures', async () => {
        setupGuardWithMetadata(['users:delete']); // A permission the instructor does not have
        const context = mockExecutionContext(mockRequest(mockUser)); // Assuming mockUser is the default user
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        expect(mockAuthRepo.logAuthEvent).toHaveBeenCalledWith(expect.objectContaining({
          event: 'authorization_denied',
          userId: mockUser.id,
          metadata: expect.objectContaining({
            errorReason: 'Missing permissions: users:delete',
          }),
        }));
      });
  });
});
