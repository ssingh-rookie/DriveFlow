import { Controller, Get, Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

@Controller()
export class MinimalController {
  @Get()
  test() {
    return { message: 'WORKING!', timestamp: Date.now() }
  }
}

@Module({
  controllers: [MinimalController],
})
export class MinimalModule {}

async function bootstrap() {
  try {
    console.log('🚀 Starting minimal NestJS app...')
    const app = await NestFactory.create(MinimalModule)

    console.log('📡 Attempting to listen on port 3333...')
    await app.listen(3333)
    console.log('✅ SUCCESS! Server is running on http://localhost:3333')
  }
  catch (error) {
    console.error('❌ FAILED to start server:', error)
    process.exit(1)
  }
}

bootstrap()
