# Reversa API

Urban parking management backend starting in Bogotá, built with **NestJS**, **TypeScript**, **Prisma**, and **PostgreSQL**.

> The original 2023 Express/Sequelize prototype is preserved under tag [`v0.1.0-legacy`](https://github.com/ldlavado/reversa-api/releases/tag/v0.1.0-legacy).

## Tech Stack

- **Runtime & Framework:** Node.js (LTS), NestJS 11, TypeScript (`strict`)
- **Database & ORM:** PostgreSQL 16 (Docker Compose) + Prisma 7 (`@prisma/adapter-pg`)
- **API Docs:** OpenAPI / Swagger UI at `/docs`
- **Quality & Governance:** ESLint 9, Prettier, Jest, Commitlint, Husky, GitHub Actions CI

## Development Workflow

This repository follows **Trunk-Based Development (TBD)** and **Conventional Commits** (in English):

- `main` is the single permanent, always-releasable branch.
- Work happens in short-lived branches (`feat/...`, `fix/...`, `chore/...`, `refactor/...`) merged via Pull Request using **Squash & Merge**.
- All commit messages and PR titles must adhere to [Conventional Commits](https://www.conventionalcommits.org/).

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm
- Docker Desktop (for local PostgreSQL)

### Local Setup

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start PostgreSQL
docker compose up -d

# 3. Install dependencies
pnpm install

# 4. Generate Prisma client
pnpm prisma:generate

# 5. Start the API in watch mode
pnpm start:dev
```

Once running:
- **Health check:** `GET http://localhost:3000/health`
- **Swagger UI:** `http://localhost:3000/docs`
- **API Base Path:** `http://localhost:3000/api/v1`

## Available Scripts

| Script | Description |
| :--- | :--- |
| `pnpm start:dev` | Run NestJS in watch mode |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm typecheck` | Run TypeScript type checking without emitting files |
| `pnpm lint` | Run ESLint across source and config files |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run unit tests with Jest |
| `pnpm prisma:generate` | Generate Prisma Client into `src/generated/prisma` |
| `pnpm prisma:migrate:dev` | Create and apply local database migrations |

## Documentation & Specs

- [`AGENTS.md`](AGENTS.md) — Engineering rules, workflow conventions, and guidelines for AI coding agents
- [`docs/architecture.md`](docs/architecture.md) — Modular NestJS structure, Prisma 7 patterns, API conventions, and testing strategy
- [`docs/domain-model.md`](docs/domain-model.md) — Domain entities, Bogotá COP pricing model, RBAC roles, and reservation lifecycle
- [`docs/roadmap.md`](docs/roadmap.md) — Detailed phased implementation plan (Phases 0–5)

## Roadmap

- [x] **Phase 0:** Repository rename, legacy consolidation (`v0.1.0-legacy`), and TBD setup
- [x] **Phase 1:** NestJS + TypeScript + Prisma + Docker Compose + CI + Swagger bootstrap
- [ ] **Phase 2:** Users, RBAC roles, and JWT authentication (access + refresh tokens)
- [ ] **Phase 3:** Parking lots management (Bogotá geolocation, COP rates by minute/hour, vehicle types)
- [ ] **Phase 4:** Reservations lifecycle, anti-overbooking concurrency control, and billing
- [ ] **Phase 5:** E2E tests, hardening, Docker production build, and `v1.0.0` release
