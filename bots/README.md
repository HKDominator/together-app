# Together attack-bot swarm

Playwright-driven attacker simulator for Assignment 4 Gold. Sends real
HTTP traffic against `/api/*` to exercise the heuristic + AI anomaly
detectors and populate the observation list.

## Quick start

```bash
cd bots
npm install
npm run install:browsers      # one-time

# In another terminal: backend must be running.
npm run swarm:demo            # 3 normal + 2 scraper + 1 vandal + 2 probe, 120s
```

Then open `http://localhost:3000/admin/observation` (logged in as Ana)
and watch the rows accumulate.

## Personas

| Persona  | Rate           | Behaviour                                              | Heuristic rule | AI signal |
|----------|----------------|--------------------------------------------------------|----------------|-----------|
| normal   | ~6/min         | List, view, occasional create + comment, 30s pauses    | (none)         | normal    |
| scraper  | ~6/sec         | GETs every list endpoint                               | burst          | scraper   |
| vandal   | ~15/min        | Create-then-delete loop                                | delete spree   | vandal    |
| probe    | ~1/sec         | Admin endpoints + invalid UUIDs                        | 4xx probing    | probe     |

The `normal` persona is the **negative control**: it should never
trip a rule. If it does, the thresholds in
`anomaly-detector.service.ts` need raising.

## Individual personas

```bash
# Single persona, manual control (uses playwright test runner):
BOT_IDX=0 BOT_DURATION=60 npx playwright test personas/scraper.bot.ts
```

## Environment

| Var          | Default                 | Purpose                          |
|--------------|-------------------------|----------------------------------|
| `API_URL`    | `http://localhost:3001` | Backend base URL                 |

## What you should see

1. Within ~30s, the scraper(s) trip the burst heuristic.
2. Within ~60s, the vandal(s) trip the delete-spree rule.
3. Within ~2 min, the probe(s) cross the 4xx threshold.
4. Within ~1 min (one AI cron interval), AI verdicts start appearing
   on each bot with signals matching their persona, evidence merged
   into the existing observation rows.