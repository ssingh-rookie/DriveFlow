import type {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  UpdateUserProfileDto,
} from '@driveflow/contracts'
import type { AuthService } from './auth.service'
import type { AuthenticatedUser } from './strategies/jwt.strategy'

import {
  AuthErrorDto,
  AuthResponseDto,
  RefreshResponseDto,
  UserProfileDto,
} from '@driveflow/contracts'

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from './decorators/current-user.decorator'
import { Permissions } from './decorators/roles.decorator'
import { JwtAuthGuard, Public } from './guards/jwt-auth.guard'
import { OrgScopeGuard } from './guards/org-scope.guard'
import { RoleGuard } from './guards/role.guard'

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: () => AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid registration data',
    type: () => AuthErrorDto,
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      return await this.authService.register(registerDto)
    }
    catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: () => AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    type: () => AuthErrorDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      return await this.authService.login(loginDto)
    }
    catch (error) {
      throw new UnauthorizedException('Invalid credentials')
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: () => RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
    type: () => AuthErrorDto,
  })
  async refreshToken(@Body() refreshDto: RefreshTokenDto): Promise<RefreshResponseDto> {
    try {
      return await this.authService.refreshToken(refreshDto.refreshToken)
    }
    catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 204,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: () => AuthErrorDto,
  })
  async logout(
    @Request() request: any,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const refreshToken = this.extractRefreshTokenFromBody(request.body)
    await this.authService.logout(refreshToken, user)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RoleGuard, OrgScopeGuard)
  @Permissions('profile:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: () => UserProfileDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: () => AuthErrorDto,
  })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto> {
    return await this.authService.getUserProfile(user.id)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RoleGuard, OrgScopeGuard)
  @Permissions('profile:write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: () => UserProfileDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
    type: () => AuthErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: () => AuthErrorDto,
  })
  async updateProfile(
    @Body() updateDto: UpdateUserProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfileDto> {
    try {
      return await this.authService.updateUserProfile(user.id, updateDto)
    }
    catch (error) {
      throw new BadRequestException('Invalid profile data')
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid password data',
    type: () => AuthErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: () => AuthErrorDto,
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    try {
      await this.authService.changePassword(
        user.id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      )
      return { message: 'Password changed successfully' }
    }
    catch (error) {
      throw new BadRequestException('Invalid password data')
    }
  }

  private extractRefreshTokenFromBody(body: any): string {
    const refreshToken = body.refreshToken
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required')
    }
    return refreshToken
  }
}
