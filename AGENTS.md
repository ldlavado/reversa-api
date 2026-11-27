# AGENTS.md — Reversa API

This file defines the mandatory rules, conventions, and context for AI agents and engineers working on **Reversa API**.

## 1. Project Overview

- **Product:** **Reversa** — an urban parking management platform starting in **Bogotá, Colombia**, designed to scale to other cities.
- **Repository:** `reversa-api` (backend REST API). A companion web client will be built separately against `/api/v1`.
- **Legacy Baseline:** The original 2023 Express/Sequelize prototype (`par-kud_server`) is preserved in Git history under tag `v0.1.0-legacy`. We are **not** maintaining backward compatibility with legacy 2023 routes or schemas.

## 2. Read Before Implementing

Before designing or coding any new phase or feature, read the relevant specification in `docs/`:

- [`docs/architecture.md`](docs/architecture.md) — NestJS module structure, Prisma 7 setup, API conventions, error handling, testing strategy.
- [`docs/domain-model.md`](docs/domain-model.md) — Core domain entities, Bogotá COP pricing model, vehicle types, RBAC roles, reservation state machine, concurrency rules.
- [`docs/roadmap.md`](docs/roadmap.md) — Phased implementation plan, target endpoints, and acceptance criteria for Phases 2–5.

Keep `docs/` updated whenever architectural decisions, schemas, or phase statuses change.

## 3. Language & Git Workflow (Strict)

- **100% English in the repository:** All code, identifiers, database tables/columns/enums, DTOs, Swagger docs, comments, commit messages, PR titles/descriptions, issues, and documentation must be written in English.
- **Trunk-Based Development (TBD):**
  - `main` is the single permanent branch and must always stay green and releasable. Never create long-lived `develop` or release branches.
  - Create short-lived branches directly from `main` (e.g., `feat/auth-jwt`, `fix/overbooking-lock`, `docs/domain-spec`, `chore/update-ci`).
  - Keep PRs small, focused, and merge via **Squash & Merge** into `main`, then delete the branch.
- **Conventional Commits (enforced by Commitlint + Husky + CI):**
  - Format: `<type>(<optional-scope>): <imperative lowercase summary>`
  - Allowed types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`, `build`.
  - Never bypass git hooks (`--no-verify`).

## 4. Tech Stack & Engineering Rules

- **Runtime & Package Manager:** Node.js >= 22, **pnpm** (`pnpm-lock.yaml` is the single lockfile; never commit `package-lock.json` or `yarn.lock`).
- **Framework:** NestJS 11 + TypeScript with `"strict": true`. Avoid `any`; prefer explicit types and Prisma generated types.
- **Database & ORM:** PostgreSQL 16 + **Prisma 7** configured via `prisma.config.ts` and `@prisma/adapter-pg`.
  - Generated Prisma client lives in `src/generated/prisma` (gitignored).
  - Use **UUID v4** (`@id @default(uuid())`) for all entity primary keys — never use PII (like national ID / `identityCard`) as a primary key.
  - Always evolve the database with versioned Prisma migrations (`pnpm prisma:migrate:dev`); never rely on ad-hoc schema sync.
- **Money & Rates (Bogotá / COP):**
  - Never use `Float` for monetary values. Store COP amounts as **`Int`** (whole COP pesos, or minor units if multi-currency is added later) or **`Decimal`**.
  - Support flexible pricing units (`PER_MINUTE`, `PER_HOUR`, `FLAT_DAY`, `MONTHLY`) per vehicle type (`CAR`, `SUV`, `MOTORCYCLE`, `BICYCLE`).
- **Security & Validation:**
  - Every request payload/query/param must be validated via NestJS DTOs (`class-validator` + `class-transformer`) with global `whitelist: true` and `forbidNonWhitelisted: true`.
  - Never hardcode credentials or secrets; validate all required environment variables in `src/config/env.validation.ts` and document them in `.env.example`.
  - Never return password hashes or sensitive tokens in API responses.
- **Concurrency:** Reservation creation and check-in must guard against overbooking using PostgreSQL transactions and row-level locking where appropriate.

## 5. Verification Checklist

Before committing or opening a PR, all checks must pass locally:

```bash
pnpm prisma:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

*(On Windows PowerShell if script execution policy blocks `pnpm.ps1`, run `pnpm.cmd` instead.)*
