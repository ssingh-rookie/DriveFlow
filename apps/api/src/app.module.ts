import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { ConfigModule } from './core/config/config.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
})
export class AppModule {}
