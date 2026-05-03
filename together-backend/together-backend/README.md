# Together — Backend (SDI Assignment 2, Bronze + Silver)

REST API + WebSocket gateway for the *Together* couple-planner app. Built with **NestJS + TypeScript**.

- **No persistence** — everything lives in RAM, resets on every restart. Enforced by the Bronze requirements.
- **Server-side validation** via `class-validator` DTOs + a global `ValidationPipe`.
- **Server-side pagination** on `GET /api/tasks`.
- **State machine** enforced for task transitions (`todo → in_progress → done`, with cancellation branches).
- **WebSocket broadcasts** on every mutation — both real clients and the faker generator push through the same gateway.
- **Faker generator** — start/stop endpoints that run an async loop producing valid tasks on a 3s interval.
- **Unit tests** covering all CRUD paths, state-machine edge cases, and the controller layer.

See [`BENCHMARK.md`](./BENCHMARK.md) for the stack comparison table I used to justify this choice in lab.

---

## Run it

```bash
npm install
npm run start:dev     # watch mode, http://localhost:3001/api
```

The frontend (`together-app`, Next.js) is expected to run on `localhost:3000`. CORS is already whitelisted for both `localhost:3000` and `127.0.0.1:3000` in `src/main.ts`.

Override the port:
```bash
PORT=4000 npm run start:dev
```

---

## Tests

```bash
npm run test           # run the unit tests
npm run test:cov       # coverage report → ./coverage/lcov-report/index.html
```

The `tasks/` module is the heart of the application; coverage there is essentially 100%. `main.ts` and the `*.module.ts` files are excluded from the coverage threshold (pure wiring).

---

## Endpoints

All routes live under **`/api`**. Responses are JSON.

### Tasks

| Method | Path                       | Body               | Response                                   |
|--------|----------------------------|--------------------|--------------------------------------------|
| GET    | `/tasks`                   | —                  | `Paginated<Task>` (see below)              |
| GET    | `/tasks/:id`               | —                  | `Task` or `404`                            |
| POST   | `/tasks`                   | `CreateTaskDto`    | `Task` (`201 Created`)                     |
| PATCH  | `/tasks/:id`               | `UpdateTaskDto`    | `Task` or `404`                            |
| PATCH  | `/tasks/:id/state`         | `{ newState }`     | `Task` (`400` if transition invalid)       |
| DELETE | `/tasks/:id`               | —                  | empty (`204 No Content`) or `404`          |

**Query params for `GET /tasks`**:
`page` (default 1), `perPage` (default 10, max 100), `state`, `priority`, `assigneeId`, `search` (title substring).

**Paginated response shape**:
```json
{ "items": [...], "total": 42, "page": 1, "perPage": 10, "totalPages": 5 }
```

### Users

| Method | Path                | Response |
|--------|---------------------|----------|
| GET    | `/users`            | `User[]` |
| GET    | `/users/:id`        | `User`   |

### Stats

| Method | Path        | Response      |
|--------|-------------|---------------|
| GET    | `/stats`    | `TasksStats`  |

### Generator *(Silver)*

| Method | Path                         | Response              |
|--------|------------------------------|-----------------------|
| POST   | `/tasks/generate/start`      | `{ running: true }`   |
| POST   | `/tasks/generate/stop`       | `{ running: false }`  |
| GET    | `/tasks/generate/status`     | `{ running: boolean }`|

When running, the generator creates 1–2 fake-but-valid tasks every 3 seconds through the normal `TasksService.create()` path — so they're validated, persisted, AND broadcast via WebSocket just like user-initiated tasks.

### WebSocket events *(Silver)*

Listen on the same host/port as the REST API (no separate namespace):

```ts
import { io } from 'socket.io-client'
const socket = io('http://localhost:3001')

socket.on('task:created',      (task)      => { /* new task */ })
socket.on('task:updated',      (task)      => { /* same shape */ })
socket.on('task:deleted',      ({ id })    => { /* removed id */ })
socket.on('generator:started', ()          => { /* toggle UI */ })
socket.on('generator:stopped', ()          => { /* toggle UI */ })
```

`TasksStats` shape:
```json
{
  "total": 9,
  "byState":    { "todo": 4, "in_progress": 2, "done": 2, "cancelled": 1 },
  "byPriority": { "high": 3, "medium": 4, "low": 2 },
  "byUser":     [{ "userId": "u1", "total": 5, "done": 1 }, ...],
  "overdue": 2,
  "completionRate": 22,
  "recentCount": 0
}
```

---

## Quick cURL

```bash
# List first page of tasks
curl http://localhost:3001/api/tasks

# Filter + search
curl 'http://localhost:3001/api/tasks?state=todo&priority=high&search=anniversary'

# Create
curl -X POST http://localhost:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy flowers","assigneeId":"u1","priority":"high"}'

# Start a task (todo → in_progress)
curl -X PATCH http://localhost:3001/api/tasks/<id>/state \
  -H 'Content-Type: application/json' \
  -d '{"newState":"in_progress"}'

# Stats
curl http://localhost:3001/api/stats
```

---

## Architecture

```
src/
├── main.ts              # bootstrap, CORS, global ValidationPipe
├── app.module.ts        # root module
├── common/
│   └── interfaces/paginated.interface.ts
├── tasks/
│   ├── tasks.controller.ts     # HTTP boundary — thin
│   ├── tasks.service.ts        # business logic, state machine
│   ├── tasks.repository.ts     # in-memory Map, seed data
│   ├── entities/task.entity.ts # Task + enums + VALID_TRANSITIONS
│   ├── dto/                    # class-validator DTOs
│   └── *.spec.ts               # unit tests
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts        # static, 2 users (owner + partner)
│   └── users.module.ts
└── stats/
    ├── stats.controller.ts
    ├── stats.service.ts        # aggregates over TasksRepository
    └── stats.module.ts
```

**Separation rationale (Bronze requirement: *separate the end points from the rest of the implementation*):**
- **Controller** — HTTP only: routes, status codes, DTO deserialisation. Zero branching beyond delegation.
- **Service** — business logic: validation that requires repository lookups, the state machine, cross-cutting rules.
- **Repository** — storage: a `Map<string, Task>`. Swapping this for a real DB later means changing one file.

---

## What's next

- **Silver (A2)** — offline-first frontend with sync, `/tasks/generate/start|stop` faker endpoints, WebSocket broadcasts.
- **Gold (A2)** — GraphQL surface over the same service layer, infinite-scroll on the frontend, Task → Comments 1-to-many.
