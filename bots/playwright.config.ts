// Destination: bots/playwright.config.ts
import { defineConfig } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export default defineConfig({
  testDir:  './personas',
  timeout:  10 * 60_000,        // long — bot runs can be minutes
  reporter: 'list',
  use: {
    baseURL: API_URL,
    extraHTTPHeaders: { 'X-Bot': 'together-attack-bots' },
  },
})