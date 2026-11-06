# Team Hub 🚀

A full-stack collaborative workspace where teams manage shared goals, post
announcements, and track action items in real time. Built for the FredoCloud
technical assessment as a Turborepo monorepo with a Next.js frontend and an
Express API, both deployed on Railway.

---

## Live URLs

| Service  | URL |
|----------|-----|
| Web App  | https://your-web.up.railway.app |
| API      | https://your-api.up.railway.app |
| API Docs | https://your-api.up.railway.app/api/docs |

> Replace these with the real Railway URLs after deploying.

## Demo Accounts

| Role   | Email          | Password   |
|--------|----------------|------------|
| Admin  | admin@demo.com | demo123456 |
| Member | jane@demo.com  | demo123456 |
| Member | bob@demo.com   | demo123456 |

---

## Tech Stack

| Area         | Technology |
|--------------|------------|
| Monorepo     | Turborepo + npm workspaces |
| Frontend     | Next.js (App Router, JavaScript), Tailwind CSS, Zustand, Recharts, TipTap |
| Backend      | Node.js + Express 5 (REST) |
| Database     | PostgreSQL + Prisma ORM |
| Auth         | JWT access (15 min) + refresh (7 days) tokens in httpOnly cookies |
| Real-time    | Socket.io (cookie-authenticated) |
| File storage | Cloudinary (avatars, attachments) |
| Email        | Nodemailer |
| Tests        | Jest + Supertest against a real PostgreSQL database |
| Deployment   | Railway — web and API as separate services |

---

## Features

**Authentication** — register / login, httpOnly cookie sessions with silent
refresh on 401, protected dashboard, profile with Cloudinary avatar upload, logout.

**Workspaces** — create and switch between workspaces; name, description and an
accent colour that themes the sidebar and editor. Invite by email: existing users
join immediately, unknown emails get a pending invite that is accepted
automatically when they sign up. Admin / Member roles.

**Goals & milestones** — goals with title, owner (any workspace member), due date
and status; milestones with a progress slider; a per-goal activity feed of
progress updates.

**Announcements** — rich-text editor (TipTap) for admins and members with the
*post announcements* permission; HTML is sanitized on the server. Emoji reactions,
comments with `@mention` autocomplete, pin to top.

**Action items** — assignee, priority, due date, status, optional parent goal.
Kanban board (drag between columns) and list view. The creator, the assignee
(status only) or an admin can move a card.

**Real-time** — every write is broadcast by the API to the workspace room:
new posts, reactions, comments, pins, goal status, goal updates, action-item
create/update/delete, member invites and workspace edits. Live "online now" list
(tracked per browser tab). `@mentions` create an in-app notification (bell + toast)
and an email.

**Analytics** — total goals, action items completed this week, overdue goals and
items, goal-status chart (Recharts), CSV export of goals and action items.

**Responsive** — the sidebar becomes a slide-over drawer on phones.

---

## Advanced Features (2 chosen)

### #4 Advanced RBAC
- Per-member permission matrix in **Settings → Members**: create goals, post
  announcements, invite members, manage action items. Admins bypass the matrix.
- Enforced in the API (`requirePermission`, `requireResourceMember` in
  `apps/api/src/middleware/role.middleware.js`), not just hidden in the UI.
- Every resource route checks that the caller belongs to the resource's
  workspace; ownership rules for editing goals, action items and announcements.
- A workspace can never lose its last admin.
- `PUT /api/workspaces/:id/members/:userId/permissions`

### #5 Audit Log
- Every workspace change is recorded: workspace, membership, role and
  permission changes, goals, announcements (incl. pin/unpin) and action items.
- **Immutable**: there is no update/delete API, and a PostgreSQL trigger rejects
  any `UPDATE` on `AuditLog` rows.
- Timeline UI filterable by action and date range; CSV export uses the same filters.
- Admin-only. `GET /api/audit-logs/:workspaceId`, `GET /api/audit-logs/:workspaceId/export`

## Bonus Features

- **Email notifications** — invitations and `@mention` emails via Nodemailer.
- **Tests** — 36 Jest + Supertest integration tests (`apps/api/tests`) covering
  auth, workspace isolation, permissions, sanitization, invites, analytics and the
  audit log trigger.
- **OpenAPI / Swagger** — served at `/api/docs` (auth endpoints documented).

---

## Monorepo Layout

```
.
├── turbo.json                 # build / dev / test / lint pipeline
├── packages/
│   └── shared/                # @teamhub/shared — roles, statuses, priorities,
│                              # permission flags, reaction emoji, audit actions
└── apps/
    ├── api/                   # Express API
    │   ├── prisma/            # schema, migrations, seed
    │   ├── src/app.js         # express + socket.io (importable for tests)
    │   ├── src/index.js       # starts the server
    │   ├── src/routes/        # HTTP layer: validation, auth, events, audit log
    │   ├── src/services/      # Prisma queries
    │   ├── src/middleware/    # auth (JWT cookie), role (membership / RBAC)
    │   ├── src/sockets/       # socket auth, rooms, presence
    │   └── tests/             # Jest + Supertest
    └── web/                   # Next.js App Router frontend
        └── src/
            ├── app/           # (auth) and (dashboard) route groups
            ├── components/    # layout, goals, actions, announcements
            ├── stores/        # Zustand, one store per domain
            ├── hooks/         # useSocket — maps socket events to stores
            └── lib/           # axios client (refresh on 401), socket client
```

`@teamhub/shared` is used by both apps, so the API's validation and the UI's
options can't drift apart.

---

## Local Setup

Prerequisites: Node.js 20+, PostgreSQL, a Cloudinary account (for uploads) and
an SMTP account such as a Gmail App Password (for email; optional).

```bash
git clone https://github.com/pial36/my-turborepo-app.git
cd my-turborepo-app
npm install            # also runs prisma generate
```

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/teamhub
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=http://localhost:3000
EMAIL_USER=you@gmail.com
EMAIL_PASS=your-app-password
NODE_ENV=development
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Set up the database and run both apps:

```bash
cd apps/api && npx prisma migrate dev && npm run seed && cd ../..
npm run dev            # api on :5000, web on :3000
```

### Tests

The suite wipes every table, so it only runs against a database whose name
contains `test`:

```bash
createdb teamhub_test
cd apps/api
DATABASE_URL=postgresql://postgres:password@localhost:5432/teamhub_test npx prisma migrate deploy
DATABASE_URL=postgresql://postgres:password@localhost:5432/teamhub_test npm test
```

---

## Deployment (Railway)

One Railway project with three services: PostgreSQL (plugin), **api** and **web**,
both pointing at this repo. Leave the root directory as the repo root so npm
workspaces can link `@teamhub/shared`.

| Service | Build command | Start command | Watch paths |
|---------|---------------|---------------|-------------|
| api | `npx turbo run build --filter=api` | `npm run start -w api` (runs `prisma migrate deploy`, then the server) | `apps/api/**`, `packages/**` |
| web | `npx turbo run build --filter=web` | `npm run start -w web` | `apps/web/**`, `packages/**` |

After the first deploy, seed once from the api service shell: `npm run seed`.

Web and API live on different `*.up.railway.app` domains, so auth cookies are
sent cross-site (`SameSite=None; Secure`). That requires `NODE_ENV=production`
on the API and `CLIENT_URL` set to the exact web URL.

## Environment Variables

### API
| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string (Railway injects it) |
| JWT_ACCESS_SECRET | Secret for access tokens (15 min) |
| JWT_REFRESH_SECRET | Secret for refresh tokens (7 days) |
| CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET | Cloudinary credentials |
| CLIENT_URL | Web app origin, for CORS and email links — no trailing slash |
| EMAIL_USER / EMAIL_PASS | SMTP credentials for Nodemailer |
| NODE_ENV | `production` on Railway (enables cross-site cookies) |
| PORT | Set by Railway |

### Web
| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_API_URL | API base URL |
| NEXT_PUBLIC_SOCKET_URL | Socket.io server URL (same as the API) |

---

## Known Limitations

- Advanced features #1 (collaborative editing), #2 (optimistic UI — partly
  present for reactions, pins and Kanban moves) and #3 (offline support) were not chosen.
- Not built from the bonus list: dark mode, ⌘K command palette, PWA, frontend tests.
- Swagger documents the auth endpoints only.
- `@mentions` match names without spaces (type `@JaneSmith` for "Jane Smith");
  the comment box autocompletes this.
- Audit log rows are removed when their workspace is deleted.
- Kanban drag-and-drop uses HTML5 drag events, which mobile browsers don't
  support; on phones the creator or an admin can change status in the edit dialog.
- Refresh tokens are stateless JWTs: logout clears the cookies but does not
  revoke a copied token before it expires.

---

## Author

Pial Hassan Chowdhury — pialhasan36@email.com — [github.com/pial36](https://github.com/pial36)
