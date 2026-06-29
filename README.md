# CoSync — Local-First Collaborative Document Editor

> A production-grade collaborative document editor with **offline-first synchronization**, **deterministic conflict resolution (CRDTs)**, **granular version control**, and **role-based access control**.

Built for the House of Edtech Fullstack Developer Assignment 2 (v2.1, April 2026).

---

## ✨ Key Features

- **Local-First** — IndexedDB is the primary source of truth; the UI never blocks on the network
- **Deterministic Conflict Resolution** — Yjs CRDTs guarantee convergence regardless of operation order
- **Version History & Time Travel** — Append-only snapshots with safe non-destructive restore
- **Real-Time Collaboration** — Live sync via WebSocket with role-based access (Owner/Editor/Viewer)
- **AI Assistant** — Summarize, extract tags, suggest titles, improve prose, Q&A (pluggable provider)
- **Authentication** — NextAuth.js with credentials (bcrypt) and JWT sessions
- **Security** — Anti-OOM guards, rate limiting, Zod validation, tenant isolation, RLS migration SQL

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Editor | TipTap (ProseMirror) |
| CRDT | Yjs + y-prosemirror + y-indexeddb |
| Real-time | Custom WebSocket provider (Yjs sync protocol) |
| Database | Prisma ORM — SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth.js v4 (credentials, JWT, bcrypt) |
| UI | Tailwind CSS 4 + shadcn/ui (New York) |
| AI | Vercel AI SDK + pluggable providers |
| Collab service | Bun + ws (independent mini-service) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ / Bun
- PostgreSQL (production) or SQLite (development)

### Installation

```bash
bun install
cp .env.example .env
bun run db:push
```

### Running

```bash
bun run dev                              # Next.js app on :3000
cd mini-services/collab-service && bun run dev   # collab service on :3001
```

---

## 🔌 AI Provider Configuration

Set one env var to switch models:

| Provider | Env | Free tier |
|---|---|---|
| Built-in (default) | `AI_PROVIDER=zai` | ✅ works immediately |
| Groq | `AI_PROVIDER=groq`, `AI_API_KEY=gsk_...` | ✅ Llama 3.3 70B |
| Google Gemini | `AI_PROVIDER=google`, `AI_API_KEY=...` | ✅ Gemini 1.5 Flash |
| Ollama (local) | `AI_PROVIDER=ollama` | ✅ no key needed |

---

## 🔒 Security

- JWT WebSocket handshake (first-message auth, not URL)
- Role enforcement on every API route and WebSocket message
- Anti-OOM: 1MB/update cap, 30 ops/s rate limit, 10MB doc-state cap
- Rate limiting on auth and AI endpoints
- Internal service-to-service auth via shared secret
- PostgreSQL RLS policies in `prisma/migrations/rls_policies.sql`

---

## 🌐 Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

### Collab Service (Railway / Fly.io)
Deploy `mini-services/collab-service/` as a separate Bun service.

### Database (PostgreSQL)
1. Swap `provider` to `postgresql` in `prisma/schema.prisma`
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Run `prisma migrate deploy`
4. Apply `prisma/migrations/rls_policies.sql`

---

## 📁 Project Structure

```
src/
├── app/api/        # REST routes (documents, versions, members, ai, auth, collab, internal)
├── components/     # Editor, dashboard, landing, auth, AI, share panels
├── hooks/          # useCollabProvider (sync engine)
├── lib/            # AI provider, CRDT codec, repos, auth, rate limiting
└── stores/         # Zustand UI store
mini-services/
└── collab-service/ # Independent Bun + ws + yjs real-time service
prisma/
├── schema.prisma   # Portable schema (SQLite ↔ PostgreSQL)
└── migrations/     # RLS policies for PostgreSQL
```

---

## 👤 Author

**Aryan Dongre**
- GitHub: [@aryan2135](https://github.com/aryan2135)
- LinkedIn: [aryan-dongre-29b858313](https://www.linkedin.com/in/aryan-dongre-29b858313/)

---

## 📄 License

MIT
