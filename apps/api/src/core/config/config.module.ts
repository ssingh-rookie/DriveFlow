import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { EnvConfigService } from './env.config';

/**
 * Global configuration module for the DriveFlow API
 * Provides environment configuration throughout the application
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [EnvConfigService],
  exports: [EnvConfigService],
})
export class ConfigModule {
  constructor(private readonly envConfig: EnvConfigService) {
    // Validate environment variables on module initialization
    this.envConfig.validateRequiredVars();
    
    // Log configuration summary (safe, no secrets)
    if (this.envConfig.isDevelopment) {
      console.log('🔧 Configuration Summary:');
      console.table(this.envConfig.getConfigSummary());
    }
  }
}
