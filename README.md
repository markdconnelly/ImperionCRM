# Meridian

Internal, AI-enabled operations platform for an MSP. Operational intelligence
layer above Microsoft 365 and Kaseya. See `CLAUDE.md` for architecture and
principles, and `/docs` for the required documentation set.

## Stack
Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS · shadcn/ui.
PostgreSQL + pgvector (planned). Entra ID as sole IdP (planned). Provider-agnostic
AI model-routing layer (planned).

## Current state
Design-phase scaffold ported from the chat prototype: collapsible three-column
shell (nav sidebar → work area → orchestrator agent panel) and a Dashboard view
(KPI row, five-stage pipeline strip, "Accounts Needing Attention" table) on typed
**mock data**. The agent input is stubbed; collapse state is in-memory React.

## Develop
```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm run build
```

## Deploy
Confirm hosting before wiring deploy. Default: Azure Static Web Apps
(Microsoft-first posture). Alternative: Vercel (lower friction, outside the Azure
perimeter). Either consumes the standard `next build` output above.

Copy `.env.example` to `.env.local` and fill values as backends are wired. Never
commit secrets.
