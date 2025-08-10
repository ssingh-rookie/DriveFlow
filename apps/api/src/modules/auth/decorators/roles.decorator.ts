import { SetMetadata } from '@nestjs/common';
import { OrgRole, PermissionAction } from '@driveflow/contracts';
import { ROLES_KEY, PERMISSIONS_KEY } from '../guards/role.guard';
import { EnsureOrgContext } from './ensure-org-context.decorator';

/**
 * Roles Decorator
 * Restricts access to specific roles
 * 
 * Usage:
 * @Roles('owner', 'admin')
 * @UseGuards(JwtAuthGuard, RoleGuard)
 * async adminAction() {
 *   // Only owners and admins can access
 * }
 */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Permissions Decorator
 * Restricts access to specific permissions (more granular than roles)
 * 
 * Usage:
 * @Permissions('users:write', 'students:read')
 * @UseGuards(JwtAuthGuard, RoleGuard)
 * async updateUser() {
 *   // Requires both permissions
 * }
 */
export const Permissions = (...permissions: PermissionAction[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * OrgScoped Decorator
 * Marks an endpoint as requiring organization context and scoped permissions
 * 
 * Usage:
 * @OrgScoped()
 * @Permissions('students:read')
 * @UseGuards(JwtAuthGuard, RoleGuard)
 * async getStudents() {
 *   // Will check scoped permissions for instructors/students
 * }
 */
export const OrgScoped = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    EnsureOrgContext()(target, propertyKey, descriptor);
  };
};

/**
 * Owner Only Decorator
 * Convenience decorator for owner-only endpoints
 */
export const OwnerOnly = () => Roles('owner');

/**
 * Admin Or Owner Decorator
 * Convenience decorator for admin/owner endpoints
 */
export const AdminOrOwner = () => Roles('owner', 'admin');

/**
 * Staff Only Decorator
 * Convenience decorator for staff (owner, admin, instructor) endpoints
 */
export const StaffOnly = () => Roles('owner', 'admin', 'instructor');

/**
 * Instructor Only Decorator
 * Convenience decorator for instructor-only endpoints
 */
export const InstructorOnly = () => Roles('instructor');

/**
 * Student Only Decorator
 * Convenience decorator for student-only endpoints
 */
export const StudentOnly = () => Roles('student');

/**
 * User Management Decorator
 * Convenience decorator for user management permissions
 */
export const UserManagement = () => Permissions('users:read', 'users:write');

/**
 * Student Management Decorator
 * Convenience decorator for student management permissions
 */
export const StudentManagement = () => Permissions('students:read', 'students:write');

/**
 * Instructor Management Decorator
 * Convenience decorator for instructor management permissions
 */
export const InstructorManagement = () => Permissions('instructors:read', 'instructors:write');

/**
 * Lesson Management Decorator
 * Convenience decorator for lesson management permissions
 */
export const LessonManagement = () => Permissions('lessons:read', 'lessons:write', 'lessons:create');

/**
 * Booking Management Decorator
 * Convenience decorator for booking management permissions
 */
export const BookingManagement = () => Permissions('bookings:read', 'bookings:write', 'bookings:create');

/**
 * Payment Management Decorator
 * Convenience decorator for payment management permissions
 */
export const PaymentManagement = () => Permissions('payments:read', 'payments:write');

/**
 * Organization Management Decorator
 * Convenience decorator for organization management permissions
 */
export const OrgManagement = () => Permissions('org:read', 'org:write', 'org:settings');

/**
 * Read Only Decorator
 * Convenience decorator for read-only access
 */
export const ReadOnly = (resource: 'users' | 'students' | 'instructors' | 'lessons' | 'bookings' | 'payments' | 'org') => 
  Permissions(`${resource}:read` as PermissionAction);

/**
 * Scoped Student Access Decorator
 * For endpoints that need scoped student access (instructors see assigned, students see own)
 */
export const ScopedStudentAccess = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Permissions('students:read')(target, propertyKey, descriptor);
    OrgScoped()(target, propertyKey, descriptor);
  };
};

/**
 * Scoped Lesson Access Decorator
 * For endpoints that need scoped lesson access
 */
export const ScopedLessonAccess = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Permissions('lessons:read')(target, propertyKey, descriptor);
    OrgScoped()(target, propertyKey, descriptor);
  };
};

/**
 * Scoped Booking Access Decorator
 * For endpoints that need scoped booking access
 */
export const ScopedBookingAccess = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Permissions('bookings:read')(target, propertyKey, descriptor);
    OrgScoped()(target, propertyKey, descriptor);
  };
};

/**
 * Combined Auth Decorator
 * Combines JWT authentication and role-based authorization
 * 
 * Usage:
 * @AuthorizedEndpoint(['owner', 'admin'], ['users:write'])
 * async updateUser() {
 *   // Requires JWT + (owner OR admin) + users:write permission
 * }
 */
export const AuthorizedEndpoint = (roles?: OrgRole[], permissions?: PermissionAction[], scoped: boolean = false) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (roles && roles.length > 0) {
      Roles(...roles)(target, propertyKey, descriptor);
    }
    if (permissions && permissions.length > 0) {
      Permissions(...permissions)(target, propertyKey, descriptor);
    }
    if (scoped) {
      OrgScoped()(target, propertyKey, descriptor);
    }
  };
};
