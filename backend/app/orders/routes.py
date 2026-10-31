from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.orders import service
from app.orders.models import Order
from app.orders.schemas import OrderRead, OrderStatusUpdate
from app.users.models import User
from app.users.routes import AdminUser, CurrentUser

router = APIRouter(prefix="/api/v1", tags=["orders"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def post_order(database: DatabaseSession, user: CurrentUser) -> OrderRead:
    try:
        return service.serialize_order(service.create_order(database, user))
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/orders", response_model=list[OrderRead])
def get_my_orders(database: DatabaseSession, user: CurrentUser) -> list[OrderRead]:
    return [service.serialize_order(order) for order in service.list_orders(database, user)]


@router.get("/orders/{order_id}", response_model=OrderRead)
def get_my_order(
    order_id: int, database: DatabaseSession, user: CurrentUser
) -> OrderRead:
    order = service.get_order(database, order_id)
    if order is None or (order.user_id != user.id and user.role != "admin"):
        raise HTTPException(status_code=404, detail="Order not found")
    return service.serialize_order(order)


@router.post("/orders/{order_id}/cancel", response_model=OrderRead)
def cancel_my_order(
    order_id: int, database: DatabaseSession, user: CurrentUser
) -> OrderRead:
    order = service.get_order(database, order_id)
    if order is None or (order.user_id != user.id and user.role != "admin"):
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        return service.serialize_order(service.cancel_customer_order(database, order))
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/admin/orders", response_model=list[OrderRead])
def get_all_orders(database: DatabaseSession, _: AdminUser) -> list[OrderRead]:
    return [service.serialize_order(order) for order in service.list_orders(database)]


@router.patch("/admin/orders/{order_id}/status", response_model=OrderRead)
def patch_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    database: DatabaseSession,
    _: AdminUser,
) -> OrderRead:
    order = service.get_order(database, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        order = service.change_order_status(database, order, payload.status)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return service.serialize_order(order)
