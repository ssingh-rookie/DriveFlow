import { Module } from '@nestjs/common'
import { PrismaModule } from '../../core/prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
