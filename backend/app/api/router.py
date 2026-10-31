from fastapi import APIRouter

from app.cart.routes import router as cart_router
from app.catalog.routes import router as catalog_router
from app.health.routes import router as health_router
from app.orders.routes import router as orders_router
from app.users.routes import router as users_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(users_router)
api_router.include_router(catalog_router)
api_router.include_router(cart_router)
api_router.include_router(orders_router)
