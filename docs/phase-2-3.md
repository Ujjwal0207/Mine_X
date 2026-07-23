# Phase 2-3 — Redis, Load Balancer, Read/Write Split

**Status:** Complete  
**Stack:** TypeScript (write) + Python (read) + Redis + Nginx

## Architecture

```
                    Browser (React)
                          │
                          ▼
                   Nginx (:8080)
                  API Gateway / LB
                    /         \
         write_pool           read_pool
        (least_conn)         (least_conn)
         /      \              /      \
   write-1   write-2     read-1   read-2
   :3001     :3002       :4001    :4002
   TypeScript            Python (FastAPI)
        \      \            /      /
         \      \          /      /
          ────── Redis ──────────
                    │
               PostgreSQL
```

## Service Responsibilities

| Service | Language | Role | Endpoints |
|---------|----------|------|-----------|
| write-service | TypeScript | Write-heavy | `POST /api/auth/*`, `POST /api/posts` |
| read-service | Python | Read-heavy | `GET /api/posts`, `GET /api/posts/:id` |
| nginx | — | Load balancer + routing | Routes by HTTP method |
| redis | — | Cache layer | Feed + single post cache |
| postgres | — | Source of truth | All persistent data |

## Why split read and write? (Twitter-style)

Twitter handles **billions of reads** vs far fewer writes. Separating services lets you:

1. **Scale independently** — add more Python read instances without touching write servers
2. **Optimize differently** — read service uses Redis cache-aside; write service focuses on consistency
3. **Use the right tool** — Python for data-heavy reads, TypeScript for your existing auth/mutation logic
4. **Isolate failures** — if read pool is overloaded, users can still post

## Cache-aside flow

**Read (Python):**
1. Check Redis for `feed:posts`
2. HIT → return immediately (see `X-Cache: HIT` in UI)
3. MISS → query PostgreSQL → store in Redis (60s TTL) → return

**Write (TypeScript):**
1. Insert post into PostgreSQL
2. Delete `feed:posts` from Redis (cache invalidation)
3. Next read rebuilds the cache

## Load balancing

Nginx uses `least_conn` — sends traffic to the instance with fewest active connections.

Check which instance handled your request via the `X-Instance-Id` header in the UI.

## Interview talking points

**Q: Why Redis and not just PostgreSQL?**  
A: The feed is read 100x more than it's written. Redis serves cached feeds in ~1ms vs ~10-50ms for a DB query.

**Q: What if Redis goes down?**  
A: Read service catches the error and falls back to PostgreSQL. Slower, but still works (graceful degradation — Phase 10 will expand this).

**Q: How does Nginx know where to route?**  
A: `GET /api/posts` → read pool. `POST /api/posts` and `/api/auth/*` → write pool. Method-based routing at the gateway.

**Q: Why Python for reads?**  
A: Demonstrates polyglot microservices — common in real companies. Python excels at data processing; Node handles I/O-heavy writes well.

## Key files

- `docker/nginx/nginx.conf` — routing + load balancing
- `backend/` — write-service (TypeScript)
- `read-service/` — read-service (Python FastAPI)
- `backend/src/config/redis.ts` — cache invalidation
- `read-service/app/routes/posts.py` — cache-aside reads

## How to run

```bash
# 1. Infrastructure
docker compose up -d

# 2. All API services (or run individually)
npm run dev

# 3. Frontend (separate terminal)
npm run dev:frontend
```

Open http://localhost:5173 — refresh the feed twice to see Redis HIT vs MISS.
