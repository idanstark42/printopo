from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, designs, printify, checkout
from contextlib import asynccontextmanager
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to local Redis instance
    redis = aioredis.from_url("redis://localhost", encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    yield

app = FastAPI(title="Printopo API", lifespan=lifespan)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the routers
app.include_router(auth.router)
app.include_router(designs.router)
app.include_router(printify.router)
app.include_router(checkout.router)

@app.get("/")
def read_root():
    return {"status": "Printopo Engine is online"}