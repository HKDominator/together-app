// Destination: together-backend/together-backend/src/logs/logs.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { LogsService } from './logs.service'
import { LogsController } from './logs.controller'
import { LoggingInterceptor } from './logging.interceptor'
import { AnomalyDetectorService } from './anomaly-detector.service'
import { ActionLog } from './entities/action-log.entity'
import { Observation } from './entities/observation.entity'
import { User } from '../users/entities/user.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([ActionLog, Observation, User]),
    AuthModule,
  ],
  controllers: [LogsController],
  providers: [
    LogsService,
    AnomalyDetectorService,
    // Globally attach the interceptor — every controller route is logged.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [LogsService, AnomalyDetectorService],
})
export class LogsModule {}