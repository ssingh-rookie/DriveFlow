import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { ConfigModule } from './core/config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TestController } from './test.controller';
import { SimpleController } from './simple.controller';
import { TestMinimalController } from './test-minimal.controller';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  controllers: [TestMinimalController],
})
export class AppModule {}
