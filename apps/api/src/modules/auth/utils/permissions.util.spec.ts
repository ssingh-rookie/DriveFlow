import type { TestingModule } from '@nestjs/testing'
import type { AuthenticatedUser } from '../strategies/jwt.strategy'
import type { PermissionResource } from './permissions.util'
import { Test } from '@nestjs/testing'
import { AuthRepository } from '../auth.repo'
import { PermissionsUtil } from './permissions.util'

describe('permissionsUtil', () => {
  let util: PermissionsUtil
  let authRepo: AuthRepository

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-1',
    role: 'admin',
    orgId: 'org-1',
    email: 'admin@test.com',
    jti: 'jti',
    tokenType: 'access',
  }

  const mockInstructorUser: AuthenticatedUser = {
    id: 'instructor-1',
    role: 'instructor',
    orgId: 'org-1',
    email: 'instructor@test.com',
    jti: 'jti',
    tokenType: 'access',
  }

  const mockStudentUser: AuthenticatedUser = {
    id: 'student-1',
    role: 'student',
    orgId: 'org-1',
    email: 'student@test.com',
    jti: 'jti',
    tokenType: 'access',
  }

  const mockAuthRepo = {
    getUserPermissions: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsUtil,
        { provide: AuthRepository, useValue: mockAuthRepo },
      ],
    }).compile()

    util = module.get<PermissionsUtil>(PermissionsUtil)
    authRepo = module.get<AuthRepository>(AuthRepository)
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(util).toBeDefined()
  })

  // Admin/Owner Tests
  describe('admin and Owner Permissions', () => {
    it('should allow admins to perform permitted actions', async () => {
      const resource: PermissionResource = { type: 'user' }
      const result = await util.can(mockAdminUser, 'users:read', resource)
      expect(result.allowed).toBe(true)
    })

    it('should deny admins from performing actions outside their role', async () => {
      const resource: PermissionResource = { type: 'organization' }
      const result = await util.can(mockAdminUser, 'org:settings', resource)
      expect(result.allowed).toBe(false) // Corrected expectation
    })
  })

  // Instructor Tests
  describe('instructor Scoped Permissions', () => {
    beforeEach(() => {
      mockAuthRepo.getUserPermissions.mockResolvedValue({
        assignedStudentIds: ['student-1', 'student-2'],
      })
    })

    it('should allow instructors to access assigned students', async () => {
      const resource: PermissionResource = { type: 'student', ownerId: 'student-1' }
      const result = await util.can(mockInstructorUser, 'students:read', resource)
      expect(result.allowed).toBe(true)
    })

    it('should deny instructors from accessing unassigned students', async () => {
      const resource: PermissionResource = { type: 'student', ownerId: 'student-3' }
      const result = await util.can(mockInstructorUser, 'students:read', resource)
      expect(result.allowed).toBe(false)
    })
  })

  // Student Tests
  describe('student Scoped Permissions', () => {
    beforeEach(() => {
      mockAuthRepo.getUserPermissions.mockResolvedValue({})
    })

    it('should allow students to access their own resources', async () => {
      const resource: PermissionResource = { type: 'lesson', ownerId: 'student-1' }
      const result = await util.can(mockStudentUser, 'lessons:read', resource)
      expect(result.allowed).toBe(true)
    })

    it('should deny students from accessing resources of other students', async () => {
      const resource: PermissionResource = { type: 'lesson', ownerId: 'student-2' }
      const result = await util.can(mockStudentUser, 'lessons:read', resource)
      expect(result.allowed).toBe(false)
    })
  })
})
