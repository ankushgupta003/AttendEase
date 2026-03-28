# Backend (PostgreSQL)

This folder runs the API server against PostgreSQL for LAN/shared mode.

## Setup
1. Install PostgreSQL and create a database (e.g. `attendease`).
2. Update `backend-postgres/.env`:
   - `DATABASE_URL=postgresql://user:pass@HOST:5432/attendease`
3. Install deps:
   - `npm install`
4. Generate and apply migrations:
   - `npx prisma migrate dev --name init`
5. Build standalone EXE:
   - `npm run build:exe`

Clients can then set the API Base URL to:
`http://<SERVER_IP>:5000/api`
