// Destination: together-backend/together-backend/src/ai/ai.module.ts
// Shared local-AI module (ADR-0004 consequence). Owns the OllamaClient so
// both the logging anomaly pipeline and the Pulse module inject the same
// health-checked, JSON-mode client. No new AI dependency, no cloud calls.
import { Module } from '@nestjs/common'
import { OllamaClient } from './ollama.client'

@Module({
  providers: [OllamaClient],
  exports:   [OllamaClient],
})
export class AiModule {}
