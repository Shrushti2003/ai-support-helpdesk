
# Northstar Support

Northstar is a production-oriented AI-assisted support helpdesk. Customers create and follow their own tickets; agents manage an assigned queue, public replies, private notes, SLA indicators, and optional AI assistance; admins manage users and support capacity.

## Features

- Customer authentication and ticket creation.
- Customer-specific ticket access and conversation history.
- Automatic round-robin ticket assignment.
- Agent dashboard for assigned tickets.
- Public replies and private internal notes.
- First-response SLA tracking with a default four-hour deadline.
- AI-assisted ticket categorization.
- Editable AI-generated reply drafts.
- Graceful handling of missing AI credentials and provider failures.
- Server-side authorization and request validation.
- PostgreSQL persistence through Prisma.

## Stack and Architecture

- `frontend/`: Next.js 15, React, TypeScript, Tailwind CSS, Lucide React.
- `backend/`: Express, TypeScript, Prisma, PostgreSQL, Zod, signed HTTP-only session cookies.
- AI integration: Google Gemini API.
- Business rules live in the API: authorization, message visibility, status transitions, SLA calculation, and round-robin assignment.

The frontend communicates with the backend API, which validates requests, enforces permissions, and interacts with PostgreSQL through Prisma. AI assistance is optional and is not required for core ticket operations.

## Project Structure

```text
northstar-support/
├── frontend/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
├── .env.example
├── package.json
├── package-lock.json
└── README.md
```

This is a high-level overview. Refer to the repository for the exact file and directory structure.

## Run Locally

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL

Copy `.env.example` to `backend/.env`, set `DATABASE_URL` and a long `SESSION_SECRET`, and configure any other environment variables required by the application.

Create a PostgreSQL database named `helpdesk`, then run the following commands from the repository root:

```bash
npm install
npm run db:generate
npm run db:migrate --workspace backend -- --name init
npm run db:seed
npm run dev
```

If the initial migration has already been created and applied, follow the existing migration history rather than creating a duplicate initial migration.

The API runs on `http://localhost:4000`; the web app runs on `http://localhost:3000`.

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` only when the API is not on port 4000. Use the exact environment variable names expected by the code.

### Environment Variables

Example configuration:

```dotenv
DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/helpdesk?schema=public"
SESSION_SECRET="replace-with-a-long-random-secret"
SLA_HOURS=4
GEMINI_API_KEY=""
```

Configure other variables required by your application, including the backend port and frontend/CORS origins if applicable.

Never commit real `.env` files, database credentials, session secrets, or API keys. Keep `.env.example` limited to placeholder values.

## Demo Credentials

Development-only accounts created by the seed script:

| Role | Email | Password |
|---|---|---|
| Customer | `customer@example.com` | `DemoPass123!` |
| Agent | `agent@example.com` | `DemoPass123!` |
| Second Agent | `agent2@example.com` | `DemoPass123!` |
| Admin | `admin@example.com` | `DemoPass123!` |

These credentials are for local demonstration only. Never use them in production.

## Application Workflow

### Customer

1. Logs in to the application.
2. Creates a support ticket.
3. Views personal tickets and their status.
4. Reads public conversation messages.
5. Replies to tickets and follows their progress.

### Agent

1. Logs in and opens the assigned-ticket queue.
2. Reviews ticket details and conversation history.
3. Uses AI assistance to draft a response when available.
4. Edits and sends a public reply.
5. Adds private internal notes for support-team collaboration.
6. Updates ticket status as permitted.

### Administrator

The administrator role supports user and support-capacity management according to the routes and interface implemented in the application.

## Database Design

The main entities include:

- `User`: User identity, role, and authentication-related information.
- `Ticket`: Ticket subject, description, category, priority, status, customer, assigned agent, and SLA timestamps.
- `TicketMessage`: Ticket conversation messages and their visibility.
- `RoundRobinState`: Persistent state used to rotate ticket assignments.

See `backend/prisma/schema.prisma` for the authoritative database schema and relationships.

## Design Decisions

### Ticket Status and Categories

Tickets use PostgreSQL enums for role, status, priority, and category.

The lifecycle transitions are:

`OPEN → IN_PROGRESS → WAITING_ON_CUSTOMER → RESOLVED → CLOSED`

Tickets can be reopened from waiting or resolved states back to in progress, according to the implemented transition rules.

### First-Response SLA

The first-response SLA is elapsed time in UTC, configurable with `SLA_HOURS` and defaulting to four hours.

An agent's first public response sets `firstResponseAt`; internal notes never do. The backend is responsible for calculating deadlines and determining whether the first-response SLA has been missed.

### Round-Robin Assignment

New tickets are assigned in a Prisma transaction using a persistent `RoundRobinState` row and the active agent list.

If no active agents exist, the ticket remains unassigned.

In production PostgreSQL, the transaction should be upgraded to an explicit row lock (`SELECT ... FOR UPDATE`) if very high concurrent creation volume is expected. The state row and transaction provide the durable rotation boundary, but stronger locking may be necessary for extreme concurrency.

### Authorization and Message Visibility

Customers query only their own tickets, and the API maps out internal messages. Message creation rejects customer-created internal notes.

Agents can only access tickets assigned to them; admins can access all tickets. These checks are enforced server-side on every ticket/message route.

Frontend restrictions alone are not considered sufficient for protecting ticket data or private messages.

### AI Integration

AI categorization and editable reply drafting use Gemini only when `GEMINI_API_KEY` is configured.

Categorization is parsed through a strict Zod schema. Provider outages, missing keys, malformed responses, and timeouts return a visible `503` without breaking core ticket operations.

AI never sends a message or changes protected fields. Agents remain responsible for reviewing and sending replies.

## Security

Security-related implementation includes:

- Signed HTTP-only session cookies.
- Server-side role and ticket-access checks.
- Request validation using Zod.
- Customer-specific ticket access.
- Server-controlled message visibility.
- Environment-based configuration for secrets and service credentials.

For production deployment, review HTTPS and secure-cookie configuration, rate limiting, CORS settings, dependency updates, and any file-upload security requirements.

## Verification Commands

Run the project's available checks from the repository root:

```bash
npm run typecheck
npm test
npm run build
```

The local database and Gemini provider are external prerequisites. Gemini is optional for core ticket operations, but AI features require a configured API key.

Important backend tests should cover:

- Ticket validation.
- Round-robin assignment.
- Customer ticket ownership and authorization.
- Internal-note privacy.
- First-response SLA calculations.
- Ticket status transitions.
- AI provider failures and fallback behavior.

The assignment requires at least five automated tests covering important backend logic. Run the actual test suite and confirm the results before submission.

## Feature Verification Checklist

Update this checklist according to the final implementation and test results.

- [x] Customer login and ticket creation tested locally.
- [x] Agent queue and ticket replies tested locally.
- [x] Round-robin assignment observed during local testing.
- [ ] Internal-note privacy verified through backend/API tests.
- [ ] SLA deadline and overdue indicator verified.
- [ ] AI categorization and editable reply drafts verified.
- [ ] AI failure and fallback behavior verified.
- [ ] Attachment upload and access controls verified, if implemented.
- [ ] Mobile responsiveness verified.
- [ ] At least five backend logic tests confirmed passing.
- [ ] Production deployment smoke-tested, if a live demo is provided.

## Screenshots

Add screenshots of the actual application to a `screenshots/` directory and update the paths below.

### Customer Dashboard

![Customer Dashboard](screenshots/customer-dashboard.png)

### Ticket Details

![Ticket Details](screenshots/ticket-details.png)

### Agent Dashboard

![Agent Dashboard](screenshots/agent-dashboard.png)

### AI-Assisted Reply

![AI-Assisted Reply](screenshots/ai-reply-draft.png)

Add the corresponding screenshot files before committing this section. Remove any screenshot references that do not correspond to real files.

## Limitations and Future Improvements

With more time, the following improvements could be added:

- A dedicated integration-test database bootstrap.
- Object-storage attachments with signed URLs.
- Explicit PostgreSQL row locking for extreme concurrent assignment.
- Richer pagination and filtering controls.
- More comprehensive integration and security tests.
- Production deployment monitoring and operational logging.

These are potential improvements; adjust the list to reflect the actual capabilities of the current implementation.

## AI Tools Used

AI coding tools were used to scaffold and review the implementation.

No external AI service is required for the core workflow. Gemini is optional and is used for AI categorization and reply drafting when `GEMINI_API_KEY` is configured.

Review all AI-assisted code and ensure you can explain the architecture, authorization rules, round-robin algorithm, SLA behavior, and test coverage during the project walkthrough.

## Deployment

No live demo is claimed until a deployment has actually been configured and smoke-tested.

**Live Demo:** Not available.

If you deploy the application, replace this section with the actual public demo URL.

## Submission Checklist

- [ ] Verify all required assignment features.
- [ ] Run type checking, automated tests, and production build.
- [ ] Confirm at least five backend logic tests pass.
- [ ] Verify internal-note privacy and server-side authorization.
- [ ] Test SLA behavior and AI fallback.
- [ ] Ensure `.env` files and secrets are excluded from Git.
- [ ] Add real application screenshots.
- [ ] Review the README for accuracy.
- [ ] Confirm the GitHub repository is public.
- [ ] Maintain meaningful commits as development progresses.
- [ ] Record a 3–5 minute walkthrough video with voice narration.
- [ ] Demonstrate the application and explain important code.
- [ ] Explain one difficult problem and how it was solved.
- [ ] Upload the video to Google Drive.
- [ ] Set sharing to **Anyone with the link — Viewer**.
- [ ] Include the GitHub repository URL and video URL in the final submission.
