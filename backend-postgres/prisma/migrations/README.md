This folder is intentionally empty.

The migrations under `backend/prisma/migrations` are SQLite-specific and should not be used for PostgreSQL.

To generate Postgres migrations on the server machine, run:

  npm install
  npx prisma migrate dev --name init
