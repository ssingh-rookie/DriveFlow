import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repo';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RoleGuard } from './guards/role.guard';
import { OrgScopeGuard } from './guards/org-scope.guard';
import { JwtUtil } from './utils/jwt.util';
import { RefreshTokenRotationUtil } from './utils/refresh-token-rotation.util';
import { JwtBlacklistUtil } from './utils/jwt-blacklist.util';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    JwtStrategy,
    JwtAuthGuard,
    RoleGuard,
    OrgScopeGuard,
    JwtUtil,
    RefreshTokenRotationUtil,
    JwtBlacklistUtil,
  ],
  exports: [
    AuthService,
    AuthRepository,
    JwtAuthGuard,
    RoleGuard,
    OrgScopeGuard,
    PassportModule,
  ],
})
export class AuthModule {}
