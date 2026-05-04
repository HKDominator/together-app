// Destination: together-backend/together-backend/src/main.ts
// REPLACE — add cookie-parser middleware so req.cookies is populated.
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')

  app.use(cookieParser())

  const origins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map(s => s.trim()).filter(Boolean)

  app.enableCors({ origin: origins, credentials: true })

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, transform: true,
    transformOptions: { enableImplicitConversion: true },
  }))

  const port = Number(process.env.PORT) || 3001
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 Together backend on :${port}/api  · CORS=${origins.join(',')}`)
}
bootstrap()