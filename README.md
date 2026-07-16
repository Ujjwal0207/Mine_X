# Mini X

A **Twitter/X-like social media app** built step-by-step to learn **High Level Design (HLD)** concepts — load balancing, caching, read/write service split, microservices, and more.

Built for college placements and system design interviews. Runs **100% free on your laptop** using Docker and open-source tools. No cloud account or credit card required.

**Current phase:** 2-3 — Redis caching, Nginx load balancer, TypeScript write service + Python read service.

---

## Table of Contents

- [What is Mini X?](#what-is-mini-x)
- [Features](#features)
- [Tech Stack & Methods Used](#tech-stack--methods-used)
- [Architecture](#architecture)
- [How It Works — Full Workflow](#how-it-works--full-workflow)
- [Getting Started](#getting-started)
- [How to Use the App](#how-to-use-the-app)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Future Scope](#future-scope)
- [HLD Concepts Covered](#hld-concepts-covered)
- [Documentation](#documentation)
- [License](#license)

---

## What is Mini X?

Mini X is a learning project that recreates core patterns used by large social platforms like Twitter/X:

- **Read-heavy** traffic (browsing the feed) is handled by a dedicated **Python service** with **Redis caching**
- **Write-heavy** traffic (login, posting) is handled by a dedicated **TypeScript service**
- An **Nginx load balancer** sits in front, routing requests and distributing load across **multiple instances** of each service

The project is built in **phases** — each phase adds one real-world HLD concept, so the codebase grows naturally over time rather than in a single day.

---

## Features

| Feature | Status | Phase |
|---------|--------|-------|
| User registration & login | ✅ | 1 |
| JWT authentication | ✅ | 1 |
| Create posts (280 chars) | ✅ | 1 |
| View home feed | ✅ | 1 |
| PostgreSQL database | ✅ | 1 |
| React frontend (dark UI) | ✅ | 1 |
| Redis cache-aside (feed) | ✅ | 2-3 |
| Nginx load balancer | ✅ | 2-3 |
| Write service (TypeScript) | ✅ | 2-3 |
| Read service (Python FastAPI) | ✅ | 2-3 |
| Horizontal scaling (2 instances each) | ✅ | 2-3 |
| Cache HIT/MISS visible in UI | ✅ | 2-3 |
| Background jobs (RabbitMQ) | 🔜 | 4 |
| Follow system & personalized feed | 🔜 | 5 |
| Likes, comments, reposts | 🔜 | 6 |
| Real-time notifications (WebSockets) | 🔜 | 7 |
| Offline-first sync | 🔜 | 8 |
| Monitoring (Prometheus + Grafana) | 🔜 | 9 |
| Fault tolerance & circuit breakers | 🔜 | 10 |
| Database read replicas | 🔜 | 11 |
| Search & rate limiting | 🔜 | 12 |

---

## Tech Stack & Methods Used

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI components |
| **Vite 6** | Dev server and build tool |
| **TypeScript** | Type-safe frontend code |
| **React Router** | Page routing (login, register, home) |
| **CSS (custom)** | Twitter-like dark theme |

### Write Service (`backend/`)

| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | HTTP API for mutations |
| **TypeScript** | Type-safe backend |
| **Prisma** | ORM, schema, DB migrations |
| **Zod** | Request validation |
| **bcryptjs** | Password hashing |
| **jsonwebtoken (JWT)** | Stateless authentication |
| **Redis (node client)** | Cache invalidation on new posts |

**Methods/patterns:** REST API, JWT auth, password hashing, cache invalidation on write, stateless services.

### Read Service (`read-service/`)

| Technology | Purpose |
|------------|---------|
| **Python 3.9+** | Read-heavy service runtime |
| **FastAPI** | Async HTTP API framework |
| **asyncpg** | PostgreSQL driver |
| **Redis** | Cache-aside for feed queries |
| **Pydantic** | Data validation |
| **Uvicorn** | ASGI server |

**Methods/patterns:** Cache-aside, graceful Redis fallback, connection pooling, response headers for observability (`X-Cache`, `X-Instance-Id`).

### Infrastructure (Docker)

| Technology | Purpose |
|------------|---------|
| **PostgreSQL 16** | Primary database (source of truth) |
| **Redis 7** | In-memory cache layer |
| **Nginx** | API gateway + load balancer (`least_conn`) |
| **Docker Compose** | Run infra locally with one command |

**Methods/patterns:** Load balancing, API gateway routing, method-based routing (GET vs POST), health checks, persistent volumes.

---

## Architecture

```
                         ┌─────────────────────┐
                         │   Browser (React)   │
                         │   localhost:5173    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Nginx API Gateway  │
                         │   localhost:8080     │
                         │   (load balancer)    │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
         ┌─────────────────────┐       ┌─────────────────────┐
         │     WRITE POOL       │       │      READ POOL       │
         │   (least_conn LB)    │       │   (least_conn LB)    │
         ├──────────┬───────────┤       ├──────────┬───────────┤
         │ write-1  │ write-2  │       │ read-1   │ read-2   │
         │  :3001   │  :3002   │       │  :4001   │  :4002   │
         │TypeScript│TypeScript│       │ Python   │ Python   │
         └──────────┴───────────┘       └──────────┴──────────┘
                    │                               │
                    │         ┌──────────┐          │
                    └────────►│  Redis   │◄─────────┘
                              │  :6379   │
                              └────┬─────┘
                                   │
                              ┌────▼─────┐
                              │PostgreSQL│
                              │  :5432   │
                              └──────────┘
```

### Service responsibilities

| Service | Language | Role | Handles |
|---------|----------|------|---------|
| **Write service** | TypeScript | Write-heavy | `POST /api/auth/*`, `POST /api/posts`, cache invalidation |
| **Read service** | Python | Read-heavy | `GET /api/posts`, `GET /api/posts/:id` |
| **Nginx** | — | Gateway + LB | Routes by HTTP method, balances across instances |
| **Redis** | — | Cache | Feed (`feed:posts`) and single posts (`post:{id}`), 60s TTL |
| **PostgreSQL** | — | Database | Users, posts — source of truth |

---

## How It Works — Full Workflow

### 1. User registration / login

```
User fills form → React → Nginx (:8080) → Write pool (TypeScript)
                                              │
                                              ▼
                                         PostgreSQL
                                         (hash password / verify)
                                              │
                                              ▼
                                         Return JWT token
                                              │
                                              ▼
                              React stores token in localStorage
```

- All auth routes go to the **write pool** (mutations + validation).
- Nginx picks `write-1` or `write-2` using **least connections**.
- JWT is stateless — any write instance can verify it.

### 2. Loading the home feed (read-heavy)

```
User opens home → React GET /api/posts → Nginx → Read pool (Python)
                                                      │
                                                      ▼
                                              Check Redis
                                              feed:posts key
                                                 /        \
                                              HIT          MISS
                                               │             │
                                               │             ▼
                                               │        Query PostgreSQL
                                               │             │
                                               │             ▼
                                               │        Store in Redis (60s)
                                               │             │
                                               └──────┬──────┘
                                                      ▼
                                              Return posts + headers:
                                              X-Cache: HIT or MISS
                                              X-Instance-Id: read-1 / read-2
                                              X-Service: read-service
```

- First refresh → **MISS** (hits database, caches result).
- Second refresh within 60s → **HIT** (served from Redis, much faster).
- If Redis is down, Python falls back to PostgreSQL automatically.

### 3. Creating a new post (write-heavy)

```
User types post → React POST /api/posts + JWT → Nginx → Write pool (TypeScript)
                                                              │
                                                              ▼
                                                         Verify JWT
                                                              │
                                                              ▼
                                                         Insert into PostgreSQL
                                                              │
                                                              ▼
                                                         Invalidate Redis
                                                         (delete feed:posts)
                                                              │
                                                              ▼
                                                         Return new post
                                                              │
                                                              ▼
                                              React prepends post to feed
```

- Write service deletes `feed:posts` from Redis so the next feed load gets fresh data.
- This is the **cache-aside + invalidation** pattern used in production systems.

### 4. Request routing summary

| Request | Routed to | Handled by |
|---------|-----------|------------|
| `POST /api/auth/register` | Write pool | TypeScript |
| `POST /api/auth/login` | Write pool | TypeScript |
| `GET /api/auth/me` | Write pool | TypeScript |
| `GET /api/posts` | Read pool | Python |
| `GET /api/posts/:id` | Read pool | Python |
| `POST /api/posts` | Write pool | TypeScript |
| `GET /health` | Write pool | TypeScript |

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Free — for Postgres, Redis, Nginx |
| [Node.js](https://nodejs.org/) | 18+ | Free |
| [Python](https://www.python.org/) | 3.9+ | Free — usually pre-installed on macOS |

> **Important:** Start **Docker Desktop** before running any `docker compose` commands.

### First-time setup

```bash
# Clone / enter the project
cd Mine_World

# Install all dependencies (Node + Python)
npm run setup

# Copy environment files
cp backend/.env.example backend/.env
cp read-service/.env.example read-service/.env

# Start infrastructure (Postgres + Redis + Nginx)
docker compose up -d

# Create database tables
cd backend && npm run db:push && cd ..
```

### Start the application

You need **two terminals** — one for API services, one for the frontend.

**Terminal 1 — API services** (starts all 4 instances: 2 write + 2 read):

```bash
npm run dev
```

**Terminal 2 — Frontend:**

```bash
npm run dev:frontend
```

### URLs

| Service | URL |
|---------|-----|
| **App (open this)** | http://localhost:5173 |
| API Gateway (Nginx) | http://localhost:8080 |
| Write service 1 | http://localhost:3001 |
| Write service 2 | http://localhost:3002 |
| Read service 1 | http://localhost:4001 |
| Read service 2 | http://localhost:4002 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Run services individually (optional)

Useful for debugging one service at a time:

```bash
npm run dev:write-1     # TypeScript write instance 1
npm run dev:write-2     # TypeScript write instance 2
npm run dev:read-1      # Python read instance 1
npm run dev:read-2      # Python read instance 2
npm run dev:frontend    # React frontend
```

### Stop everything

```bash
# Stop API services: Ctrl+C in the terminal running npm run dev
# Stop frontend: Ctrl+C in the frontend terminal

# Stop Docker containers
npm run infra:down
```

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to Docker daemon` | Open Docker Desktop and wait until it is running |
| `Port already in use` | Stop the process on that port or change `PORT` in `.env` |
| Feed shows error | Ensure all 4 API instances + `docker compose up -d` are running |
| `pip` / `uvicorn` not found | Use `python3 -m uvicorn` (already in npm scripts) |
| Database connection failed | Run `docker compose up -d` and `cd backend && npm run db:push` |

---

## How to Use the App

1. Open **http://localhost:5173**
2. Click **Sign up** — create an account (username, email, password, name)
3. You land on the **Home feed**
4. Type a post (max 280 characters) and click **Post**
5. Your post appears at the top of the feed
6. Click **Refresh feed** — watch the system info bar:
   - `read-service` — which service handled the request
   - `read-1` or `read-2` — which instance (load balancing proof)
   - `Redis HIT` — served from cache (fast)
   - `Redis MISS` — fetched from database, then cached
7. Post again — bar shows `INVALIDATED` (write service cleared the cache)
8. Refresh again — `MISS` then `HIT` on consecutive refreshes

---

## API Reference

### Auth (Write service)

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| `POST` | `/api/auth/register` | No | `{ username, email, password, name }` | `{ user, token }` |
| `POST` | `/api/auth/login` | No | `{ email, password }` | `{ user, token }` |
| `GET` | `/api/auth/me` | Bearer JWT | — | `{ user }` |

### Posts

| Method | Endpoint | Auth | Service | Response |
|--------|----------|------|---------|----------|
| `GET` | `/api/posts` | No | Read (Python) | `{ posts: [...] }` |
| `GET` | `/api/posts/:id` | No | Read (Python) | `{ post: {...} }` |
| `POST` | `/api/posts` | Bearer JWT | Write (TypeScript) | `{ post: {...} }` |

### Health

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/health` | `{ status, service, instance, phase }` |

### Response headers (read service)

| Header | Example | Meaning |
|--------|---------|---------|
| `X-Service` | `read-service` | Which microservice responded |
| `X-Instance-Id` | `read-2` | Which instance handled the request |
| `X-Cache` | `HIT` / `MISS` | Whether Redis cache was used |

---

## Project Structure

```
Mine_World/
├── backend/                  # Write service (TypeScript)
│   ├── prisma/
│   │   └── schema.prisma     # User & Post models
│   └── src/
│       ├── routes/
│       │   ├── auth.ts       # Register, login, me
│       │   └── posts.ts      # POST posts only
│       ├── config/
│       │   ├── db.ts         # Prisma client
│       │   └── redis.ts      # Cache invalidation
│       ├── middleware/
│       │   └── auth.ts       # JWT verification
│       └── index.ts          # Entry point
│
├── read-service/             # Read service (Python)
│   └── app/
│       ├── main.py           # FastAPI app
│       ├── db.py             # PostgreSQL + Redis helpers
│       ├── config.py         # Environment config
│       └── routes/
│           └── posts.py      # GET feed with cache-aside
│
├── frontend/                 # React app
│   └── src/
│       ├── pages/            # Login, Register, Home
│       ├── components/     # PostCard, ComposeBox
│       ├── hooks/            # useAuth
│       └── services/         # API client
│
├── docker/
│   └── nginx/
│       └── nginx.conf        # Load balancer + routing rules
│
├── scripts/
│   └── dev.sh                # Start all API instances
│
├── docs/
│   ├── ROADMAP.md            # Full 12-phase plan
│   ├── phase-1.md            # Phase 1 notes
│   └── phase-2-3.md          # Phase 2-3 architecture
│
├── docker-compose.yml        # Postgres + Redis + Nginx
├── package.json              # Root dev scripts
└── README.md                 # This file
```

---

## Future Scope

The project grows in **12 phases**. Phases 1 and 2-3 are complete. Here is what comes next:

| Phase | Feature | HLD Concept | Stack to add |
|-------|---------|-------------|--------------|
| **4** | Background jobs | Message queues, async processing | RabbitMQ, worker process |
| **5** | Follow & personalized feed | Fan-out on write, graph data | New Prisma models, feed fan-out |
| **6** | Likes, comments, reposts | Write-heavy counters, idempotency | Redis counter cache |
| **7** | Real-time notifications | WebSockets, pub/sub | WebSocket server |
| **8** | Offline-first sync | Eventual consistency, sync queues | IndexedDB, Service Worker |
| **9** | Monitoring | Observability, SLIs/SLOs | Prometheus, Grafana |
| **10** | Fault tolerance | Circuit breaker, graceful degradation | Retry logic, chaos tests |
| **11** | DB replication | Read replicas, consistency tradeoffs | PostgreSQL primary + replica |
| **12** | Search & rate limiting | Inverted index, token bucket | Elasticsearch, Redis rate limiter |

### End-state vision

```
Browser (offline-capable PWA)
        │
        ▼
   Nginx (API Gateway + rate limiting + CDN cache)
        │
   ┌────┴────┬──────────┬──────────┐
   ▼         ▼          ▼          ▼
Write     Read      WebSocket   Search
Service   Service   Service     Service
(TS)      (Python)  (TS)        (Python/ES)
   │         │          │          │
   └────┬────┴────┬─────┴──────────┘
        ▼         ▼
     RabbitMQ   Redis
        │         │
        ▼         ▼
     Workers   PostgreSQL
                (primary + replica)
        │
        ▼
   Prometheus → Grafana
```

See the full plan in [docs/ROADMAP.md](docs/ROADMAP.md).

---

## HLD Concepts Covered

| Concept | Where it lives | Phase |
|---------|----------------|-------|
| REST API design | Write + Read services | 1 |
| Relational database | PostgreSQL + Prisma | 1 |
| Stateless JWT auth | Write service | 1 |
| **Cache-aside pattern** | Read service + Redis | 2-3 |
| **Cache invalidation** | Write service | 2-3 |
| **Read/write service split** | TypeScript + Python | 2-3 |
| **Load balancing** | Nginx `least_conn` | 2-3 |
| **API gateway routing** | Nginx method-based routing | 2-3 |
| **Horizontal scaling** | 2 instances per pool | 2-3 |
| **Polyglot microservices** | TypeScript + Python | 2-3 |
| **Graceful degradation** | Redis fallback to DB | 2-3 |
| Message queues | — | 4 (planned) |
| Offline sync | — | 8 (planned) |
| Fault tolerance | — | 10 (planned) |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Complete 12-phase development plan |
| [docs/phase-1.md](docs/phase-1.md) | Phase 1 architecture and interview notes |
| [docs/phase-2-3.md](docs/phase-2-3.md) | Phase 2-3 deep dive (cache, LB, read/write split) |

---

## Cost

**$0.00** — everything runs locally.

| Component | Cost |
|-----------|------|
| Docker Desktop | Free |
| Node.js, Python | Free |
| PostgreSQL, Redis, Nginx | Free (open source) |
| Cloud (AWS/GCP/Azure) | Not used |

No credit card. No subscriptions. No billing risk.

---

## License

MIT — free to use for learning, portfolios, and interviews.
