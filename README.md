# Personal AI Operating System

A multi-agent personal operating system where you interact primarily with one **Chief Agent**, which understands your context and delegates tasks to specialized autonomous agents across Career, Finance, Research, Shopping, and Communication.

## Core Principles

1. **Chief-First Interaction:** You talk only to the Chief Agent; it coordinates specialists behind the scenes.
2. **Least-Privilege Capability Access:** Every agent is isolated with strictly scoped permissions.
3. **Immutable Audit Ledger:** Every task, tool execution, decision rationale, and data access is permanently logged.
4. **Human-in-the-Loop Control:** Autonomous for low-risk actions; strict approval gates for high-risk actions (applying to jobs, sending emails, making purchases).

---

## Monorepo Architecture

```text
PersonalOS/
├── apps/
│   ├── api/             # NestJS REST & WebSocket API backend
│   ├── web/             # Next.js 14 (App Router) + Tailwind + Glassmorphism UI
│   └── workers/         # BullMQ queue workers & schedule runners
├── packages/
│   ├── shared/          # Core domain models, enums & TypeScript interfaces
│   ├── permissions/     # Capability permission engine & approval rules
│   ├── tools/           # Tool Gateway & credential isolation engine
│   └── agents/          # Standard Agent runtime & registry
├── infrastructure/
│   └── docker/          # Docker Compose for PostgreSQL 16 (pgvector) & Redis 7
└── docs/                # Architecture diagrams and specifications
```

---

## Getting Started

### 1. Start Infrastructure (Docker)
Ensure Docker Desktop is running, then run:
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```
This launches:
- **PostgreSQL 16** with `pgvector` enabled on port `5432`
- **Redis 7** on port `6379`

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Shared Packages
```bash
npm run build --workspaces
```

### 4. Run Development Servers
- Backend API (NestJS): `npm run dev:api` (Runs on `http://localhost:4000`, docs at `/api/docs`)
- Frontend Web (Next.js): `npm run dev:web` (Runs on `http://localhost:3000`)
- Queue Workers: `npm run dev:workers`
