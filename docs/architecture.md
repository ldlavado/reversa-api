# Architecture Specification — Reversa API

## 1. Architectural Style

Reversa API is a **modular monolith** built with **NestJS 11** and **TypeScript (`strict`)**. Each business capability lives in its own NestJS module under `src/modules/` with clear boundaries so modules remain cohesive, testable, and easy to evolve.

## 2. Directory Layout

```text
reversa-api/
├── .github/                  # CI workflows & PR template
├── .husky/                   # Git hooks (commitlint)
├── docs/                     # Architecture, domain, and roadmap specs
├── prisma/
│   ├── schema.prisma         # PostgreSQL data model (Prisma 7)
│   └── migrations/           # Versioned SQL migrations
├── src/
│   ├── common/               # Cross-cutting guards, decorators, filters, interceptors, DTOs
│   ├── config/               # Typed environment validation (env.validation.ts)
│   ├── database/             # Global PrismaModule & PrismaService (@prisma/adapter-pg)
│   ├── generated/prisma/     # Generated Prisma 7 client (gitignored)
│   ├── modules/              # Feature modules
│   │   ├── health/           # GET /health (liveness + DB readiness)
│   │   ├── auth/             # Phase 2: JWT access/refresh tokens, login/register
│   │   ├── users/            # Phase 2: User profiles, RBAC roles, operator assignments
│   │   ├── parkings/         # Phase 3: Parking lots, capacities, COP rates, media
│   │   └── reservations/     # Phase 4: Booking lifecycle, check-in/out, billing
│   ├── app.module.ts
│   └── main.ts
├── docker-compose.yml        # Local PostgreSQL 16 service
├── prisma.config.ts          # Prisma 7 CLI & datasource config
└── AGENTS.md                 # Rules & guidance for AI coding agents
```

## 3. Module Design Conventions

Inside each feature module (`src/modules/<feature>/`):

- `<feature>.module.ts` — NestJS module registration and exports.
- `<feature>.controller.ts` — Thin HTTP layer: routing, Swagger decorators, guards, DTO validation, response mapping. No business logic or raw Prisma queries.
- `<feature>.service.ts` — Business rules, transactions, domain validations, Prisma orchestration.
- `dto/` — Input DTOs (`create-*.dto.ts`, `update-*.dto.ts`, `query-*.dto.ts`) validated with `class-validator` and documented with `@ApiProperty` / `@ApiPropertyOptional`.
- `*.spec.ts` — Co-located unit tests for controllers and services.

## 4. Prisma 7 + PostgreSQL Conventions

- **Adapter:** `PrismaService` instantiates `PrismaClient` using `@prisma/adapter-pg` (`PrismaPg`) with `DATABASE_URL` from `ConfigService`.
- **Generated Client:** Output is `src/generated/prisma` (`moduleFormat = "cjs"` for NestJS CommonJS compatibility). Always import generated types from `src/generated/prisma/client` (never `@prisma/client` runtime paths that assume Prisma 5/6).
- **Naming in Prisma:**
  - Models use `PascalCase` singular (`User`, `Parking`, `ParkingRate`, `Reservation`).
  - Fields use `camelCase` in Prisma and map to `snake_case` in PostgreSQL via `@map(...)` and `@@map("plural_table_name")`.
  - Every model includes `id String @id @default(uuid()) @db.Uuid`, `createdAt DateTime @default(now())`, and `updatedAt DateTime @updatedAt`.
- **Error Handling:** Map Prisma known errors (e.g., `P2002` unique constraint -> `409 Conflict`, `P2025` record not found -> `404 Not Found`) cleanly via a global exception filter or explicit service checks.

## 5. REST API Conventions

- **Versioning & Prefix:** Global prefix `/api/v1` (except `GET /health` and Swagger UI at `/docs`).
- **Resource Naming:** Plural kebab-case nouns (`/api/v1/parkings`, `/api/v1/reservations`, `/api/v1/users`).
- **Validation:** Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- **Pagination:** List endpoints accept `page` (default `1`) and `limit` (default `20`, max `100`) and return:
  ```json
  {
    "data": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
  ```
- **Error Responses:** Standard NestJS JSON format (`statusCode`, `message`, `error`), with descriptive messages and no stack traces in production.
- **OpenAPI / Swagger:** Every endpoint must include `@ApiTags`, `@ApiOperation`, response decorators, and `@ApiBearerAuth()` when protected.

## 6. Configuration & Environment

- All configuration is loaded via `@nestjs/config` (`ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`).
- Required variables must be declared in `src/config/env.validation.ts` and documented in `.env.example`.
- The application must **fail fast on startup** if required environment variables are missing or invalid.

## 7. Testing Strategy

- **Unit Tests (`*.spec.ts`):** Mock `PrismaService` and external providers; verify business logic, edge cases, state transitions, and authorization rules.
- **E2E Tests (`test/*.e2e-spec.ts`, Phase 5):** Run against a real PostgreSQL instance (Docker Compose / CI service container) covering auth flows, parking CRUD, and concurrent reservation overbooking checks.
- **CI Pipeline (`.github/workflows/ci.yml`):** Runs on every PR and push to `main`: Semantic PR title validation, `prisma generate`, `lint`, `typecheck`, `test`, and `build`.
