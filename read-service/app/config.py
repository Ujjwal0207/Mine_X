import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://minix:minix_dev@localhost:5432/minix",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
PORT = int(os.getenv("PORT", "4001"))
INSTANCE_ID = os.getenv("INSTANCE_ID", "read-1")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "60"))

CACHE_KEY_FEED = "feed:posts"
