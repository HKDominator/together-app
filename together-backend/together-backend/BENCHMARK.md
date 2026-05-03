# Backend Technology Stack Benchmark

**Context:** I need a REST backend for *Together* that will also host WebSockets (Silver challenge) and expose a GraphQL surface (Gold challenge). The frontend is already Next.js + TypeScript. Assignment 2 requires server-side validation, clean separation of concerns, testability, and server-side pagination — no persistence.

This document compares five free, open-source options and justifies **NestJS + TypeScript** as the choice.

---

## 1. Candidates

| Framework       | Language   | Paradigm                          | First release |
|-----------------|------------|-----------------------------------|---------------|
| **NestJS**      | TypeScript | Opinionated, DI, decorator-driven | 2017          |
| **Express**     | JavaScript | Minimalist, middleware chain      | 2010          |
| **FastAPI**     | Python     | Type-hint driven, async by default | 2018         |
| **ASP.NET Core**| C#         | Opinionated, DI, attribute-based  | 2016          |
| **Spring Boot** | Java       | Opinionated, DI, annotation-based | 2014          |

---

## 2. Evaluation criteria

Each criterion is scored **0–10** and given a **weight** reflecting importance to *this* project. The weight is not "which framework is best in the abstract" — it's "what does the assignment and the existing codebase demand".

| Criterion                             | Weight | Why it matters here                                                          |
|---------------------------------------|--------|------------------------------------------------------------------------------|
| Language alignment with the frontend  | 3×     | TS on both sides → shared DTOs, one toolchain, less cognitive overhead.      |
| Built-in validation & DTO layer       | 3×     | Bronze demands "server-side data validation". Framework-native is best.     |
| GraphQL maturity                      | 3×     | Gold challenge is GraphQL. Need a first-class path, not a bolt-on.           |
| Dependency injection & modularity     | 2×     | Bronze demands clean separation of endpoints from business logic.            |
| WebSocket support                     | 2×     | Silver challenge uses WebSockets to push faker-generated updates.            |
| Testing story (mocks + DI + runner)   | 2×     | Bronze demands maximum coverage. Unit-testable DI-driven design wins.        |
| Raw performance (req/sec)             | 1×     | Nice-to-have. Bronze data fits in RAM, so this is minor.                     |
| Learning curve                        | 1×     | I already know TypeScript; penalises frameworks requiring a new language.    |
| Community size & docs quality         | 1×     | Ecosystem health matters for unblocking.                                     |

---

## 3. Scoring table

| Criterion                     | Wt | NestJS | Express | FastAPI | ASP.NET Core | Spring Boot |
|-------------------------------|----|--------|---------|---------|--------------|-------------|
| Language alignment with FE    | 3× | **10** | 10      | 2       | 2            | 1           |
| Built-in validation           | 3× | **10** | 2       | 10      | 9            | 9           |
| GraphQL maturity              | 3× | **10** | 6       | 7       | 8            | 8           |
| DI & modularity               | 2× | **10** | 2       | 6       | 10           | 10          |
| WebSocket support             | 2× | **10** | 7       | 8       | 10           | 8           |
| Testing story                 | 2× | 9      | 6       | 9       | 10           | 9           |
| Performance                   | 1× | 7      | 9       | 9       | **10**       | 7           |
| Learning curve (for me)       | 1× | 6      | 10      | 8       | 6            | 4           |
| Community & docs              | 1× | 9      | **10**  | 9       | 9            | 10          |
| **Weighted total (max 180)**  |    | **163**| 100     | 125     | 139          | 121         |

---

## 4. How the scores break down

### NestJS (163)
- **Language alignment (10).** Same TypeScript as the frontend. I can share Task types verbatim via a pnpm workspace later.
- **Validation (10).** `class-validator` + `class-transformer` + `ValidationPipe` = declarative DTO validation with one decorator per field. See `dto/create-task.dto.ts`.
- **GraphQL (10).** `@nestjs/graphql` is first-class — the same service layer I write for REST surfaces cleanly through a resolver with a single decorator, no rewrite. Critical for Gold.
- **DI (10).** Provider/module system is idiomatic and enforces the separation the Bronze rubric asks for.
- **WebSockets (10).** `@nestjs/websockets` + `@WebSocketGateway()` is zero-friction for Silver.
- **Testing (9).** `@nestjs/testing` lets me swap any provider with a mock in one line. Jest is default. Only ding: slightly heavier boot than FastAPI/Express in CI.
- **Performance (7).** Adequate. Not Fastify-tier. Domain is tiny, irrelevant here.
- **Learning curve (6).** Decorators + Angular-ish module system — takes a day to click.

### Express (100)
- Language: 10 — same ecosystem.
- Validation: 2 — nothing built in. I'd pick `joi` or `zod`, wire middleware myself, write the error formatter. Bronze explicitly asks for "best practices suggested by the community" and the *Express* community answer is "it depends" — a red flag for a graded assignment.
- DI: 2 — none. I'd hand-roll container plumbing.
- GraphQL: 6 — `express-graphql` works but doesn't share my REST layer. I'd duplicate code for Gold.
- Conclusion: fine for a 50-line prototype, wrong tool for a multi-tier assignment.

### FastAPI (125)
- Validation: 10 — Pydantic is excellent, arguably the single best DTO layer of any framework in this list.
- Performance: 9 — async Starlette underneath.
- DI: 6 — FastAPI's `Depends()` is clever but it's a function-level hook, not a full module system. For a multi-feature app the wiring gets flat.
- GraphQL: 7 — Strawberry / Ariadne are good, but not as coupled to the HTTP framework as `@nestjs/graphql` is.
- Dealbreaker: **language mismatch.** Introducing Python means two toolchains, two `node_modules`/`venv` setups, and no shared Task type between client and server. In a tiny project this is real overhead.

### ASP.NET Core (139)
- Performance: 10 — fastest in the TechEmpower benchmarks of the five.
- DI: 10 — textbook.
- WebSockets, GraphQL (Hot Chocolate), testing: all excellent.
- **Dealbreaker: C#/.NET for a student project with a TS frontend.** I'd lose the ability to share DTOs and my DX would halve. The course has a 3-week window per tier; this is not the tier to introduce a second language.

### Spring Boot (121)
- Mature, enterprise-grade, superb testing. Same reasons as ASP.NET kill it here — Java ecosystem mismatch, plus Spring Boot has the heaviest boot/runtime footprint of the five. Overkill.

---

## 5. The decision, stated plainly

**I chose NestJS because it wins on every criterion the assignment explicitly grades me on, and it only loses on "performance" and "raw simplicity" — neither of which are graded.**

Specifically:
1. The Bronze rubric says *"separate the end points from the rest of the implementation"*. NestJS's controller/service/module split is exactly that shape by convention — I get graded criteria for free.
2. The Bronze rubric says *"server-side data validation"*. NestJS + `class-validator` is arguably the shortest path to declarative, typed validation in any framework on this list.
3. The Silver challenge requires WebSockets. `@nestjs/websockets` is one decorator away.
4. The Gold challenge requires GraphQL. `@nestjs/graphql` lets me reuse the same `TasksService` — the one I've already tested — under a resolver. Zero duplication.
5. My frontend is TypeScript. Sharing types with the backend via a workspace package is trivial; a Python/C#/Java backend would force me to duplicate the `Task` shape.

The combined weight of criteria where NestJS scores 10/10 is **3+3+3+2+2 = 13**, out of a total possible weight of 18. That's the mathematical expression of "it fits this specific assignment".

---

## 6. What I would have picked otherwise

- **Raw request throughput is the goal** → Fastify (Node) or ASP.NET Core.
- **Team already writes Python** → FastAPI.
- **Team already writes Java** → Spring Boot.
- **Absolute minimum deps, 1-file app** → Express.

None of those match my constraints.
