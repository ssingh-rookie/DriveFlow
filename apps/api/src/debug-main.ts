import { NestFactory } from '@nestjs/core';
import { Controller, Get, Module } from '@nestjs/common';

@Controller()
export class DebugController {
  @Get()
  test() {
    return { message: 'Debug working!', timestamp: Date.now() };
  }
}

@Module({
  controllers: [DebugController],
})
export class DebugModule {}

async function bootstrap() {
  try {
    console.log('🚀 Creating debug NestJS app...');
    const app = await NestFactory.create(DebugModule);
    
    console.log('📡 Getting HTTP adapter...');
    const httpAdapter = app.getHttpAdapter();
    console.log('📡 HTTP Adapter:', httpAdapter.constructor.name);
    
    console.log('📡 Getting Express instance...');
    const expressInstance = httpAdapter.getInstance();
    console.log('📡 Express instance type:', typeof expressInstance);
    
    console.log('📡 Attempting to listen...');
    const server = await app.listen(3002, '0.0.0.0');
    
    console.log('📡 Getting server info...');
    console.log('📡 Server listening:', server.listening);
    console.log('📡 Server address:', server.address());
    
    console.log('✅ Debug server started successfully!');
    
    // Keep the process alive
    setInterval(() => {
      console.log('💗 Server is alive at', new Date().toISOString());
    }, 5000);
    
    // Test manual HTTP request
    setTimeout(() => {
      console.log('🔍 Testing self-request...');
      fetch('http://localhost:3002/')
        .then(r => r.json())
        .then(data => console.log('✅ Self-request successful:', data))
        .catch(err => console.error('❌ Self-request failed:', err));
    }, 1000);
    
    // Prevent process exit
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('uncaughtException', (err) => {
      console.error('💥 Uncaught exception:', err);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    });
    
  } catch (error) {
    console.error('❌ Debug server failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

bootstrap();