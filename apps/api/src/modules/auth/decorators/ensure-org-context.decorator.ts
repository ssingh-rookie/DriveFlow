import { SetMetadata } from '@nestjs/common';
import { ORG_CONTEXT_KEY } from '../guards/org-scope.guard';

/**
 * Decorator to enforce organization context
 */
export const EnsureOrgContext = () => SetMetadata(ORG_CONTEXT_KEY, true);
