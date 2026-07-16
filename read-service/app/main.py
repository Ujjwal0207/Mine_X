from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import INSTANCE_ID
from app.db import close_connections
from app.routes import posts


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_connections()


app = FastAPI(
    title="Mini X Read Service",
    description="Read-heavy Python service with Redis cache-aside",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "read-service",
        "instance": INSTANCE_ID,
        "phase": "2-3",
        "role": "read-heavy",
    }
