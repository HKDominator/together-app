// Destination: together-backend/together-backend/src/database/database.module.ts
// REPLACE: now also runs runSqlBootstrap on app startup.
import { Module, OnModuleInit } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { runSqlBootstrap } from './sql-bootstrap'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type:     'postgres',
        host:     cfg.get<string>('DB_HOST',     'localhost'),
        port:     cfg.get<number>('DB_PORT',     5432),
        username: cfg.get<string>('DB_USER',     'together'),
        password: cfg.get<string>('DB_PASSWORD', 'together_dev'),
        database: cfg.get<string>('DB_NAME',     'together'),
        synchronize:      cfg.get<string>('DB_SYNC', 'true') === 'true',
        logging:          cfg.get<string>('DB_LOGGING', 'false') === 'true',
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly ds: DataSource) {}

  // Runs once after the module's TypeORM connection is up, so SPs and
  // triggers are guaranteed to exist by the time controllers go live.
  async onModuleInit() {
    await runSqlBootstrap(this.ds)
  }
}