# Mini X — A Twitter-like HLD Learning Project

A step-by-step social media project built to demonstrate **High Level Design (HLD)** concepts for college placements and interviews.

**100% free. Runs entirely on your laptop with Docker. No cloud billing risk.**

---

## Current Status: Phase 1 ✅

Basic foundation — auth, posts, PostgreSQL, React frontend.

| Feature | Status |
|---------|--------|
| User registration & login (JWT) | ✅ |
| Create & view posts (280 chars) | ✅ |
| PostgreSQL database | ✅ |
| React frontend | ✅ |
| Redis caching | 🔜 Phase 2 |
| Load balancer | 🔜 Phase 3 |
| Background jobs | 🔜 Phase 4 |
| Offline sync | 🔜 Phase 8 |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (free)
- Node.js 18+ (free)

### 1. Start the database

```bash
docker compose up -d
```

### 2. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:push
npm run dev
```

API runs at `http://localhost:3000`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## Architecture (Phase 1)

```
Browser (React)
      │
      ▼
  API Server (Express + Node.js)
      │
      ▼
  PostgreSQL (Docker)
```

Simple and intentional. Each phase adds one HLD layer.

---

## Full Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the complete phased plan.

| Phase | Topic | HLD Concepts |
|-------|-------|--------------|
| 1 | Foundation | REST API, JWT auth, PostgreSQL |
| 2 | Caching | Redis, cache-aside pattern |
| 3 | Load Balancing | Nginx, horizontal scaling |
| 4 | Background Jobs | RabbitMQ, async processing |
| 5 | Follow & Feed | Graph data, fan-out |
| 6 | Likes & Comments | Write-heavy patterns |
| 7 | Real-time | WebSockets, notifications |
| 8 | Offline-First | IndexedDB, sync queue |
| 9 | Monitoring | Prometheus, Grafana |
| 10 | Fault Tolerance | Graceful degradation |
| 11 | DB Replication | Read replicas |
| 12 | Search & Rate Limit | Elasticsearch, rate limiting |

---

## Project Structure

```
Mine_World/
├── backend/          # Node.js + Express + Prisma
├── frontend/         # React + Vite
├── docker/           # Future: nginx, redis configs
├── docs/             # Architecture docs
└── docker-compose.yml
```

---

## API Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/posts` | List posts |
| POST | `/api/posts` | Create post |

---

## License

MIT — free to use for learning and portfolios.
