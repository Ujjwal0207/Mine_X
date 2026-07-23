# Phase 1 — Foundation

**Status:** Complete  
**Date:** Phase 1 kickoff

## What was built

- **Backend:** Node.js + Express + TypeScript + Prisma
- **Database:** PostgreSQL 16 in Docker
- **Auth:** JWT-based register/login (stateless)
- **Posts:** Create and list posts (max 280 characters)
- **Frontend:** React + Vite with Twitter-like dark UI

## Architecture

```
Client (React :5173)
        │
        ▼
   API Server (:3000)
        │
        ▼
   PostgreSQL (:5432)
```

## HLD Concepts Covered

| Concept | How it's demonstrated |
|---------|----------------------|
| REST API | `/api/auth/*`, `/api/posts/*` endpoints |
| Relational DB | Users and Posts tables with foreign keys |
| Stateless auth | JWT tokens — no server-side sessions |
| Client-server | React SPA talks to Express API |
| Validation | Zod schemas on input |
| Health checks | `GET /health` endpoint |

## Key Files

- `backend/prisma/schema.prisma` — database models
- `backend/src/routes/auth.ts` — authentication
- `backend/src/routes/posts.ts` — post CRUD
- `frontend/src/pages/HomePage.tsx` — main feed
- `docker-compose.yml` — PostgreSQL container

## What's Next (Phase 2)

Add Redis caching for the post feed using the cache-aside pattern.

## Interview Prep

**Q: Why JWT instead of sessions?**  
A: JWT is stateless — any API instance can verify the token without shared session storage. This becomes important in Phase 3 when we run multiple servers.

**Q: Why PostgreSQL?**  
A: Relational data (users, posts, follows) fits well in SQL. ACID guarantees for writes. We'll add read replicas in Phase 11.

**Q: How would you scale this?**  
A: Phase 1 is single-server. Phases 2–3 add caching and load balancing. Phase 5 adds feed fan-out. Each phase addresses a specific bottleneck.
