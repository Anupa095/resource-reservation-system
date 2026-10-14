# Resource Reservation Management System

A full-stack resource booking application built with Next.js, TypeScript, Prisma, and PostgreSQL. It helps teams manage shared rooms, equipment, and time-based reservations without scheduling conflicts.

## Features

- Resource directory with categories, capacity, location, and descriptions
- Reservation creation with validation for time overlap and invalid inputs
- Upcoming reservation dashboard and overview stats
- Prisma ORM with PostgreSQL persistence
- Seeded sample users and resources for local demos

## Tech Stack

- Next.js 16 App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create a PostgreSQL database locally.

3. Copy the example environment file and update the connection string for your local database:

```bash
copy .env.example .env
```

Then edit `.env` and set:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/resource_reservation_db?schema=public"
```

4. Run Prisma migrations and seed the database:

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

If your environment uses the Prisma config script automatically, you can also run:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

5. Start the app:

```bash
npm run dev
```

Open http://localhost:3000 to view the application.

## Useful Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # linting
```

## ER Diagram

```mermaid
erDiagram
    USER ||--o{ RESERVATION : makes
    RESOURCE ||--o{ RESERVATION : booked_for

    USER {
      string id PK
      string name
      string email UK
      enum role
      datetime createdAt
    }

    RESOURCE {
      string id PK
      string name
      string category
      int capacity
      string location
      string description
      datetime createdAt
    }

    RESERVATION {
      string id PK
      string userId FK
      string resourceId FK
      datetime startTime
      datetime endTime
      enum status
      datetime createdAt
    }
```

This relationship model supports one user creating many reservations, while each reservation references exactly one resource and one user.

## Notes

- Reservation creation validates that the end time is after the start time.
- Overlapping bookings for the same resource are rejected to prevent scheduling conflicts.
- The app is designed for a local development workflow and can be extended for authentication, admin controls, or reporting.
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173456" src="https://github.com/user-attachments/assets/68cd46c5-ee7a-48d6-ad02-93e2e4b96089" />
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173515" src="https://github.com/user-attachments/assets/8dcffed6-4122-4c6d-ab58-2c690dbb0786" />
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173313" src="https://github.com/user-attachments/assets/07178333-e12d-4e2d-be9e-15e70c17a610" />
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173326" src="https://github.com/user-attachments/assets/dd8b74bd-fc34-4586-a2d7-4d1f638b7b39" />
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173338" src="https://github.com/user-attachments/assets/f0c6dba6-dc4d-4e14-8200-a952844dca30" />
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173349" src="https://github.com/user-attachments/assets/d4b543d9-e083-4059-8a74-228d08c35c1b" />
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173400" src="https://github.com/user-attachments/assets/aa808c41-66bd-40bc-94a1-74041267680d" />
<img width="1920" height="1080" alt="Screenshot 2026-10-14 173409" src="https://github.com/user-attachments/assets/a95491c8-c468-41dd-8b4c-702bd0c12ef1" />
