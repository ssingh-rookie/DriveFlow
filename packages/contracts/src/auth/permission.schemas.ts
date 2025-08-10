import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ===== Role Definitions =====

export const OrgRole = z.enum(['owner', 'admin', 'instructor', 'student']).openapi('OrgRole');

// ===== Permission Actions =====

export const PermissionAction = z.enum([
  // User Management
  'users:read',
  'users:write',
  'users:delete',
  
  // Profile Management
  'profile:read',
  'profile:write',
  
  // Student Management
  'students:read',
  'students:write',
  'students:delete',
  
  // Instructor Management
  'instructors:read',
  'instructors:write',
  'instructors:delete',
  
  // Lesson Management
  'lessons:read',
  'lessons:write',
  'lessons:delete',
  'lessons:create',
  
  // Booking Management
  'bookings:read',
  'bookings:write',
  'bookings:delete',
  'bookings:create',
  
  // Payment Management
  'payments:read',
  'payments:write',
  'payments:refund',
  
  // Organization Management
  'org:read',
  'org:write',
  'org:settings',
  
  // Audit Logs
  'audit:read'
]).openapi('PermissionAction');

// ===== Resource Types =====

export const ResourceType = z.enum([
  'user',
  'student', 
  'instructor',
  'lesson',
  'booking',
  'payment',
  'organization',
  'audit_log'
]).openapi('ResourceType');

// ===== Permission Context =====

export const PermissionContext = z.object({
  userId: z.string().uuid(),
  role: OrgRole,
  orgId: z.string().uuid(),
  resourceId: z.string().uuid().optional(),
  resourceType: ResourceType.optional(),
  // Scoping context for instructors and parents
  assignedStudentIds: z.array(z.string().uuid()).optional(), // For instructors
  childStudentIds: z.array(z.string().uuid()).optional()     // For parents/guardians
}).openapi('PermissionContext');

// ===== Permission Check Request =====

export const PermissionCheckDto = z.object({
  action: PermissionAction,
  resourceType: ResourceType,
  resourceId: z.string().uuid().optional(),
  context: PermissionContext
}).openapi('PermissionCheckDto');

// ===== Permission Matrix =====

export const RolePermissions = z.object({
  owner: z.array(PermissionAction),
  admin: z.array(PermissionAction), 
  instructor: z.array(PermissionAction),
  student: z.array(PermissionAction)
}).openapi('RolePermissions');

// ===== Permission Response =====

export const PermissionResponseDto = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  scoped: z.boolean().default(false), // Whether permission is scoped to specific resources
  scopedResourceIds: z.array(z.string().uuid()).optional()
}).openapi('PermissionResponseDto');

// ===== Default Permission Matrix =====

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'users:read', 'users:write', 'users:delete',
    'profile:read', 'profile:write',
    'students:read', 'students:write', 'students:delete',
    'instructors:read', 'instructors:write', 'instructors:delete',
    'lessons:read', 'lessons:write', 'lessons:delete', 'lessons:create',
    'bookings:read', 'bookings:write', 'bookings:delete', 'bookings:create',
    'payments:read', 'payments:write', 'payments:refund',
    'org:read', 'org:write', 'org:settings',
    'audit:read'
  ],
  admin: [
    'users:read', 'users:write',
    'profile:read', 'profile:write',
    'students:read', 'students:write', 'students:delete',
    'instructors:read', 'instructors:write',
    'lessons:read', 'lessons:write', 'lessons:delete', 'lessons:create',
    'bookings:read', 'bookings:write', 'bookings:delete', 'bookings:create',
    'payments:read', 'payments:write', 'payments:refund',
    'org:read',
    'audit:read'
  ],
  instructor: [
    'profile:read', 'profile:write',
    'students:read', // Only assigned students
    'lessons:read', 'lessons:write', 'lessons:create', // Only assigned lessons
    'bookings:read', 'bookings:write', // Only assigned bookings
    'payments:read' // Only related payments
  ],
  student: [
    'profile:read', 'profile:write',
    'lessons:read', // Only own lessons
    'bookings:read', 'bookings:create' // Only own bookings
  ]
};

// ===== Type Exports =====

export type OrgRole = z.infer<typeof OrgRole>;
export type PermissionAction = z.infer<typeof PermissionAction>;
export type ResourceType = z.infer<typeof ResourceType>;
export type PermissionContext = z.infer<typeof PermissionContext>;
export type PermissionCheckDto = z.infer<typeof PermissionCheckDto>;
export type RolePermissions = z.infer<typeof RolePermissions>;
export type PermissionResponseDto = z.infer<typeof PermissionResponseDto>;
