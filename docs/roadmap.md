# Implementation Roadmap — Reversa API

Each phase is executed in one or more **short-lived Trunk-Based Development branches** from `main`, merged via **Squash & Merge** with Conventional Commits after CI passes.

---

## Phase 0 — Repository & Governance (Done)
- [x] Rename repository to `reversa-api`
- [x] Consolidate legacy 2023 `develop` branch into `main`
- [x] Tag historical baseline as `v0.1.0-legacy`
- [x] Delete `develop` branch to adopt Trunk-Based Development (`main` only)

## Phase 1 — NestJS + Prisma + CI Bootstrap (Done)
- [x] NestJS 11 + TypeScript (`strict`) scaffold with `pnpm`
- [x] Prisma 7 (`prisma.config.ts`, `@prisma/adapter-pg`) + PostgreSQL 16 (`docker-compose.yml`)
- [x] Global `/api/v1` prefix, `ValidationPipe`, typed env validation, Swagger UI (`/docs`)
- [x] `GET /health` endpoint + Jest unit tests
- [x] ESLint 9, Prettier, Commitlint, Husky, PR template, GitHub Actions CI
- [x] `AGENTS.md` and `docs/` engineering specifications

---

## Phase 2 — Users, RBAC & Authentication (Next)
**Suggested TBD branches:** `feat/users-schema`, `feat/auth-jwt-rbac`

### Scope
1. Add `User` and `UserRole` (`DRIVER`, `OPERATOR`, `ADMIN`) to `prisma/schema.prisma` and create the first Prisma migration.
2. Implement `UsersModule`:
   - `GET /api/v1/users/me` — authenticated user profile
   - `PATCH /api/v1/users/me` — update own profile
   - `GET /api/v1/users` (`ADMIN`) — paginated user list with role filter
   - `PATCH /api/v1/users/:id/role` (`ADMIN`) — assign role (`DRIVER`, `OPERATOR`, `ADMIN`)
   - `PATCH /api/v1/users/:id/status` (`ADMIN`) — activate/deactivate account
3. Implement `AuthModule`:
   - `POST /api/v1/auth/register` — register new `DRIVER` account
   - `POST /api/v1/auth/login` — issue JWT access token + refresh token
   - `POST /api/v1/auth/refresh` — rotate refresh token
   - `POST /api/v1/auth/logout` — revoke active refresh token
   - `PATCH /api/v1/auth/password` — change password
4. Implement reusable guards & decorators in `src/common/`:
   - `JwtAuthGuard`, `RolesGuard`, `@Roles(...)`, `@CurrentUser()`
   - Global Prisma exception filter (`P2002` -> `409`, `P2025` -> `404`)
5. Seed script (`prisma/seed.ts`) for local development (default admin + sample data).

### Acceptance Criteria
- All auth & RBAC endpoints documented in Swagger with `@ApiBearerAuth()`.
- Passwords hashed with `bcrypt` or `argon2`; hashes never returned in any DTO/response.
- Unit tests cover registration, login, token refresh, password change, and role authorization.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass cleanly.

---

## Phase 3 — Parking Lots & Bogotá Pricing
**Suggested TBD branches:** `feat/parkings-crud`, `feat/parkings-rates-capacity`

### Scope
1. Add `Parking`, `ParkingOperator`, `ParkingCapacity`, `ParkingRate`, `VehicleType`, and `RateUnit` models + migration.
2. Implement `ParkingsModule`:
   - `POST /api/v1/parkings` (`ADMIN`) — create parking lot with capacities & COP rates
   - `GET /api/v1/parkings` (Public) — paginated search with filters (`city`, `locality`, `isCovered`, `vehicleType`, `maxRateCop`, `nearLat`/`nearLng`/`radiusKm`)
   - `GET /api/v1/parkings/:id` (Public) — full details, capacities, active rates, live availability summary
   - `PATCH /api/v1/parkings/:id` (`ADMIN` or assigned `OPERATOR`) — update lot details, capacities, and rates
   - `POST /api/v1/parkings/:id/operators` / `DELETE /api/v1/parkings/:id/operators/:userId` (`ADMIN`) — assign/unassign operators
   - Storage abstraction (`StorageService`) for parking images (local adapter in dev, cloud-ready interface for S3/R2).

### Acceptance Criteria
- Rates strictly validated as non-negative integer COP amounts.
- Bogotá localities and `America/Bogota` operating hours handled cleanly.
- Unit tests verify search filtering, operator authorization, and capacity/rate validation.

---

## Phase 4 — Reservations, Concurrency & Billing
**Suggested TBD branches:** `feat/reservations-booking`, `feat/reservations-checkin-billing`

### Scope
1. Add `Reservation` and `ReservationStatus` to Prisma schema + migration.
2. Implement `ReservationsModule`:
   - `POST /api/v1/reservations` (`DRIVER`) — book a slot with atomic anti-overbooking lock & rate snapshot
   - `GET /api/v1/reservations/me` (`DRIVER`) — own reservation history (paginated)
   - `GET /api/v1/parkings/:parkingId/reservations` (`ADMIN` / assigned `OPERATOR`) — operational view
   - `PATCH /api/v1/reservations/:id/confirm` (`OPERATOR` / `ADMIN`)
   - `PATCH /api/v1/reservations/:id/check-in` (`OPERATOR` / `ADMIN`)
   - `PATCH /api/v1/reservations/:id/check-out` (`OPERATOR` / `ADMIN`) — calculates final `totalAmountCop`
   - `PATCH /api/v1/reservations/:id/cancel` (`DRIVER` owner / `OPERATOR` / `ADMIN`)
3. Decoupled notification interface (`NotificationService`) with console logger in dev and pluggable email adapter (e.g., Resend/SendGrid) for prod.

### Acceptance Criteria
- Invalid state transitions return `400 Bad Request` or `409 Conflict`.
- Concurrent bookings for the last available slot never overbook.
- Billing logic thoroughly unit-tested across `PER_MINUTE`, `PER_HOUR`, and `FLAT_DAY` cases.

---

## Phase 5 — Hardening, E2E Tests & `v1.0.0` Release
**Suggested TBD branches:** `feat/security-hardening`, `test/e2e-suite`, `build/production-docker`

### Scope
- Security middleware: `helmet`, rate limiting (`@nestjs/throttler`), structured logging (`nestjs-pino`).
- E2E test suite running against PostgreSQL in GitHub Actions CI.
- Multi-stage production `Dockerfile` + `.dockerignore`.
- Automated semantic releases / `CHANGELOG.md` and `v1.0.0` tag.
