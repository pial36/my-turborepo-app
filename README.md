# Team Hub 🚀

A full-stack collaborative workspace app where teams manage goals,
announcements, and action items in real time.

---

## Live URLs

| Service  | URL |
|----------|-----|
| Web App  | https://your-web.up.railway.app |
| API      | https://your-api.up.railway.app |
| API Docs | https://your-api.up.railway.app/api/docs |

---

## Demo Account

| Role   | Email            | Password     |
|--------|------------------|--------------|
| Admin  | admin@demo.com   | demo123456   |
| Member | jane@demo.com    | demo123456   |
| Member | bob@demo.com     | demo123456   |

---

## Tech Stack

| Area            | Technology                          |
|-----------------|-------------------------------------|
| Monorepo        | Turborepo                           |
| Frontend        | Next.js 14+ App Router (JavaScript) |
| Styling         | Tailwind CSS                        |
| State           | Zustand                             |
| Backend         | Node.js + Express.js                |
| Database        | PostgreSQL + Prisma ORM             |
| Auth            | JWT — httpOnly cookies              |
| Real-time       | Socket.io                           |
| File Storage    | Cloudinary                          |
| Deployment      | Railway                             |

---

## Advanced Features Built

### 1. Advanced RBAC (#4)
A permission matrix controls exactly what each workspace member can do.
Admins can configure per-member permissions including:
- canCreateGoals
- canPostAnnouncements
- canInviteMembers
- canManageActionItems

Endpoint: PUT /api/workspaces/:id/members/:userId/permissions

### 2. Audit Log (#5)
Every important workspace action is logged immutably including goal
creation, member invites, announcements, and workspace updates.
- Filterable by action type, user, and date range
- Exportable as CSV
- Admin-only access

Endpoint: GET /api/audit-logs/:workspaceId

---

## Bonus Features Built

- Email notifications — invite emails and @mention emails via Nodemailer
- OpenAPI / Swagger docs — served at /api/docs

---

## Project Structure

team-hub/
├── turbo.json
├── package.json
├── apps/
│   ├── api/                    # Express backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.js
│   │   └── src/
│   │       ├── index.js
│   │       ├── lib/            # prisma, cloudinary, mailer, swagger
│   │       ├── middleware/     # auth, role, upload
│   │       ├── routes/         # all REST routes
│   │       ├── services/       # all Prisma service functions
│   │       └── sockets/        # socket.io logic
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI components
│           ├── stores/         # Zustand stores
│           ├── hooks/          # custom hooks
│           └── lib/            # api client, socket
└── packages/
└── eslint-config/

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Cloudinary account
- Gmail account (for email notifications)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/team-hub.git
cd team-hub
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

**apps/api/.env**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/teamhub
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
NODE_ENV=development
```

**apps/web/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 4. Set up database
```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

### 5. Run development servers
```bash
# from root
npm run dev
```

---

## Environment Variables Reference

### Backend
| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_ACCESS_SECRET | Secret for access tokens (15min) |
| JWT_REFRESH_SECRET | Secret for refresh tokens (7 days) |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name |
| CLOUDINARY_API_KEY | Cloudinary API key |
| CLOUDINARY_API_SECRET | Cloudinary API secret |
| CLIENT_URL | Frontend URL for CORS |
| EMAIL_USER | Gmail address for sending emails |
| EMAIL_PASS | Gmail App Password |
| NODE_ENV | development or production |

### Frontend
| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_API_URL | Backend API base URL |
| NEXT_PUBLIC_SOCKET_URL | Socket.io server URL |

---

## API Documentation

Full API docs available at:

https://your-api.up.railway.app/api/docs

---

## Known Limitations

- No TypeScript — project uses JavaScript only per requirements
- Avatar upload limited to 2MB
- Email notifications require Gmail App Password setup
- Real-time collaborative editing (feature #1) not implemented
- Offline support (feature #3) not implemented
- No unit or integration tests
- @mention detection is name-based — users with spaces in names
  must be mentioned without spaces e.g. @JaneSmith

---

## Conventional Commits Used

| Prefix | Purpose |
|--------|---------|
| feat: | New feature |
| fix: | Bug fix |
| chore: | Config, deps, tooling |
| docs: | Documentation |
| refactor: | Code restructure |
| style: | Formatting |

---

## Author

Pial Hassan Chowdhury
pialhasan36@email.com
GitHub: github.com/pial36