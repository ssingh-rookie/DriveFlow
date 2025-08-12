import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🚀 Creating NestJS application...');
    const app = await NestFactory.create(AppModule);

    console.log('📡 Enabling CORS...');
    app.enableCors();

    const port = process.env.PORT || 3001;
    console.log(`📡 Attempting to listen on port ${port}...`);
    await app.listen(port, '127.0.0.1');
    console.log(`✅ SUCCESS! DriveFlow API is running on http://127.0.0.1:${port}`);
    
    // Keep process alive and add monitoring
    setInterval(() => {
      console.log(`💗 Server heartbeat: ${new Date().toISOString()}`);
    }, 30000);
  } catch (error) {
    console.error('❌ FAILED to start NestJS server:', error);
    process.exit(1);
  }
}

bootstrap();
