# Domain Model Specification — Reversa

This document specifies the target domain model for **Reversa**, an urban parking management platform launching in **Bogotá, Colombia**.

## 1. Core Domain Principles

1. **UUID Primary Keys:** Every entity uses an internal `UUID` primary key. Natural identifiers such as `identityCard` (cédula) or `email` are `UNIQUE` attributes, never primary keys.
2. **English-Only Domain Language:** All table names, columns, enums, and statuses are in English.
3. **Bogotá-Ready Pricing:** Colombian parking lots commonly charge in **COP** (Colombian Pesos) **per minute** (regulated ceiling rates in Bogotá), **per hour**, **flat day**, or **monthly**, differentiated by vehicle type. Money is stored as integer COP (`Int`), never `Float`.
4. **Unified Accounts with RBAC:** Instead of duplicating auth tables (`User` vs `Employee` in `v0.1.0-legacy`), all human accounts live in a single `User` entity with explicit roles and optional parking assignments for operators.

---

## 2. Entities & Relationships

### 2.1 `User` (Phase 2)
Represents any authenticated actor in the system.

| Field | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary key |
| `firstName` | `String` | Required |
| `lastName` | `String` | Required |
| `email` | `String` | Required, unique, normalized lowercase |
| `identityCard` | `String?` | Optional (required for operators or verified drivers), unique when present |
| `phone` | `String?` | Optional contact number |
| `passwordHash` | `String` | Argon2 or bcrypt hash (never exposed in responses) |
| `role` | `UserRole` | `DRIVER` (default), `OPERATOR`, `ADMIN` |
| `isActive` | `Boolean` | Default `true` (soft disable) |
| `mustChangePassword` | `Boolean` | Default `false` (replaces legacy `passwordChanged`) |
| `refreshTokenHash` | `String?` | Hashed active refresh token (or dedicated `RefreshToken` table for multi-device sessions) |
| `createdAt` / `updatedAt` | `DateTime` | Managed timestamps |

**Enum `UserRole`:**
- `DRIVER` — Searches parkings, creates/cancels own reservations, views own history.
- `OPERATOR` — Assigned to one or more parking lots; checks vehicles in/out, manages live capacity and operational reservations.
- `ADMIN` — Full platform management (parking lots, operators, users, rates).

---

### 2.2 `Parking` (Phase 3)
Represents a physical parking facility (initially in Bogotá).

| Field | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary key |
| `name` | `String` | Required |
| `description` | `String?` | Optional facility details |
| `city` | `String` | Default `"Bogotá"` |
| `locality` | `String?` | Bogotá locality (e.g., `Chapinero`, `Usaquén`, `Teusaquillo`, `Suba`, `La Candelaria`) |
| `address` | `String` | Required street address |
| `latitude` | `Decimal(9,6)?` | Geolocation for map search |
| `longitude` | `Decimal(9,6)?` | Geolocation for map search |
| `isCovered` | `Boolean` | Required (covered vs open-air lot) |
| `is24Hours` | `Boolean` | Default `false` |
| `openingTime` | `String?` | `HH:mm` local time (`America/Bogota`), required when `is24Hours = false` |
| `closingTime` | `String?` | `HH:mm` local time (`America/Bogota`), required when `is24Hours = false` |
| `imageUrl` | `String?` | Stored via pluggable storage provider (local in dev, S3/R2 in prod) |
| `isActive` | `Boolean` | Default `true` |
| `createdAt` / `updatedAt` | `DateTime` | Managed timestamps |

**Related Join Table — `ParkingOperator`:**
Links `OPERATOR` users to the `Parking` lots they manage (`parkingId`, `userId`, unique composite constraint).

---

### 2.3 `ParkingCapacity` & `ParkingRate` (Phase 3)
Replaces the rigid single `slots` column and three `float` columns (`sedanHourlyRate`, `suvHourlyRate`, `motorcycleHourlyRate`) from `v0.1.0-legacy`.

**Enum `VehicleType`:** `CAR`, `SUV`, `MOTORCYCLE`, `BICYCLE`

**Enum `RateUnit`:** `PER_MINUTE`, `PER_HOUR`, `FLAT_DAY`, `MONTHLY`

**`ParkingCapacity`:**
- `id` (`UUID`, PK)
- `parkingId` (`UUID`, FK -> `Parking`)
- `vehicleType` (`VehicleType`)
- `totalSlots` (`Int`, >= 0)
- Unique constraint on `(parkingId, vehicleType)`

**`ParkingRate`:**
- `id` (`UUID`, PK)
- `parkingId` (`UUID`, FK -> `Parking`)
- `vehicleType` (`VehicleType`)
- `unit` (`RateUnit`)
- `amountCop` (`Int`, >= 0 — Colombian Pesos, no floats)
- `isActive` (`Boolean`, default `true`)
- Unique constraint on `(parkingId, vehicleType, unit)`

---

### 2.4 `Reservation` (Phase 4)
Tracks the full lifecycle of a parking booking from creation to checkout and billing.

| Field | Type | Constraints / Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary key |
| `code` | `String` | Short human-friendly reservation code (unique, e.g., `REV-8K2P9X`) |
| `userId` | `UUID` | FK -> `User` (`DRIVER`) |
| `parkingId` | `UUID` | FK -> `Parking` |
| `vehicleType` | `VehicleType` | Required |
| `licensePlate` | `String` | Normalized uppercase (e.g., `ABC123` for Colombian plates) |
| `status` | `ReservationStatus` | Default `PENDING` |
| `scheduledStart` | `DateTime` | Planned arrival time (UTC stored, Bogotá timezone aware) |
| `scheduledEnd` | `DateTime` | Planned departure time |
| `checkedInAt` | `DateTime?` | Actual arrival recorded by operator |
| `checkedOutAt` | `DateTime?` | Actual departure recorded by operator |
| `rateUnitSnapshot` | `RateUnit` | Frozen rate unit at booking time |
| `rateAmountCopSnapshot` | `Int` | Frozen COP rate at booking time |
| `totalAmountCop` | `Int?` | Computed final charge at checkout |
| `createdAt` / `updatedAt` | `DateTime` | Managed timestamps |

**Enum `ReservationStatus` & Allowed Transitions:**
```text
PENDING ──► CONFIRMED ──► CHECKED_IN ──► COMPLETED
   │            │
   ├──► CANCELLED ◄──┘
   └──► NO_SHOW (if expired past grace window without check-in)
```

**Anti-Overbooking Rule:**
- When creating or confirming a reservation for `(parkingId, vehicleType, [scheduledStart, scheduledEnd])`, count overlapping active reservations (`PENDING`, `CONFIRMED`, `CHECKED_IN`) inside a PostgreSQL transaction with row-level locking on the corresponding `ParkingCapacity` row.
- Reject with `409 Conflict` if `overlappingCount >= totalSlots`.

---

## 3. Mapping from `v0.1.0-legacy`

| Legacy (`v0.1.0-legacy`) | Target (`Reversa`) | Reason |
| :--- | :--- | :--- |
| `User` + `Employee` (separate tables, `identityCard` PK) | Unified `User` (UUID PK + `UserRole`) + `ParkingOperator` | Eliminates duplicate auth flows & protects PII |
| `Parking.slots` (single int) | `ParkingCapacity` per `VehicleType` | Real parking lots allocate separate car/moto/bike bays |
| `sedanHourlyRate` / `suvHourlyRate` / `motorcycleHourlyRate` (`FLOAT`) | `ParkingRate` (`amountCop: Int`, `RateUnit`, `VehicleType`) | Supports Bogotá minute/hour/flat tariffs without float rounding errors |
| `Reservations.status` (`Pendiente`, `Confirmada`, `Cancelada`) | `ReservationStatus` (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW`) | Full operational lifecycle in English |
| Hardcoded DB credentials + `sequelize.sync` | `@nestjs/config` validation + Prisma 7 migrations | Production-safe, reproducible environments |
