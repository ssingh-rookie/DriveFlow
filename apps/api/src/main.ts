import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  try {
    console.warn("🚀 Creating NestJS application...");
    const app = await NestFactory.create(AppModule);

    console.warn("📡 Enabling CORS...");
    app.enableCors();

    console.warn("🔗 Setting global API prefix...");
    app.setGlobalPrefix("api");

    const port = process.env.PORT || 3001;
    console.warn(`📡 Attempting to listen on port ${port}...`);
    await app.listen(port, "127.0.0.1");
    console.warn(
      `✅ SUCCESS! DriveFlow API is running on http://127.0.0.1:${port}`,
    );

    // Keep process alive and add monitoring
    setInterval(() => {
      console.warn(`💗 Server heartbeat: ${new Date().toISOString()}`);
    }, 30000);
  } catch (error) {
    console.error("❌ FAILED to start NestJS server:", error);
    process.exit(1);
  }
}

bootstrap();
