import json
from typing import Any, Optional

import asyncpg
import redis.asyncio as aioredis

from app.config import DATABASE_URL, REDIS_URL

_pool: Optional[asyncpg.Pool] = None
_redis: Optional[aioredis.Redis] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    return _pool


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


async def close_connections() -> None:
    global _pool, _redis
    if _pool:
        await _pool.close()
        _pool = None
    if _redis:
        await _redis.aclose()
        _redis = None


def serialize_row(row: asyncpg.Record) -> dict:
    return {
        "id": row["id"],
        "content": row["content"],
        "createdAt": row["created_at"].isoformat(),
        "author": {
            "id": row["author_id"],
            "username": row["username"],
            "name": row["name"],
        },
    }


async def cache_get(key: str) -> Optional[Any]:
    try:
        redis = await get_redis()
        raw = await redis.get(key)
        if raw:
            return json.loads(raw)
    except Exception as exc:
        print(f"[cache] read failed: {exc}")
    return None


async def cache_set(key: str, value: Any, ttl: int) -> None:
    try:
        redis = await get_redis()
        await redis.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        print(f"[cache] write failed: {exc}")
