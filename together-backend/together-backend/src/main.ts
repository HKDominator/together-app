// Destination: together-backend/src/main.ts
// REPLACE — adds HTTPS support (self-signed certs for the lab) and
// makes CORS origins driven by a single env var that every gateway
// also reads.
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import { readFileSync } from 'fs'
import { AppModule } from './app.module'

async function bootstrap() {
  // ── HTTPS setup ────────────────────────────────────────────────
  // If HTTPS_KEY + HTTPS_CERT are set, bind on https; else http.
  const httpsKey  = process.env.HTTPS_KEY
  const httpsCert = process.env.HTTPS_CERT
  const httpsOptions = (httpsKey && httpsCert)
    ? { key: readFileSync(httpsKey), cert: readFileSync(httpsCert) }
    : undefined

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    httpsOptions ? { httpsOptions } : {},
  )
  app.setGlobalPrefix('api')
  app.use(cookieParser())

  // CORS origins — comma-separated. Include any IPs/hostnames you need
  // the LAN client to connect from.
  const origins = (process.env.CLIENT_ORIGIN
    ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map(s => s.trim()).filter(Boolean)

  app.enableCors({ origin: origins, credentials: true })

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, transform: true,
    transformOptions: { enableImplicitConversion: true },
  }))

  const port = Number(process.env.PORT) || 3001
  await app.listen(port, '0.0.0.0')
  const proto = httpsOptions ? 'https' : 'http'
  console.log(`🚀 Together backend on ${proto}://0.0.0.0:${port}/api`)
  console.log(`   CORS allow: ${origins.join(', ')}`)
}
bootstrap()