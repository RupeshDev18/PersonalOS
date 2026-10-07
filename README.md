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
│   └── web/             # Next.js 14 Playful UI (Sora, Manrope, Poppins, Ghost Mascot)
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

## Key Features

- **Chief Coordinator Agent with Ghost Mascot:** A friendly, unified front-door orchestrating tasks across specialist bots with animated pupil tracking.
- **Career Profile & Resume Vault:** Store multiple role-targeted markdown resumes, skills, and target job titles. Automatically recalculates real-time job fit scores.
- **Zero-Fabrication AI Resume Tailoring & Pitch:** Adapts resume bullet points and generates hiring manager outreach pitches tailored to live job listings (e.g., Stripe, Cloudflare, Figma) without ever hallucinating skills or experience.
- **Human-in-the-Loop Execution Pipeline:** High-stakes operations (such as submitting job applications) trigger an approval gate. Approving dispatches cryptographically sealed audit events.
- **Live Shopping Scout (DuckDuckGo + Gemini):** Aggregates real-time e-commerce pricing across Amazon India, Croma, and Reliance Digital, verifying cross-agent budget feasibility.
- **Resilient Gemini Engine:** Auto-discovers and falls back across available Google Generative AI models (`gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-flash-latest`).
- **Live Greenhouse Jobs Connector:** Streams verified open positions directly from active employer job boards.

---

## Getting Started

### 1. Configure Environment
Create a `.env` in the root directory:
```bash
GEMINI_API_KEY="your-google-ai-studio-api-key"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Servers
```bash
npm run dev
```
- **Web App:** [http://localhost:3000](http://localhost:3000)
- **API Backend:** [http://localhost:4000](http://localhost:4000) (Swagger at `/api/docs`)
