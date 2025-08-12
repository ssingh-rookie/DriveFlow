import type { OrgRole, PermissionAction } from '@driveflow/contracts'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import type { AuthRepository } from '../auth.repo'
import type { AuthenticatedUser } from '../strategies/jwt.strategy'
import { DEFAULT_PERMISSIONS } from '@driveflow/contracts'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'

/**
 * Metadata key for required permissions
 */
export const PERMISSIONS_KEY = 'permissions'

/**
 * Metadata key for required roles
 */
export const ROLES_KEY = 'roles'

/**
 * Permission check result interface
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  scoped?: boolean
  scopedResourceIds?: string[]
}

/**
 * Role-Based Authorization Guard
 * Implements the DriveFlow permission matrix for fine-grained access control
 * Supports both role-based and permission-based authorization
 */
@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly authRepo: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user as AuthenticatedUser

    if (!user) {
      throw new ForbiddenException('User authentication required')
    }

    try {
      // Get required permissions and roles from decorators
      const requiredPermissions = this.getRequiredPermissions(context)
      const requiredRoles = this.getRequiredRoles(context)

      // If no permissions or roles specified, allow access
      if (!requiredPermissions.length && !requiredRoles.length) {
        return true
      }

      // Check role-based authorization first (simpler check)
      if (requiredRoles.length > 0) {
        const hasRole = this.checkRoleAuthorization(user, requiredRoles)
        if (!hasRole.allowed) {
          throw new ForbiddenException(hasRole.reason || 'Insufficient role permissions')
        }
      }

      // Check permission-based authorization (more complex)
      if (requiredPermissions.length > 0) {
        const hasPermissions = await this.checkPermissionAuthorization(
          user,
          requiredPermissions,
          request,
        )

        if (!hasPermissions.allowed) {
          throw new ForbiddenException(hasPermissions.reason || 'Insufficient permissions')
        }

        // Store scoped resource info for controllers to use
        if (hasPermissions.scoped && hasPermissions.scopedResourceIds) {
          request.scopedResourceIds = hasPermissions.scopedResourceIds
        }
      }

      // Log successful authorization
      await this.logAuthorizationEvent(user, requiredPermissions, requiredRoles, true, request)

      return true
    }
    catch (error) {
      // Log failed authorization
      await this.logAuthorizationEvent(user, [], [], false, request, error.message)
      throw error
    }
  }

  /**
   * Check role-based authorization
   */
  private checkRoleAuthorization(
    user: AuthenticatedUser,
    requiredRoles: OrgRole[],
  ): PermissionCheckResult {
    const userRole = user.role as OrgRole

    if (!requiredRoles.includes(userRole)) {
      return {
        allowed: false,
        reason: `Required role: ${requiredRoles.join(' or ')}, user has: ${userRole}`,
      }
    }

    return { allowed: true }
  }

  /**
   * Check permission-based authorization with scoping
   */
  private async checkPermissionAuthorization(
    user: AuthenticatedUser,
    requiredPermissions: PermissionAction[],
    request: any,
  ): Promise<PermissionCheckResult> {
    const userRole = user.role as OrgRole
    const userPermissions = DEFAULT_PERMISSIONS[userRole] || []

    // Check if user has basic permission
    const missingPermissions = requiredPermissions.filter(
      permission => !userPermissions.includes(permission),
    )

    if (missingPermissions.length > 0) {
      return {
        allowed: false,
        reason: `Missing permissions: ${missingPermissions.join(', ')}`,
      }
    }

    // For scoped roles (instructor, student), check resource-level permissions
    if (this.isScopedRole(userRole) && user.orgId) {
      const scopeCheck = await this.checkScopedPermissions(user, requiredPermissions, request)
      if (!scopeCheck.allowed) {
        return scopeCheck
      }
    }

    return { allowed: true }
  }

  /**
   * Check scoped permissions for instructors and students
   */
  private async checkScopedPermissions(
    user: AuthenticatedUser,
    requiredPermissions: PermissionAction[],
    request: any,
  ): Promise<PermissionCheckResult> {
    const userRole = user.role as OrgRole

    try {
      // Get user's permission context from database
      const permissions = await this.authRepo.getUserPermissions(user.id, user.orgId!)

      if (!permissions) {
        return {
          allowed: false,
          reason: 'User not found in organization context',
        }
      }

      // Extract resource information from request
      const resourceInfo = this.extractResourceInfo(request)

      if (userRole === 'instructor') {
        return this.checkInstructorScopedPermissions(
          permissions.assignedStudentIds || [],
          requiredPermissions,
          resourceInfo,
        )
      }

      if (userRole === 'student') {
        return this.checkStudentScopedPermissions(
          user.id,
          permissions.childStudentIds || [],
          requiredPermissions,
          resourceInfo,
        )
      }

      return { allowed: true }
    }
    catch (error) {
      this.logger.error(`Error checking scoped permissions for user ${user.id}:`, error)
      return {
        allowed: false,
        reason: 'Error validating scoped permissions',
      }
    }
  }

  /**
   * Check instructor-scoped permissions
   */
  private checkInstructorScopedPermissions(
    assignedStudentIds: string[],
    requiredPermissions: PermissionAction[],
    resourceInfo: { type?: string, id?: string, studentId?: string },
  ): PermissionCheckResult {
    // For student-related permissions, check if instructor is assigned to the student
    const studentPermissions = ['students:read', 'students:write']
    const hasStudentPermission = requiredPermissions.some(p => studentPermissions.includes(p))

    if (hasStudentPermission) {
      const targetStudentId = resourceInfo.studentId || resourceInfo.id

      if (targetStudentId && !assignedStudentIds.includes(targetStudentId)) {
        return {
          allowed: false,
          reason: 'Instructor not assigned to this student',
        }
      }
    }

    // For lesson/booking permissions, allow if related to assigned students
    const lessonPermissions = ['lessons:read', 'lessons:write', 'lessons:create']
    const bookingPermissions = ['bookings:read', 'bookings:write']

    const hasLessonOrBookingPermission = requiredPermissions.some(p =>
      [...lessonPermissions, ...bookingPermissions].includes(p),
    )

    if (hasLessonOrBookingPermission) {
      return {
        allowed: true,
        scoped: true,
        scopedResourceIds: assignedStudentIds,
      }
    }

    return { allowed: true }
  }

  /**
   * Check student-scoped permissions
   */
  private checkStudentScopedPermissions(
    userId: string,
    childStudentIds: string[],
    requiredPermissions: PermissionAction[],
    resourceInfo: { type?: string, id?: string, studentId?: string },
  ): PermissionCheckResult {
    // Students can only access their own resources
    const targetStudentId = resourceInfo.studentId || resourceInfo.id

    if (targetStudentId && targetStudentId !== userId && !childStudentIds.includes(targetStudentId)) {
      return {
        allowed: false,
        reason: 'Students can only access their own resources or their children\'s resources',
      }
    }

    return {
      allowed: true,
      scoped: true,
      scopedResourceIds: [userId, ...childStudentIds],
    }
  }

  /**
   * Extract resource information from request
   */
  private extractResourceInfo(request: any): { type?: string, id?: string, studentId?: string } {
    const params = request.params || {}
    const query = request.query || {}
    const body = request.body || {}

    return {
      type: params.resourceType || query.resourceType || body.resourceType,
      id: params.id || query.id || body.id,
      studentId: params.studentId || query.studentId || body.studentId,
    }
  }

  /**
   * Check if role requires scoped permissions
   */
  private isScopedRole(role: OrgRole): boolean {
    return ['instructor', 'student'].includes(role)
  }

  /**
   * Get required permissions from decorator metadata
   */
  private getRequiredPermissions(context: ExecutionContext): PermissionAction[] {
    const permissions = this.reflector.getAllAndOverride<PermissionAction[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    return permissions || []
  }

  /**
   * Get required roles from decorator metadata
   */
  private getRequiredRoles(context: ExecutionContext): OrgRole[] {
    const roles = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    return roles || []
  }

  /**
   * Log authorization events for audit trail
   */
  private async logAuthorizationEvent(
    user: AuthenticatedUser,
    permissions: PermissionAction[],
    roles: OrgRole[],
    success: boolean,
    request: any,
    errorReason?: string,
  ): Promise<void> {
    try {
      const endpoint = `${request.method} ${request.route?.path || request.path}`

      await this.authRepo.logAuthEvent({
        userId: user.id,
        event: success ? 'authorization_granted' : 'authorization_denied',
        metadata: {
          endpoint,
          requiredPermissions: permissions,
          requiredRoles: roles,
          userRole: user.role,
          orgId: user.orgId,
          errorReason: success ? undefined : errorReason,
        },
        ipAddress: this.extractIpAddress(request),
        userAgent: request.headers['user-agent'],
      })
    }
    catch (error) {
      this.logger.error('Failed to log authorization event:', error)
      // Don't fail the authorization due to logging errors
    }
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]
      || request.headers['x-real-ip']
      || request.connection?.remoteAddress
      || request.socket?.remoteAddress
      || 'unknown'
    )
  }
}
