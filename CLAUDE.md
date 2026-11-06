# CLAUDE.md

Context for Claude Code sessions. Read this before exploring the repo.

## What this is

**Team Hub** — FredoCloud intern technical assessment (3-day take-home, 100 pts).
A collaborative workspace app: goals + milestones, announcements, action items,
real-time updates, analytics. Spec lives in `FredoCloud_Intern_Assignment.pdf`
(user's Downloads folder, not in repo); the full requirement checklist and its
status is at the bottom of this file — keep it current.

Author: Pial Hassan Chowdhury (GitHub `pial36`). Repo: `pial36/my-turborepo-app`.

## Stack (all mandatory per spec)

| Area | Tech |
|---|---|
| Monorepo | Turborepo + npm workspaces (`apps/*`, `packages/*`) |
| Web | `apps/web` — Next.js 16 App Router, **JavaScript only (no TypeScript)**, Tailwind v4, Zustand, Recharts, TipTap, socket.io-client |
| API | `apps/api` — Express 5 (CommonJS), Prisma 5 + PostgreSQL, Socket.io, Cloudinary, Nodemailer, swagger-jsdoc |
| Auth | JWT access (15m) + refresh (7d) tokens in **httpOnly cookies** |
| Deploy | Railway — web and api as two separate services + Railway Postgres |

## Layout

```
apps/api/
  prisma/schema.prisma, seed.js, migrations/
  src/app.js              express + socket.io (no listen) — imported by tests
  src/index.js            starts the server
  src/lib/pick.js, csv.js, sanitize.js   body whitelisting, CSV escaping, HTML sanitizing
  tests/api.test.js       Jest + Supertest integration suite (real Postgres)
  src/routes/*.routes.js  HTTP layer (validation, auth, emits socket events, audit log)
  src/services/*.js       Prisma queries
  src/middleware/         auth.middleware (protect), role.middleware (membership/RBAC)
  src/sockets/socket.js   socket auth, rooms (workspace:<id>, user:<id>), presence
  src/lib/                prisma, cloudinary, mailer, emailTemplates, swagger
apps/web/src/
  app/(auth)/             login, register
  app/(dashboard)/        layout.js (client-side auth guard + socket), dashboard/* pages
  components/             layout (sidebar, Topbar), goals, actions
  stores/                 Zustand stores, one per domain
  lib/api.js              axios instance, withCredentials, 401 → /refresh → retry queue
  lib/socket.js           socket singleton
  hooks/useSocket.js      wires socket events into stores
packages/shared/          @teamhub/shared (CommonJS): roles, statuses, priorities,
                          permission flags, reaction emoji, audit actions — use these
                          instead of re-declaring enums in either app
```

## Commands

```bash
npm install                     # root; api postinstall runs prisma generate
npm run dev                     # turbo: api on :5000, web on :3000
cd apps/api && npx prisma migrate dev
cd apps/api && npm run seed     # WIPES ALL TABLES, then seeds demo data
cd apps/web && npx next build   # quickest full check of the frontend
```

API: `npm test` in apps/api (see "Testing locally" below). Web: no tests;
verify web changes with `npx next build`.

Demo accounts (seed): `admin@demo.com`, `jane@demo.com`, `bob@demo.com` / `demo123456`.

## Things that will bite you

- **Cross-site cookies.** Web and API are on different `*.up.railway.app` hosts
  (different sites). Cookies must be `SameSite=None; Secure` in production — see
  `cookieOptions` in `auth.routes.js`. API needs `NODE_ENV=production` and an exact
  `CLIENT_URL` (no trailing slash) for CORS.
- **The web app can't see auth cookies.** They belong to the API domain. So there is
  no Next middleware/proxy auth check; `app/(dashboard)/layout.js` calls `/api/auth/me`
  and redirects to `/login`. Don't reintroduce a cookie-reading middleware.
- **Socket auth reads the `accessToken` cookie from the handshake headers.** Client
  connects with `withCredentials: true`; never read tokens from `document.cookie`.
- **Socket echo.** Routes emit with `io.to('workspace:<id>')`, which includes the sender.
  Stores must de-dupe by id when they add items both locally and from the socket.
- **Workspace membership.** Every route touching a workspace resource must verify the
  caller is a member of *that resource's* workspace (look up the resource, then the
  member) — `role.middleware.js` has helpers. Never trust `workspaceId` from `req.body`.
- **Never pass `req.body` straight to Prisma `update`.** Whitelist fields.
- **Express 5:** `req.body` is `undefined` when no body is sent; guard with `req.body || {}`.
- **Line endings:** most API files are CRLF. Keep the file's existing endings.
- `WorkspaceMember.role` is a string, `'ADMIN'` | `'MEMBER'`.
- Railway: API `start` runs `prisma migrate deploy` before boot. Seed manually once.
- Next 16: `next lint` is gone; `middleware.js` is renamed `proxy.js` (we use neither).

## Conventions

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) — the graders check.
- API responses: `{ success: boolean, data?, message? }`.
- Audit log: call the audit service from routes for every workspace mutation.
- Advanced features chosen (state in README): **#4 Advanced RBAC** and **#5 Audit log**.

## Requirement status (last updated 2026-11-06)

✅ done · ⚠️ partial · ❌ missing. **Update this when you change something.**

**Auth** ✅ register/login · ✅ protected routes (client guard) · ✅ profile + avatar · ✅ logout + refresh
**Workspaces** ✅ create/switch · ✅ invite by email (pending invites for unknown emails) · ✅ Admin/Member · ✅ name/description/accent (accent themes sidebar + editor via `--ws-accent`)
**Goals** ✅ title/owner picker/due/status · ✅ milestones % (debounced slider) · ✅ activity feed
**Announcements** ✅ TipTap rich text, sanitized server-side · ✅ reactions · ✅ comments · ✅ pin
**Action items** ✅ fields + goal link · ✅ Kanban + list · ⚠️ drag is HTML5 only (no touch)
**Real-time** ✅ posts/reactions/comments/pins/status/items broadcast · ✅ presence per tab · ✅ @mention → notification + email
**Analytics** ✅ totals / completed this week (`completedAt`) / overdue · ✅ Recharts · ✅ CSV (RFC 4180)
**Advanced** ✅ #4 RBAC (API-enforced, last-admin guard) · ✅ #5 audit log (all mutations, filters, filtered CSV, DB trigger blocks UPDATE)
**Bonus** ✅ Nodemailer · ✅ API tests (36, Jest+Supertest) · ⚠️ Swagger (auth routes only) · ❌ dark mode · ❌ ⌘K palette · ❌ PWA · ❌ frontend tests
**Monorepo** ✅ `packages/shared` used by both apps · ✅ turbo build/test/lint pipeline
**Submission** ❌ deployed to Railway · ❌ README live URLs · ❌ video walkthrough · ⚠️ early commits not conventional

### Open follow-ups
- Swagger docs for non-auth routes.
- Touch-friendly Kanban (status select on cards, or dnd-kit which is installed but unused).
- Dark mode / ⌘K / PWA if time allows (bonus points).

## Testing locally without touching real data

`apps/api/tests` wipes every table and refuses to run unless the database name contains
`test`. A throwaway cluster works well (Docker may not be running on this machine; local
PostgreSQL 16 binaries are at `C:\Program Files\PostgreSQL\16\bin`):

```bash
initdb -D <scratch>/pgdata -U test --auth=trust && pg_ctl -D <scratch>/pgdata -o "-p 55432" start
createdb -h localhost -p 55432 -U test teamhub_test
export DATABASE_URL=postgresql://test@localhost:55432/teamhub_test
cd apps/api && npx prisma migrate deploy && npm test
```

Never run `npm run seed` or the tests against the user's real `.env` database.
