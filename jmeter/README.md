# JMeter benchmark — tag-affinity endpoints

Compares the three implementations of the same query under load. Each
thread group authenticates **Dan** (`dan@together.dev`) once then hammers
its endpoint.  Dan has 2FA (OTP only, no PIN) so the JMX handles the
two-step login automatically via `devOtp` returned in the login response.

## Run modes

### GUI (good for first run / debugging)

```bash
jmeter -t jmeter/together-tag-affinity.jmx
```

### Headless (good for repeatable numbers)

```bash
jmeter -n -t jmeter/together-tag-affinity.jmx \
  -l results.jtl -e -o report/ \
  -Jhost=localhost -Jport=3001 \
  -Jthreads=50 -Jramp=15 -Jduration=60
```

Open `report/index.html` for the dashboard.

## Tunables (via `-J`)

| Param      | Default     |
|------------|-------------|
| `host`     | localhost   |
| `port`     | 3001        |
| `threads`  | 50          |
| `ramp`     | 15  (sec)   |
| `duration` | 60  (sec)   |

## Pre-flight

1. **Seed the heavy dataset:**
   ```bash
   cd backend
   USERS=200 TAGS=50 TASKS=50000 npm run seed:big
   ```
2. **Verify Dan can hit the endpoint:**
   ```bash
   # password login — returns {stage:"otp", devOtp:"...", attemptId:"..."}
   curl -k -c c.txt -X POST -H 'Content-Type: application/json' \
        -d '{"email":"dan@together.dev","password":"dandan123"}' \
        https://localhost:3001/api/auth/login
   # complete OTP (substitute the devOtp + attemptId from the response above)
   curl -k -b c.txt -c c.txt -X POST -H 'Content-Type: application/json' \
        -d '{"attemptId":"<id>","code":"<devOtp>"}' \
        https://localhost:3001/api/auth/login/otp
   # verify session cookie works
   curl -k -b c.txt https://localhost:3001/api/stats/tag-affinity/sql | head -c 200
   ```
3. **Raise the AI threshold** so JMeter threads don't flag Dan as a bot:
   ```bash
   AI_THRESHOLD=200 npm run start:dev
   ```
   (50 threads × constant loop hits the burst heuristic otherwise.)

## Expected ballpark (50k tasks, 200 users, 50 concurrent threads)

| Endpoint   | p50      | p95      | Throughput  |
|------------|----------|----------|-------------|
| `/naive`   | 15-30 s  | 30+  s   | <2 req/s    |
| `/sql`     | 300-600 ms | 1-2 s | 50-100 req/s |
| `/cached`  | 30-80 ms | 100-200 ms | 500+ req/s |

Run on a 2024-era laptop. Your numbers will vary, but the **order of
magnitude** is the point.

## Before/after index demo

```sql
-- Before
DROP INDEX IF EXISTS task_tags_tag_task_idx;
DROP INDEX IF EXISTS task_tags_task_tag_idx;
DROP INDEX IF EXISTS tasks_assignee_state_idx;
```

Re-run JMeter against `/sql` only. Expect 5-10x slower. Then:

```bash
curl -k -b c.txt -X POST https://localhost:3001/api/stats/tag-affinity/refresh
```

This re-runs the SQL bootstrap on next backend restart, or run
`03_tags_and_indices.sql` directly:

```bash
psql -U together together -f backend/init-sql/03_tags_and_indices.sql
```
