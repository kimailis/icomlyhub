# Icomly Next.js App

This is the consolidated Next.js application replacing the old React frontend and Express backend.

## Structure

- `app/`: Next.js App Router pages and layouts.
  - `api/`: API Routes (formerly Express backend).
  - `components/`: UI Components.
- `lib/`: Shared utilities, database client, and services.
- `prisma/`: Database schema.

## Development

Run `npm run dev` to start the development server.
Ensure PostgreSQL and Redis are running (via Docker).
