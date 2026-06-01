// Destination: together-backend/together-backend/src/logging/ai/ollama.client.ts
//
// Minimal Ollama client. We do NOT use the SDK on purpose — keeps the
// dependency surface small and makes failure modes (timeout, parse
// error, no model loaded) crystal clear.
//
// Env:
//   OLLAMA_URL   default http://localhost:11434
//   OLLAMA_MODEL default qwen2.5:3b   (~2GB, fast, decent JSON output)
//
// Cron-safe: every call is bounded by an AbortController; isAvailable()
// is cached for 30s so we don't hammer a dead service.
import { Injectable, Logger } from '@nestjs/common'

interface OllamaGenerateRequest {
  model:  string
  prompt: string
  stream: false
  format: 'json'
  options?: { temperature?: number; num_predict?: number; num_ctx?: number }
}
interface OllamaGenerateResponse { response: string; done: boolean }

export interface OllamaResult<T> {
  ok:      boolean
  parsed?: T
  raw?:    string
  err?:    string
}

@Injectable()
export class OllamaClient {
  private readonly log = new Logger(OllamaClient.name)
  private readonly baseUrl = process.env.OLLAMA_URL   ?? 'http://localhost:11434'
  private readonly model   = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b'

  // ── Health check (cached) ────────────────────────────────────
  private healthCheckedAt = 0
  private healthOk        = false
  private static HEALTH_TTL_MS = 30_000

  async isAvailable(): Promise<boolean> {
    if (Date.now() - this.healthCheckedAt < OllamaClient.HEALTH_TTL_MS) {
      return this.healthOk
    }
    try {
      const ac = new AbortController()
      const t  = setTimeout(() => ac.abort(), 2_000)
      const r  = await fetch(`${this.baseUrl}/api/tags`, { signal: ac.signal })
      clearTimeout(t)
      this.healthOk        = r.ok
      this.healthCheckedAt = Date.now()
      return this.healthOk
    } catch {
      this.healthOk        = false
      this.healthCheckedAt = Date.now()
      return false
    }
  }

  // ── JSON-mode generation ─────────────────────────────────────
  async generateJson<T>(prompt: string, timeoutMs = 15_000): Promise<OllamaResult<T>> {
    const ac = new AbortController()
    const t  = setTimeout(() => ac.abort(), timeoutMs)
    try {
      const body: OllamaGenerateRequest = {
        model:  this.model,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, num_predict: 256, num_ctx: 2048 },
      }
      const r = await fetch(`${this.baseUrl}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  ac.signal,
      })
      if (!r.ok) {
        return { ok: false, err: `Ollama HTTP ${r.status}` }
      }
      const data = await r.json() as OllamaGenerateResponse
      const raw  = data.response ?? ''
      try {
        return { ok: true, parsed: JSON.parse(raw) as T, raw }
      } catch (e) {
        return { ok: false, raw, err: `JSON parse: ${(e as Error).message}` }
      }
    } catch (e) {
      const err = (e as Error).name === 'AbortError'
        ? `timeout after ${timeoutMs}ms`
        : (e as Error).message
      return { ok: false, err }
    } finally {
      clearTimeout(t)
    }
  }

  modelName(): string { return this.model }
}