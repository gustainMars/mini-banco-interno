import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [HealthModule, ConfigModule.forRoot({
    isGlobal: true, validate: validateEnv, envFilePath: '../../.env'
  })],
})
export class AppModule {}
