# Server Installer (Windows)

This creates a **Windows-only server installer** that:
- installs the backend API as a standalone EXE
- registers a Windows service
- lets you set the DB config

## What it assumes
- PostgreSQL is installed and reachable

## Build steps
1. Build the backend EXE:
   - `npm run build:server:backend`
2. Install NSIS (if not installed)
3. Run NSIS on:
   - `server-installer/installer.nsi`

## Startup Task (Default)
The installer registers a Windows **Scheduled Task** named `AttendEaseServer`
to start the backend on boot. This avoids Service Control errors (1053)
for apps that are not true Windows services.

## Configure DB
Edit the generated `config.env` after install:
```
DATABASE_URL=postgresql://user:pass@HOST:5432/attendease
PORT=5000
```

If you want a fully self-contained server installer (bundling PostgreSQL),
we can add that next.
