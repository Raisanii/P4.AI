# P4.AI — Classroom Operating System

AI-powered Classroom Operating System for SMK class. Single source of truth for
schedule, tasks, attendance, announcements, and WhatsApp AI assistant.

## Stack

- Next.js 15 (App Router, TypeScript strict)
- Prisma ORM + Turso (libSQL) via `@prisma/adapter-libsql`
- NextAuth.js v5 (beta)
- bcryptjs for password hashing

## Setup

```bash
cp .env.example .env   # fill DATABASE_URL, TURSO_AUTH_TOKEN, NEXTAUTH_SECRET
npm install
npm run db:generate
npm run dev            # http://localhost:3000
```

## Health check

```
GET /api/health  →  { "status": "ok", "db": "reachable" }
```
