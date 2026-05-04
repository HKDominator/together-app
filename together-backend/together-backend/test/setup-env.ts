// Destination: together-backend/together-backend/test/setup-env.ts
// Loads .env.test for jest e2e runs. Referenced from jest config below.
import { config } from 'dotenv'
import { join } from 'path'
config({ path: join(__dirname, '..', '.env.test') })