// ─────────────────────────────────────────────────────────────────────
// Destination: src/main.ts
// Fix: dropped `forbidNonWhitelisted: true` from the global
// ValidationPipe.
//
// Why: GraphQL resolvers receive args as a nested object where each
// @Args() parameter is a top-level key. The global pipe sees the
// outer object first and, because that object doesn't match any DTO
// class, it considers every nested field as "non-whitelisted" and
// rejects the whole request.
//
// `whitelist: true` still strips unknown fields silently on the REST
// side, which is the main security benefit. Dropping `forbid...`
// just changes "throw on unknown" to "silently drop unknown" —
// still safe.
// ─────────────────────────────────────────────────────────────────────
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')

  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // still strips fields not in DTOs
      // forbidNonWhitelisted removed — broke GraphQL nested args.
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  const port = Number(process.env.PORT) || 3001
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`🚀 Together backend listening on http://localhost:${port}/api`)
}
bootstrap()