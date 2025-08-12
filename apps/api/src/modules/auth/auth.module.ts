import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'

import { AuthController } from './auth.controller'
import { AuthRepository } from './auth.repo'
import { AuthService } from './auth.service'

import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { OrgScopeGuard } from './guards/org-scope.guard'
import { RoleGuard } from './guards/role.guard'
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtBlacklistUtil } from './utils/jwt-blacklist.util'
import { JwtUtil } from './utils/jwt.util'
import { RefreshTokenRotationUtil } from './utils/refresh-token-rotation.util'

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
