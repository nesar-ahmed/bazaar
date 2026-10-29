from fastapi import APIRouter

from app.health.routes import router as health_router

api_router = APIRouter()
api_router.include_router(health_router)
