# Northstar Support

Northstar is a production-oriented AI-assisted support helpdesk. Customers create and follow their own tickets; agents manage an assigned queue, public replies, private notes, SLA indicators, and optional AI assistance; admins manage users and support capacity.

## Stack and architecture

- `frontend/`: Next.js 15, React, TypeScript, Tailwind CSS, Lucide React.
- `backend/`: Express, TypeScript, Prisma, PostgreSQL, Zod, signed HTTP-only session cookies.
- Business rules live in the API: authorization, message visibility, status transitions, SLA calculation, and round-robin assignment.

## Run locally

Prerequisites: Node.js 20+, npm, and PostgreSQL. Copy `.env.example` to `backend/.env`, set `DATABASE_URL` and a long `SESSION_SECRET`, then run:

```bash
npm install
npm run db:generate
npm run db:migrate --workspace backend -- --name init
npm run db:seed
npm run dev
```

The API runs on `http://localhost:4000`; the web app runs on `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` only when the API is not on port 4000.

Demo credentials (development only; never use these in production):

- Customer: `customer@example.com` / `DemoPass123!`
- Agent: `agent@example.com` / `DemoPass123!`
- Admin: `admin@example.com` / `DemoPass123!`

## Design decisions

Tickets use PostgreSQL enums for role, status, priority, and category. The first-response SLA is elapsed time in UTC, configurable with `SLA_HOURS` and defaulting to four hours. An agent's first public response sets `firstResponseAt`; internal notes never do. The lifecycle transitions are `OPEN → IN_PROGRESS → WAITING_ON_CUSTOMER → RESOLVED → CLOSED`, with reopening from waiting/resolved back to in progress.

New tickets are assigned in a Prisma transaction using a persistent `RoundRobinState` row and the active agent list. If no active agents exist, the ticket remains unassigned. In production PostgreSQL, the transaction should be upgraded to an explicit row lock (`SELECT ... FOR UPDATE`) if very high concurrent creation volume is expected; the state row and transaction provide the durable rotation boundary.

Customers query only their own tickets and the API maps out internal messages. Message creation rejects customer-created internal notes. Agents can only access tickets assigned to them; admins can access all tickets. These checks are enforced server-side on every ticket/message route.

AI categorization and editable reply drafting use Gemini only when `GEMINI_API_KEY` is configured. Categorization is parsed through a strict Zod schema. Provider outages, missing keys, malformed responses, and timeouts return a visible 503 without breaking core ticket operations. AI never sends a message or changes protected fields.

## Verification commands

```bash
npm run typecheck
npm test
npm run build
```

The local database and Gemini provider are external prerequisites. No live demo is claimed until a deployment is actually configured and smoke-tested. With more time, add a dedicated integration-test database bootstrap, object-storage attachments with signed URLs, explicit PostgreSQL row locking for extreme concurrency, and richer pagination/filter controls.

AI coding tools were used to scaffold and review the implementation; no external AI service is required for the core workflow.
