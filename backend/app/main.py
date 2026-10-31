from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.db.session import SessionLocal
from app.users.service import bootstrap_admin


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate()
    with SessionLocal() as database:
        bootstrap_admin(database)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.include_router(api_router)
