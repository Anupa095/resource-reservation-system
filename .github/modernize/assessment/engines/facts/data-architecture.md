# Data Architecture & Persistence Layer

The application stores its reservation data in PostgreSQL using Prisma ORM. Its three entities are `User`, `Resource`, and `Reservation`, with reservations linking users to resources.

## Database Configuration

| Service/Module | DB Type | Profile | Driver | Connection | Migration Tool |
|---|---|---|---|---|---|
| Resource Reservation System | PostgreSQL | Application default | Prisma PostgreSQL adapter with `pg` | Supplied through the `DATABASE_URL` environment variable | Prisma Migrate; initial migration is in `prisma/migrations/20261012200902_init/` |

The Prisma schema defines the database provider as PostgreSQL. The connection string is read from the environment; no separate profiles or connection-pool settings were found. The seed script in `prisma/seed.ts` inserts or updates sample users and resources.

## Data Ownership per Service

| Service | Tables Owned | ORM Framework | Caching | Notes |
|---|---|---|---|---|
| Resource Reservation System | `User`, `Resource`, `Reservation` | Prisma ORM | None detected | One application module accesses all three tables in the same PostgreSQL database. |

## Entity Model

`User` stores a unique email and a role (`USER` or `ADMIN`). `Resource` stores a resource's name, category, and creation time, as well as optional capacity, location, and description. `Reservation` stores its time interval, status (`PENDING`, `CONFIRMED`, or `CANCELLED`), and foreign keys to its user and resource. Each entity has a string UUID primary key.

The foreign keys from `Reservation` to `User` and `Resource` use cascading deletes. A user's email has a unique database index. The application accesses the database through Prisma Client; no separate repository interfaces or model classes were found.

<!-- mermaid-checked: every attribute is `<type> <name> [<key>] ["<description>"]` with at most one of PK/FK/UK, no \n in descriptions, no {} in descriptions, every relationship label is double-quoted -->
~~~mermaid
erDiagram
    USER ||--o{ RESERVATION : "places"
    RESOURCE ||--o{ RESERVATION : "is booked in"

    USER {
        string id PK "UUID"
        string name
        string email UK "unique"
        string role "USER or ADMIN"
        datetime createdAt
    }

    RESOURCE {
        string id PK "UUID"
        string name
        string category
        int capacity "optional"
        string location "optional"
        string description "optional"
        datetime createdAt
    }

    RESERVATION {
        string id PK "UUID"
        string userId FK
        string resourceId FK
        datetime startTime
        datetime endTime
        string status "PENDING CONFIRMED or CANCELLED"
        datetime createdAt
    }
~~~

**Relationship interpretation**

- One user can have zero or many reservations; each reservation belongs to exactly one user.
- One resource can have zero or many reservations; each reservation refers to exactly one resource.
- Deleting a user or resource cascades to its related reservations.
- `role` and `status` are enum-valued columns, not separate tables.

## Key Repository Methods

There are no dedicated repository interfaces. The application uses Prisma Client queries directly from its API modules.

| Service | Repository | Notable Methods | Purpose |
|---|---|---|---|
| Resource Reservation System | Prisma Client (`src/lib/prisma.ts`) | `reservation.findMany` | Lists reservations with related resource and user data. |
| Resource Reservation System | Prisma Client (`src/lib/prisma.ts`) | `reservation.findFirst` | Checks for an existing reservation that overlaps the requested time for a resource. |
| Resource Reservation System | Prisma Client (`src/lib/prisma.ts`) | `user.upsert` | Finds a user by unique email or creates the user when needed. |
| Resource Reservation System | Prisma Client (`src/lib/prisma.ts`) | `resource.findMany`, `resource.create`, `user.findMany` | Reads resource and user records and creates resources. |

## Caching Strategy

No caching provider, cache configuration, or cache annotations were found. Database reads and writes are performed through Prisma Client. Reservation creation uses a Prisma transaction with serializable isolation; this is transaction handling, not a caching layer.

## Data Ownership Boundaries

The application uses one shared PostgreSQL database owned by the Resource Reservation System. All three tables are accessed through the same Prisma Client; no separate services, schemas, or database-per-service boundaries were found. Reservation queries can include related user and resource records through Prisma relations. No separate read model or CQRS setup was found.

### Data Classification & Sensitivity

| Entity | Sensitive Fields | Classification (PII/PHI/PCI/None) | Controls in Place |
|---|---|---|---|
| User | `name`, `email` | PII | No field-level encryption, data masking, or field-level access controls were identified in the schema or inspected database code. |
| Resource | None identified | None | No data-specific controls identified. |
| Reservation | `userId`, reservation time interval | PII-linked data | The reservation is linked to a user by foreign key. No field-level encryption or masking was identified. |
