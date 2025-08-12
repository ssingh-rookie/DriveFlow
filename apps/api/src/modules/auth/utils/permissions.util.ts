import type { OrgRole, PermissionAction, ResourceType } from '@driveflow/contracts'
import type { AuthRepository } from '../auth.repo'
import type { AuthenticatedUser } from '../strategies/jwt.strategy'
import { DEFAULT_PERMISSIONS } from '@driveflow/contracts'
import { Injectable } from '@nestjs/common'

/**
 * Represents a resource being accessed for permission checking
 */
export interface PermissionResource {
  type: ResourceType
  id?: string
  ownerId?: string // e.g., studentId for a lesson
}

/**
 * Result of a permission check
 */
export interface CanActivateResult {
  allowed: boolean
  reason?: string
}

/**
 * Permission Checking Utility
 * Centralizes RBAC and scoped permission logic for programmatic use in services
 */
@Injectable()
export class PermissionsUtil {
  constructor(private readonly authRepo: AuthRepository) {}

  /**
   * Checks if a user can perform a specific action on a resource
   * @param user - The authenticated user context
   * @param action - The permission action to check
   * @param resource - The resource being accessed
   * @returns A result object indicating if the action is allowed
   */
  async can(
    user: AuthenticatedUser,
    action: PermissionAction,
    resource: PermissionResource,
  ): Promise<CanActivateResult> {
    const userRole = user.role as OrgRole
    const userPermissions = DEFAULT_PERMISSIONS[userRole] || []

    // 1. Basic Role-Based Permission Check
    if (!userPermissions.includes(action)) {
      return {
        allowed: false,
        reason: `Role '${userRole}' does not have permission for action '${action}'`,
      }
    }

    // 2. Scoped Permission Check for non-admin roles
    if (userRole === 'instructor' || userRole === 'student') {
      if (!user.orgId) {
        return {
          allowed: false,
          reason: 'Organization context is required for scoped permissions',
        }
      }
      return this.checkScopedPermission(user, action, resource)
    }

    // 3. Admins and Owners are allowed if they have the basic permission
    return { allowed: true }
  }

  private async checkScopedPermission(
    user: AuthenticatedUser,
    action: PermissionAction,
    resource: PermissionResource,
  ): Promise<CanActivateResult> {
    const userRole = user.role as OrgRole

    const userPermissionContext = await this.authRepo.getUserPermissions(user.id, user.orgId!)
    if (!userPermissionContext) {
      return {
        allowed: false,
        reason: `User '${user.id}' not found in organization '${user.orgId}'`,
      }
    }

    if (userRole === 'instructor') {
      const { assignedStudentIds = [] } = userPermissionContext
      const resourceOwnerId = resource.ownerId // e.g., a lesson's studentId

      if (this.isStudentRelatedAction(action) && resourceOwnerId && !assignedStudentIds.includes(resourceOwnerId)) {
        return {
          allowed: false,
          reason: `Instructor '${user.id}' is not assigned to student '${resourceOwnerId}'`,
        }
      }
    }

    if (userRole === 'student') {
      const { childStudentIds = [] } = userPermissionContext
      const resourceOwnerId = resource.ownerId
      const isOwnResource = resourceOwnerId === user.id

      if (resourceOwnerId && !isOwnResource && !childStudentIds.includes(resourceOwnerId)) {
        return {
          allowed: false,
          reason: `User '${user.id}' cannot access resource owned by '${resourceOwnerId}'`,
        }
      }
    }

    return { allowed: true }
  }

  private isStudentRelatedAction(action: PermissionAction): boolean {
    const studentPrefixes = ['students:', 'lessons:', 'bookings:', 'payments:']
    return studentPrefixes.some(prefix => action.startsWith(prefix))
  }
}
