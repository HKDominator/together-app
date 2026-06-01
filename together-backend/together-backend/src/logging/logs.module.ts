// Destination: together-backend/together-backend/src/logging/logs.module.ts
// REPLACE — switches from APP_INTERCEPTOR to NestMiddleware so the logger
// runs BEFORE controller guards and therefore captures 403s from
// PermissionsGuard (vandal DELETE, probe /admin/*) that were previously
// invisible.  res.once('finish') inside the middleware guarantees the
// correct HTTP status code in every case.
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LogsService } from './logs.service'
import { LogsController } from './logs.controller'
import { LoggingInterceptor } from './logging.interceptor'   // now a NestMiddleware
import { AnomalyDetectorService } from './anomaly-detector.service'
import { ActionLog } from './entities/action-log.entity'
import { Observation } from './entities/observation.entity'
import { User } from '../users/entities/user.entity'
import { AuthModule } from '../auth/auth.module'

// Gold AI bits
import { OllamaClient } from './ai/ollama.client'
import { FeatureExtractorService } from './ai/feature-extractor.service'
import { AiAnomalyService } from './ai/ai-anomaly.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([ActionLog, Observation, User]),
    AuthModule,
  ],
  controllers: [LogsController],
  providers: [
    LogsService,
    AnomalyDetectorService,
    LoggingInterceptor,   // registered as a plain provider so DI can inject it

    // AI pipeline
    OllamaClient,
    FeatureExtractorService,
    AiAnomalyService,
  ],
  exports: [LogsService, AnomalyDetectorService, AiAnomalyService],
})
export class LogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply to every HTTP route. The middleware attaches res.once('finish')
    // and then immediately calls next() — zero overhead on the hot path.
    consumer
      .apply(LoggingInterceptor)
      .forRoutes({ path: '*', method: RequestMethod.ALL })
  }
}
