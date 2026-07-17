import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: ReturnType<typeof createClient> | null = null;

export async function getRedis() {
  if (!client) {
    client = createClient({ url: REDIS_URL });
    client.on("error", (err) => console.warn("[redis] connection error:", err.message));
    await client.connect();
  }
  return client;
}

export const CACHE_KEYS = {
  FEED: "feed:posts",
  post: (id: string) => `post:${id}`,
} as const;

export async function invalidatePostCaches(postId?: string): Promise<void> {
  try {
    const redis = await getRedis();
    const keys: string[] = [CACHE_KEYS.FEED];
    if (postId) keys.push(CACHE_KEYS.post(postId));
    await redis.del(keys);
    console.log(`[cache] invalidated: ${keys.join(", ")}`);
  } catch {
    console.warn("[cache] Redis unavailable — skipping invalidation");
  }
}
