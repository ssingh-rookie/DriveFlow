import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import {
  LoginDto,
  AuthResponseDto,
  RefreshResponseDto,
  UserProfileDto,
  UpdateUserProfileDto,
  RegisterDto,
} from '@driveflow/contracts';

import { AuthRepository } from './auth.repo';
import { PasswordUtil } from './utils/password.util';
import { JwtUtil } from './utils/jwt.util';
import { RefreshTokenRotationUtil } from './utils/refresh-token-rotation.util';
import { JwtBlacklistUtil, RevocationReason } from './utils/jwt-blacklist.util';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import { JwtPayload } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtUtil: JwtUtil,
    private readonly refreshTokenRotationUtil: RefreshTokenRotationUtil,
    private readonly blacklistUtil: JwtBlacklistUtil,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, fullName, orgName } = registerDto;

    const existingUser = await this.authRepo.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await PasswordUtil.hashPassword(password);
    
    // In a real app, this would be a transactional operation
    const newUser = await this.authRepo.createUser({
      email,
      password: hashedPassword,
      fullName,
    });

    const newOrg = await this.authRepo.createOrganization({ name: orgName });
    await this.authRepo.addUserToOrg(newUser.id, newOrg.id, 'owner');

    return this.login({ email, password });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.authRepo.findUserByEmailWithPassword(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await PasswordUtil.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userOrg = await this.authRepo.getUserPrimaryOrg(user.id);
    if (!userOrg) {
      throw new UnauthorizedException('User has no organization access');
    }

    const rotationId = this.jwtUtil.generateRotationId();

    const accessToken = this.jwtUtil.generateAccessToken({
      userId: user.id,
      role: userOrg.role,
      orgId: userOrg.orgId,
    });

    const refreshToken = this.jwtUtil.generateRefreshToken({
      userId: user.id,
      role: userOrg.role,
      orgId: userOrg.orgId,
      rotationId,
    });

    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7);

    await this.authRepo.createRefreshToken({
      userId: user.id,
      jti: this.jwtUtil.extractJti(refreshToken)!,
      rotationId,
      tokenHash: this.jwtUtil.hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    await this.authRepo.logAuthEvent({
      userId: user.id,
      event: 'login_success',
      metadata: { orgId: userOrg.orgId, role: userOrg.role },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: userOrg.role,
        orgId: userOrg.orgId,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshResponseDto> {
    const result = await this.refreshTokenRotationUtil.rotateRefreshToken(refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
    };
  }

  async logout(refreshToken: string, user: AuthenticatedUser): Promise<void> {
    const tokenInfo = this.jwtUtil.decodeToken(refreshToken);
    if (tokenInfo && tokenInfo.jti) {
      await this.blacklistUtil.revokeRefreshToken(
        tokenInfo.jti,
        RevocationReason.USER_LOGOUT,
        { userId: user.id }
      );
    }
    await this.authRepo.logAuthEvent({
      userId: user.id,
      event: 'logout',
      metadata: {},
    });
  }

  async validateJwtPayload(payload: JwtPayload): Promise<JwtPayload> {
    // Verify user still exists and has access
    const user = await this.authRepo.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify organization access
    const userOrg = await this.authRepo.getUserOrgByRole(payload.sub, payload.orgId, payload.role);
    if (!userOrg) {
      throw new UnauthorizedException('Invalid organization access');
    }

    return payload;
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.authRepo.findUserWithOrgs(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      organizations: user.orgs.map(userOrg => ({
        orgId: userOrg.orgId,
        orgName: userOrg.org.name,
        role: userOrg.role
      }))
    };
  }

  async updateUserProfile(userId: string, updateDto: UpdateUserProfileDto): Promise<UserProfileDto> {
    // Validate update data
    if (updateDto.fullName && updateDto.fullName.trim().length === 0) {
      throw new BadRequestException('Full name cannot be empty');
    }

    // Update user profile
    const updatedUser = await this.authRepo.updateUser(userId, {
      fullName: updateDto.fullName,
      phone: updateDto.phone
    });

    // Log profile update
    await this.authRepo.logAuthEvent({
      userId,
      event: 'profile_updated',
      metadata: { updatedFields: Object.keys(updateDto) }
    });

    return this.getUserProfile(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with current password
    const user = await this.authRepo.findUserById(userId);
    if (!user || !user.password) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordUtil.verifyPassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await PasswordUtil.hashPassword(newPassword);

    // Update password
    await this.authRepo.updateUser(userId, { password: hashedNewPassword });

    await this.blacklistUtil.revokeAllUserTokens(userId, RevocationReason.PASSWORD_CHANGE);

    await this.authRepo.logAuthEvent({
      userId,
      event: 'password_changed',
      metadata: {}
    });
  }
}
