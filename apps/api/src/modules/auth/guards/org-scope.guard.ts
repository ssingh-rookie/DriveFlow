import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { AuthRepository } from '../auth.repo';

export const ORG_CONTEXT_KEY = 'ensureOrgContext';

/**
 * Organization Scoping Guard for Multi-Tenancy
 * Ensures user is acting within a valid organization context
 */
@Injectable()
export class OrgScopeGuard implements CanActivate {
  private readonly logger = new Logger(OrgScopeGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authRepo: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    const ensureOrgContext = this.reflector.getAllAndOverride<boolean>(ORG_CONTEXT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If decorator is not present, skip the guard
    if (!ensureOrgContext) {
      return true;
    }

    if (!user) {
      this.logAndThrow(request, 'User authentication required for organization scoping', 'unauthenticated_user');
    }

    const orgId = this.getOrgIdFromRequest(request);

    if (!orgId) {
      this.logAndThrow(request, 'Organization ID is missing from request context', 'missing_org_id', user);
    }

    if (user.orgId && user.orgId !== orgId) {
      this.logAndThrow(request, 'User token organization does not match request organization', 'token_org_mismatch', user);
    }

    const isMember = await this.authRepo.isUserMemberOfOrg(user.id, orgId);

    if (!isMember) {
      this.logAndThrow(request, `User is not a member of organization ${orgId}`, 'not_org_member', user);
    }

    return true;
  }

  private getOrgIdFromRequest(request: any): string | undefined {
    return request.params?.orgId || request.query?.orgId || request.body?.orgId || request.headers?.['x-org-id'];
  }

  private logAndThrow(request: any, message: string, reason: string, user?: AuthenticatedUser): never {
    this.logger.warn(`OrgScopeGuard denied access: ${message} (reason: ${reason})`);
    
    this.authRepo.logSecurityEvent({
      userId: user?.id,
      event: 'org_scope_guard_denied',
      severity: 'medium',
      details: {
        reason,
        endpoint: `${request.method} ${request.path}`,
        orgId: this.getOrgIdFromRequest(request),
        userOrgId: user?.orgId,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    throw new ForbiddenException(message);
  }
}

/**
 * Decorator to enforce organization context
 */
import { SetMetadata } from '@nestjs/common';
export const EnsureOrgContext = () => SetMetadata(ORG_CONTEXT_KEY, true);
