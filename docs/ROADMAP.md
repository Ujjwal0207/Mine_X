# Mini X — Phased Development Roadmap

This document tracks what gets built in each phase and why.  
**One phase at a time** — so the project grows naturally, not in a single day.

---

## Phase 1 — Foundation ✅

**Goal:** Working app with auth and posts.

**What we built:**
- Express API with TypeScript
- PostgreSQL via Docker + Prisma ORM
- JWT authentication (register, login)
- Posts CRUD (create, list)
- React frontend (login, feed, compose)

---

## Phase 2-3 — Redis + Load Balancer + Read/Write Split ✅ (Current)

**Goal:** Twitter-style read/write separation with caching and horizontal scaling.

**What we built:**
- **Write service** (TypeScript) — auth, post creation, Redis cache invalidation
- **Read service** (Python FastAPI) — feed queries with cache-aside pattern
- **Redis** — caches feed and individual posts (60s TTL)
- **Nginx** — API gateway routing GET→read, POST→write; `least_conn` load balancing
- 2 instances of each service to demonstrate horizontal scaling

**HLD concepts:**
- CQRS-lite (command/query separation)
- Cache-aside pattern + invalidation
- Read-heavy vs write-heavy service split
- Load balancing (least connections)
- Polyglot microservices (TypeScript + Python)
- API gateway routing

**Interview talking point:**  
*"Reads go to a Python service that checks Redis first. Writes go to TypeScript, which invalidates the cache. Nginx load-balances across 2 instances of each."*

See [docs/phase-2-3.md](phase-2-3.md).

---

## Phase 4 — Background Jobs (RabbitMQ)

**Goal:** Don't block the API for slow work.

**What we add:**
- RabbitMQ container
- Worker process for async tasks
- Fan-out notifications when someone posts
- Retry logic for failed jobs

**HLD concepts:**
- Message queues
- Producer-consumer pattern
- Async processing
- Decoupling services

---

## Phase 5 — Follow System & Personalized Feed

**Goal:** Users follow each other and see a personalized timeline.

**What we add:**
- Follow/unfollow API
- Fan-out on write (push posts to follower feeds)
- Feed pagination (cursor-based)

**HLD concepts:**
- Graph relationships
- Fan-out vs fan-in tradeoffs
- Pagination strategies
- Hot user problem

---

## Phase 6 — Likes, Comments, Reposts

**Goal:** Social engagement features.

**What we add:**
- Like/unlike with optimistic UI
- Nested comments
- Repost (retweet) functionality
- Counter caching in Redis

**HLD concepts:**
- Write-heavy workloads
- Denormalized counters
- Optimistic updates
- Idempotency

---

## Phase 7 — Real-time Notifications (WebSockets)

**Goal:** Live updates without polling.

**What we add:**
- WebSocket server
- Real-time like/comment/follow notifications
- Notification bell in UI

**HLD concepts:**
- WebSockets vs polling vs SSE
- Pub/sub pattern
- Connection management at scale

---

## Phase 8 — Offline-First Sync ⭐

**Goal:** App works when internet drops, syncs when back online.

**What we add:**
- IndexedDB for local storage
- Pending action queue (posts, likes)
- Service Worker for offline detection
- Sync worker replays queued actions on reconnect
- Conflict resolution (last-write-wins)

**HLD concepts:**
- Offline-first architecture
- Eventual consistency
- Sync queues
- CRDT basics (optional stretch)

**Interview talking point:**  
*"When offline, actions are stored in IndexedDB. On reconnect, a sync worker replays the queue in order with retry logic."*

---

## Phase 9 — Monitoring (Prometheus + Grafana)

**Goal:** Observe system health.

**What we add:**
- Prometheus metrics endpoint
- Grafana dashboards (requests, latency, errors)
- Structured logging

**HLD concepts:**
- Observability (metrics, logs, traces)
- SLIs and SLOs
- Alerting basics

---

## Phase 10 — Fault Tolerance

**Goal:** System survives component failures.

**What we add:**
- Circuit breaker for Redis/DB calls
- Graceful degradation (serve stale cache if DB slow)
- Retry with exponential backoff
- Chaos testing scripts (kill containers)

**HLD concepts:**
- Circuit breaker pattern
- Bulkhead pattern
- Graceful degradation
- CAP theorem in practice

---

## Phase 11 — Database Replication

**Goal:** Separate read and write paths.

**What we add:**
- PostgreSQL primary + read replica (Docker)
- Write to primary, read from replica
- Replication lag awareness

**HLD concepts:**
- Primary-replica replication
- Read scaling
- Replication lag
- Consistency tradeoffs

---

## Phase 12 — Search & Rate Limiting

**Goal:** Production-grade extras.

**What we add:**
- Elasticsearch for full-text search
- Trending hashtags
- Rate limiting via Redis (100 req/min)
- DNS simulation via `/etc/hosts` (`minix.local`)

**HLD concepts:**
- Inverted index search
- Rate limiting algorithms (token bucket)
- DNS resolution
- CDN simulation with Nginx cache

---

## How to Work Through This

1. Complete one phase fully before starting the next
2. Commit after each phase with a clear message
3. Update this doc — mark phases ✅ as you finish
4. Write a short `docs/phase-N.md` explaining what you learned
5. Be ready to explain tradeoffs in interviews

**Estimated timeline:** 2–4 weeks if you do 1 phase every 2–3 days.

---

## Cost

Everything runs locally. **$0.00 total.**

No AWS. No credit card. No surprises.
