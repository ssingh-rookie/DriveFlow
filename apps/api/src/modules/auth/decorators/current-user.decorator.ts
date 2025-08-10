import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Current User Parameter Decorator
 * Extracts the authenticated user from the request context
 * 
 * Usage examples:
 * 
 * Get full user object:
 * @Get('profile')
 * async getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 * 
 * Get specific user property:
 * @Get('user-id')
 * async getUserId(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * 
 * Get user role:
 * @Post('admin-only')
 * async adminAction(@CurrentUser('role') role: string) {
 *   // role will be 'owner', 'admin', 'instructor', or 'student'
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new Error('User not found in request context. Ensure @UseGuards(JwtAuthGuard) is applied.');
    }

    // If no specific field is requested, return the entire user object
    if (!data) {
      return user;
    }

    // Return the specific field requested
    return user[data];
  },
);

/**
 * Current User ID Decorator
 * Shorthand for extracting just the user ID
 * 
 * Usage:
 * @Get('my-data')
 * async getMyData(@CurrentUserId() userId: string) {
 *   return this.service.findByUserId(userId);
 * }
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new Error('User not found in request context. Ensure @UseGuards(JwtAuthGuard) is applied.');
    }

    return user.id;
  },
);

/**
 * Current Organization ID Decorator
 * Extracts the organization ID from the authenticated user's token
 * 
 * Usage:
 * @Get('org-data')
 * async getOrgData(@CurrentOrgId() orgId: string) {
 *   if (!orgId) {
 *     throw new BadRequestException('Organization context required');
 *   }
 *   return this.service.findByOrgId(orgId);
 * }
 */
export const CurrentOrgId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new Error('User not found in request context. Ensure @UseGuards(JwtAuthGuard) is applied.');
    }

    return user.orgId;
  },
);

/**
 * Current User Role Decorator
 * Extracts the user's role from the authenticated user's token
 * 
 * Usage:
 * @Get('role-specific')
 * async getRoleData(@CurrentUserRole() role: string) {
 *   // role will be 'owner', 'admin', 'instructor', or 'student'
 *   return this.service.getRoleSpecificData(role);
 * }
 */
export const CurrentUserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new Error('User not found in request context. Ensure @UseGuards(JwtAuthGuard) is applied.');
    }

    return user.role;
  },
);

/**
 * Current Token JTI Decorator
 * Extracts the JWT ID (JTI) from the current access token
 * Useful for token tracking and invalidation
 * 
 * Usage:
 * @Post('logout')
 * async logout(@CurrentTokenJti() jti: string) {
 *   await this.authService.invalidateToken(jti);
 * }
 */
export const CurrentTokenJti = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new Error('User not found in request context. Ensure @UseGuards(JwtAuthGuard) is applied.');
    }

    return user.jti;
  },
);
