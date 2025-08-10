import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import {
  LoginDto,
  AuthResponseDto,
  RefreshResponseDto,
  UserProfileDto,
  UpdateUserProfileDto,
  JwtPayloadDto
} from '@driveflow/contracts';

import { AuthRepository } from './auth.repo';
import { PasswordUtil } from './utils/password.util';
import { JwtUtil } from './utils/jwt.util';
import { JwtPayload } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordUtil: PasswordUtil,
    private readonly jwtUtil: JwtUtil
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.authRepo.findUserByEmail(loginDto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.verifyPassword(
      loginDto.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user's primary organization role
    const userOrg = await this.authRepo.getUserPrimaryOrg(user.id);
    if (!userOrg) {
      throw new UnauthorizedException('User has no organization access');
    }

    // Generate tokens
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: userOrg.role,
      orgId: userOrg.orgId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      jti: this.jwtUtil.generateJti()
    };

    const accessToken = this.jwtService.sign(jwtPayload);
    const refreshToken = await this.jwtUtil.generateRefreshToken(user.id);

    // Log successful login
    await this.authRepo.logAuthEvent({
      userId: user.id,
      event: 'login_success',
      metadata: { orgId: userOrg.orgId, role: userOrg.role }
    });

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: userOrg.role,
        orgId: userOrg.orgId
      }
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshResponseDto> {
    // Validate and rotate refresh token
    const tokenData = await this.jwtUtil.validateAndRotateRefreshToken(refreshToken);
    
    // Get user and org data
    const user = await this.authRepo.findUserById(tokenData.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const userOrg = await this.authRepo.getUserPrimaryOrg(user.id);
    if (!userOrg) {
      throw new UnauthorizedException('User has no organization access');
    }

    // Generate new access token
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: userOrg.role,
      orgId: userOrg.orgId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      jti: this.jwtUtil.generateJti()
    };

    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      refreshToken: tokenData.newRefreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer'
    };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    // Revoke refresh token
    await this.jwtUtil.revokeRefreshToken(refreshToken);

    // Log logout event
    await this.authRepo.logAuthEvent({
      userId,
      event: 'logout',
      metadata: {}
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

    // Revoke all refresh tokens to force re-login
    await this.jwtUtil.revokeAllUserRefreshTokens(userId);

    // Log password change
    await this.authRepo.logAuthEvent({
      userId,
      event: 'password_changed',
      metadata: {}
    });
  }
}
