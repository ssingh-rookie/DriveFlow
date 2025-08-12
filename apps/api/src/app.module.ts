import { Module } from '@nestjs/common'
import { TestMinimalController } from './test-minimal.controller'

@Module({
  controllers: [TestMinimalController],
})
export class AppModule {}
