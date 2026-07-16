from fastapi import APIRouter, HTTPException, Response

from app.config import CACHE_KEY_FEED, CACHE_TTL, INSTANCE_ID
from app.db import cache_get, cache_set, get_pool, serialize_row

router = APIRouter(prefix="/api/posts", tags=["posts"])

FEED_QUERY = """
    SELECT
        p.id,
        p.content,
        p."createdAt" AS created_at,
        u.id AS author_id,
        u.username,
        u.name
    FROM "Post" p
    JOIN "User" u ON u.id = p."authorId"
    ORDER BY p."createdAt" DESC
    LIMIT 50
"""

POST_BY_ID_QUERY = """
    SELECT
        p.id,
        p.content,
        p."createdAt" AS created_at,
        u.id AS author_id,
        u.username,
        u.name
    FROM "Post" p
    JOIN "User" u ON u.id = p."authorId"
    WHERE p.id = $1
"""


@router.get("")
async def list_posts(response: Response):
    cached = await cache_get(CACHE_KEY_FEED)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        response.headers["X-Service"] = "read-service"
        response.headers["X-Instance-Id"] = INSTANCE_ID
        return {"posts": cached}

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(FEED_QUERY)

    posts = [serialize_row(row) for row in rows]
    await cache_set(CACHE_KEY_FEED, posts, CACHE_TTL)

    response.headers["X-Cache"] = "MISS"
    response.headers["X-Service"] = "read-service"
    response.headers["X-Instance-Id"] = INSTANCE_ID
    return {"posts": posts}


@router.get("/{post_id}")
async def get_post(post_id: str, response: Response):
    cache_key = f"post:{post_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        response.headers["X-Service"] = "read-service"
        response.headers["X-Instance-Id"] = INSTANCE_ID
        return {"post": cached}

    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(POST_BY_ID_QUERY, post_id)

    if not row:
        raise HTTPException(status_code=404, detail="Post not found")

    post = serialize_row(row)
    await cache_set(cache_key, post, CACHE_TTL)

    response.headers["X-Cache"] = "MISS"
    response.headers["X-Service"] = "read-service"
    response.headers["X-Instance-Id"] = INSTANCE_ID
    return {"post": post}
