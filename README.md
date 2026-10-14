# Personal AI OS

Personal AI OS is a local-first prototype for a single operator. It has a NestJS API, a Next.js UI, PostgreSQL persistence, connector integrations, and an experimental agent workflow.

## Current operating boundaries

- The API listens on `127.0.0.1` by default. Keep it local while the app still has process-wide connector state.
- One operator account is supported. Passwords are hashed; bearer sessions are random, stored by digest, and expire after 30 days.
- Approval records do not execute external actions. An approved item only records the user's decision.
- Routines run manually. Recurring schedules and durable routine history are not implemented.
- Connector status and job search coverage depend on each connector's actual configuration and source availability.

These boundaries are deliberate until connector credentials, career profiles, schedules, and all user data are isolated per account. Do not expose the API to a network or enable multi-user signup before that work is complete.

## Local setup

1. Copy `.env.example` to `.env` and set local database and provider credentials as needed.
2. Install dependencies with `npm install`.
3. Start the local data services: `docker compose -f infrastructure/docker/docker-compose.yml up -d`.
4. Generate the Prisma client and apply the current local schema:

   ```bash
   npm --prefix apps/api run prisma:generate
   npm --prefix apps/api run prisma:push
   ```

5. Start the app with `npm run dev`.
6. Open [http://localhost:3000](http://localhost:3000) and create the local operator account. Use a unique password of at least 12 characters.

The API is at [http://127.0.0.1:4000](http://127.0.0.1:4000), with Swagger at `/api/docs`. PostgreSQL and Redis ports bind to loopback by default. To access the app remotely later, first complete the multi-user and deployment security work; changing `HOST` or the database bind addresses alone is not sufficient.

## Workspace layout

```text
apps/api          NestJS API and Prisma schema
apps/web          Next.js application
apps/workers      Background worker prototypes
packages/shared   Shared types and domain enums
packages/agents   Agent interfaces and registry
packages/tools    Tool gateway
packages/permissions  Capability and approval policies
infrastructure/docker  Local PostgreSQL and Redis
```
