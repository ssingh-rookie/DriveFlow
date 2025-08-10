import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

/**
 * Metadata key for marking endpoints as public (skip authentication)
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * JWT Authentication Guard
 * Protects endpoints by validating JWT access tokens
 * Supports public endpoints via @Public() decorator
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determine if authentication is required for the current request
   * @param context - Execution context containing request information
   * @returns true if authentication can proceed, false to skip
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Use passport JWT strategy for authentication
    return super.canActivate(context);
  }

  /**
   * Handle authentication errors with custom error messages
   * @param err - Authentication error
   * @param user - User object (if authentication succeeded)
   * @param info - Additional authentication information
   * @param context - Execution context
   * @returns Authenticated user or throws exception
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, throw UnauthorizedException
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      
      // Provide specific error messages based on the failure reason
      let errorMessage = 'Authentication failed';
      
      if (info) {
        switch (info.name) {
          case 'TokenExpiredError':
            errorMessage = 'Access token has expired';
            break;
          case 'JsonWebTokenError':
            errorMessage = 'Invalid access token';
            break;
          case 'NotBeforeError':
            errorMessage = 'Access token not active yet';
            break;
          case 'TokenRequiredError':
          case 'AuthTokenMissingError':
            errorMessage = 'Access token is required';
            break;
          default:
            if (info.message) {
              errorMessage = info.message;
            }
        }
      }

      if (err?.message) {
        errorMessage = err.message;
      }

      // Log the authentication failure
      console.warn('JWT Authentication failed:', {
        endpoint: `${request.method} ${request.path}`,
        error: errorMessage,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        timestamp: new Date().toISOString(),
      });

      throw new UnauthorizedException(errorMessage);
    }

    return user;
  }
}

/**
 * Decorator to mark endpoints as public (skip authentication)
 * Usage: @Public()
 */
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
