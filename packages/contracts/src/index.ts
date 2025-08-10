import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

// ===== Export Auth Schemas =====
export * from './auth';

// Import auth schemas for OpenAPI registration
import {
  LoginDto,
  AuthResponseDto,
  RefreshTokenDto,
  RefreshResponseDto,
  UserProfileDto,
  UpdateUserProfileDto,
  ChangePasswordDto,
  JwtPayloadDto,
  AuthErrorDto,
  RegisterDto,
} from './auth/auth.schemas';

import {
  PermissionCheckDto,
  PermissionResponseDto,
} from './auth/permission.schemas';

/** ===== Example schemas (replace with real ones) ===== */
export const BookingCreate = z.object({
  studentId: z.string().uuid(),
  instructorId: z.string().uuid(),
  startAt: z.string().datetime(),
  durationMin: z.number().int().positive()
}).openapi('BookingCreate');

export const Booking = BookingCreate.extend({
  id: z.string().uuid(),
  status: z.enum(['requested','confirmed','in_progress','completed','cancelled'])
}).openapi('Booking');

export const ProblemDetails = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional()
}).passthrough().openapi('ProblemDetails');

/** ===== Registry: register schemas + endpoints ===== */
const registry = new OpenAPIRegistry();

// Register auth schemas
registry.register('LoginDto', LoginDto);
registry.register('RegisterDto', RegisterDto);
registry.register('AuthResponseDto', AuthResponseDto);
registry.register('RefreshTokenDto', RefreshTokenDto);
registry.register('RefreshResponseDto', RefreshResponseDto);
registry.register('UserProfileDto', UserProfileDto);
registry.register('UpdateUserProfileDto', UpdateUserProfileDto);
registry.register('ChangePasswordDto', ChangePasswordDto);
registry.register('AuthErrorDto', AuthErrorDto);
registry.register('PermissionCheckDto', PermissionCheckDto);
registry.register('PermissionResponseDto', PermissionResponseDto);

// Register existing schemas
registry.register('Booking', Booking);
registry.register('ProblemDetails', ProblemDetails);

registry.registerPath({
  method: 'post',
  path: '/v1/bookings',
  request: {
    body: {
      content: { 'application/json': { schema: BookingCreate, example: {
        studentId: '11111111-1111-1111-1111-111111111111',
        instructorId: '22222222-2222-2222-2222-222222222222',
        startAt: new Date().toISOString(),
        durationMin: 90
      } } }
    }
  },
  responses: {
    201: {
      description: 'Created',
      content: { 'application/json': { schema: Booking } }
    },
    400: {
      description: 'Bad Request',
      content: { 'application/json': { schema: ProblemDetails } }
    }
  },
  tags: ['Bookings']
});

// Register auth endpoints
registry.registerPath({
  method: 'post',
  path: '/v1/auth/register',
  summary: 'Register a new user',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterDto,
        },
      },
    },
  },
  responses: {
    '201': {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: AuthResponseDto,
        },
      },
    },
    '400': {
      description: 'Invalid input',
      content: {
        'application/json': {
          schema: AuthErrorDto,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/v1/auth/login',
  request: {
    body: {
      content: { 'application/json': { schema: LoginDto } }
    }
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: AuthResponseDto } }
    },
    401: {
      description: 'Invalid credentials',
      content: { 'application/json': { schema: AuthErrorDto } }
    }
  },
  tags: ['Authentication']
});

registry.registerPath({
  method: 'post',
  path: '/v1/auth/refresh',
  request: {
    body: {
      content: { 'application/json': { schema: RefreshTokenDto } }
    }
  },
  responses: {
    200: {
      description: 'Token refreshed successfully',
      content: { 'application/json': { schema: RefreshResponseDto } }
    },
    401: {
      description: 'Invalid refresh token',
      content: { 'application/json': { schema: AuthErrorDto } }
    }
  },
  tags: ['Authentication']
});

registry.registerPath({
  method: 'get',
  path: '/v1/users/me',
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: { 'application/json': { schema: UserProfileDto } }
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: AuthErrorDto } }
    }
  },
  tags: ['User Profile']
});

registry.registerPath({
  method: 'patch',
  path: '/v1/users/me',
  request: {
    body: {
      content: { 'application/json': { schema: UpdateUserProfileDto } }
    }
  },
  responses: {
    200: {
      description: 'Profile updated successfully',
      content: { 'application/json': { schema: UserProfileDto } }
    },
    400: {
      description: 'Invalid request',
      content: { 'application/json': { schema: AuthErrorDto } }
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: AuthErrorDto } }
    }
  },
  tags: ['User Profile']
});

/** ===== Generate final OpenAPI document ===== */
const generator = new OpenApiGeneratorV3(registry.definitions);
export const openApiDoc = generator.generateDocument({
  openapi: '3.0.3',
  info: { 
    title: 'DriveFlow API', 
    version: '1.0.0',
    description: 'CRM API for driving school management with JWT authentication and RBAC'
  }
});
