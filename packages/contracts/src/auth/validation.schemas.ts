import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { OrgRole, PermissionAction, ResourceType } from './permission.schemas';

extendZodWithOpenApi(z);

// ===== Role Assignment Validation =====

export const AssignRoleDto = z.object({
  userId: z.string().uuid('Invalid user ID'),
  orgId: z.string().uuid('Invalid organization ID'),
  role: OrgRole,
  assignedBy: z.string().uuid('Invalid assigner ID'),
  reason: z.string().min(1, 'Reason is required').optional()
}).openapi('AssignRoleDto');

export const RevokeRoleDto = z.object({
  userId: z.string().uuid('Invalid user ID'),
  orgId: z.string().uuid('Invalid organization ID'),
  role: OrgRole,
  revokedBy: z.string().uuid('Invalid revoker ID'),
  reason: z.string().min(1, 'Reason is required')
}).openapi('RevokeRoleDto');

// ===== Permission Validation =====

export const ValidatePermissionDto = z.object({
  userId: z.string().uuid('Invalid user ID'),
  action: PermissionAction,
  resourceType: ResourceType,
  resourceId: z.string().uuid('Invalid resource ID').optional(),
  orgId: z.string().uuid('Invalid organization ID'),
  context: z.object({
    assignedStudentIds: z.array(z.string().uuid()).optional(),
    childStudentIds: z.array(z.string().uuid()).optional(),
    metadata: z.record(z.any()).optional()
  }).optional()
}).openapi('ValidatePermissionDto');

// ===== Bulk Permission Check =====

export const BulkPermissionCheckDto = z.object({
  userId: z.string().uuid('Invalid user ID'),
  orgId: z.string().uuid('Invalid organization ID'),
  checks: z.array(z.object({
    action: PermissionAction,
    resourceType: ResourceType,
    resourceId: z.string().uuid().optional()
  })).min(1, 'At least one permission check is required')
}).openapi('BulkPermissionCheckDto');

export const BulkPermissionResponseDto = z.object({
  results: z.array(z.object({
    action: PermissionAction,
    resourceType: ResourceType,
    resourceId: z.string().uuid().optional(),
    allowed: z.boolean(),
    reason: z.string().optional(),
    scoped: z.boolean().default(false)
  })),
  summary: z.object({
    total: z.number(),
    allowed: z.number(),
    denied: z.number()
  })
}).openapi('BulkPermissionResponseDto');

// ===== Organization Membership Validation =====

export const OrgMembershipDto = z.object({
  userId: z.string().uuid('Invalid user ID'),
  orgId: z.string().uuid('Invalid organization ID'),
  role: OrgRole,
  joinedAt: z.string().datetime(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  permissions: z.array(PermissionAction).optional()
}).openapi('OrgMembershipDto');

export const UpdateMembershipDto = z.object({
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  role: OrgRole.optional(),
  permissions: z.array(PermissionAction).optional()
}).openapi('UpdateMembershipDto');

// ===== Resource Access Validation =====

export const ResourceAccessDto = z.object({
  userId: z.string().uuid('Invalid user ID'),
  resourceType: ResourceType,
  resourceId: z.string().uuid('Invalid resource ID'),
  requiredActions: z.array(PermissionAction).min(1, 'At least one action is required'),
  orgId: z.string().uuid('Invalid organization ID')
}).openapi('ResourceAccessDto');

export const ResourceAccessResponseDto = z.object({
  hasAccess: z.boolean(),
  allowedActions: z.array(PermissionAction),
  deniedActions: z.array(PermissionAction),
  scopeRestrictions: z.object({
    isScoped: z.boolean(),
    scopedToIds: z.array(z.string().uuid()).optional(),
    scopeType: z.enum(['assigned', 'owned', 'child', 'none']).optional()
  }).optional()
}).openapi('ResourceAccessResponseDto');

// ===== Session and Token Validation =====

export const TokenValidationDto = z.object({
  token: z.string().min(1, 'Token is required'),
  tokenType: z.enum(['access', 'refresh']).default('access'),
  expectedRole: OrgRole.optional(),
  expectedOrgId: z.string().uuid().optional()
}).openapi('TokenValidationDto');

export const TokenValidationResponseDto = z.object({
  valid: z.boolean(),
  expired: z.boolean(),
  payload: z.object({
    sub: z.string().uuid(),
    email: z.string().email(),
    role: OrgRole,
    orgId: z.string().uuid(),
    iat: z.number(),
    exp: z.number(),
    jti: z.string()
  }).optional(),
  error: z.string().optional()
}).openapi('TokenValidationResponseDto');

// ===== Audit and Logging Validation =====

export const PermissionAuditDto = z.object({
  userId: z.string().uuid(),
  action: PermissionAction,
  resourceType: ResourceType,
  resourceId: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  result: z.enum(['allowed', 'denied']),
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
}).openapi('PermissionAuditDto');

// ===== Type Exports =====

export type AssignRoleDto = z.infer<typeof AssignRoleDto>;
export type RevokeRoleDto = z.infer<typeof RevokeRoleDto>;
export type ValidatePermissionDto = z.infer<typeof ValidatePermissionDto>;
export type BulkPermissionCheckDto = z.infer<typeof BulkPermissionCheckDto>;
export type BulkPermissionResponseDto = z.infer<typeof BulkPermissionResponseDto>;
export type OrgMembershipDto = z.infer<typeof OrgMembershipDto>;
export type UpdateMembershipDto = z.infer<typeof UpdateMembershipDto>;
export type ResourceAccessDto = z.infer<typeof ResourceAccessDto>;
export type ResourceAccessResponseDto = z.infer<typeof ResourceAccessResponseDto>;
export type TokenValidationDto = z.infer<typeof TokenValidationDto>;
export type TokenValidationResponseDto = z.infer<typeof TokenValidationResponseDto>;
export type PermissionAuditDto = z.infer<typeof PermissionAuditDto>;
