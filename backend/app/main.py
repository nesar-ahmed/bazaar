from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title="Bazaar API", version="0.1.0", lifespan=lifespan)
app.include_router(api_router)
