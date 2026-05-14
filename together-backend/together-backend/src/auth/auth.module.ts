// Destination: together-backend/src/auth/auth.module.ts
// REPLACE — adds Session + LoginAttempt + PasswordReset repos and the
// JwtUtil / Mailer providers. SessionsModule (Silver §2.3) and
// RecoveryModule (Silver §2.5) extend this.
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthGuard } from './guards/auth.guard'
import { PermissionsGuard } from './guards/permissions.guard'
import { JwtUtil } from './jwt-util.service'
import { MailerService } from './mailer.service'
import { Role } from './entities/role.entity'
import { Permission } from './entities/permission.entity'
import { Session } from './entities/session.entity'
import { LoginAttempt } from './entities/login-attempt.entity'
import { PasswordReset } from './entities/password-reset.entity'
import { User } from '../users/entities/user.entity'
import { SessionsController } from './sessions.controller'
import { SessionsService }    from './sessions.service'
import { RecoveryController } from './recovery.controller'
import { RecoveryService }    from './recovery.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Role, Permission,
      Session, LoginAttempt, PasswordReset,
    ]),
  ],
  controllers: [AuthController, SessionsController, RecoveryController],
  providers: [
    AuthService, AuthGuard, PermissionsGuard,
    JwtUtil, MailerService,
    SessionsService, RecoveryService,
  ],
  exports: [
    AuthService, AuthGuard, PermissionsGuard,
    JwtUtil, MailerService,
    TypeOrmModule,
  ],
})
export class AuthModule {}