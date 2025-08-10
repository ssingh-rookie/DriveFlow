import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ===== Authentication Request Schemas =====

export const LoginDto = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
}).openapi('LoginDto');

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
}).openapi('RefreshTokenDto');

export const LogoutDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
}).openapi('LogoutDto');

// ===== Authentication Response Schemas =====

export const AuthResponseDto = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(), // seconds until access token expires
  tokenType: z.literal('Bearer'),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string(),
    role: z.enum(['owner', 'admin', 'instructor', 'student']),
    orgId: z.string().uuid()
  })
}).openapi('AuthResponseDto');

export const RefreshResponseDto = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer')
}).openapi('RefreshResponseDto');

// ===== User Profile Schemas =====

export const UserProfileDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  phone: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  organizations: z.array(z.object({
    orgId: z.string().uuid(),
    orgName: z.string(),
    role: z.enum(['owner', 'admin', 'instructor', 'student'])
  }))
}).openapi('UserProfileDto');

export const UpdateUserProfileDto = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  phone: z.string().nullable().optional()
}).openapi('UpdateUserProfileDto');

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
}).openapi('ChangePasswordDto');

// ===== JWT Payload Schema =====

export const JwtPayloadDto = z.object({
  sub: z.string().uuid(), // User ID
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'instructor', 'student']),
  orgId: z.string().uuid(),
  iat: z.number(),
  exp: z.number(),
  jti: z.string() // JWT ID
}).openapi('JwtPayloadDto');

// ===== Error Schemas =====

export const AuthErrorDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  timestamp: z.string().datetime()
}).openapi('AuthErrorDto');

// ===== Type Exports =====

export type LoginDto = z.infer<typeof LoginDto>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenDto>;
export type LogoutDto = z.infer<typeof LogoutDto>;
export type AuthResponseDto = z.infer<typeof AuthResponseDto>;
export type RefreshResponseDto = z.infer<typeof RefreshResponseDto>;
export type UserProfileDto = z.infer<typeof UserProfileDto>;
export type UpdateUserProfileDto = z.infer<typeof UpdateUserProfileDto>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordDto>;
export type JwtPayloadDto = z.infer<typeof JwtPayloadDto>;
export type AuthErrorDto = z.infer<typeof AuthErrorDto>;
