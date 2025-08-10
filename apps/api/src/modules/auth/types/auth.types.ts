import { OrgRole } from '@driveflow/contracts';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: OrgRole;
  orgId: string;
  iat: number; // Issued at
  exp: number; // Expires at
  jti: string; // JWT ID
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  jti: string; // JWT ID for refresh token
  rotationId: string; // Rotation chain ID
  iat: number; // Issued at
  exp: number; // Expires at
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenData {
  token: string;
  jti: string;
  rotationId: string;
  expiresAt: Date;
}

export interface PermissionContext {
  userId: string;
  role: OrgRole;
  orgId: string;
  assignedStudentIds?: string[];
  childStudentIds?: string[];
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: OrgRole;
    orgId: string;
  };
  tokens: TokenPair;
  expiresIn: number;
}

export interface ValidationResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}

export interface AuthEventData {
  userId: string;
  event: 'login_success' | 'login_failed' | 'logout' | 'token_refresh' | 'password_changed' | 'profile_updated';
  orgId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}
