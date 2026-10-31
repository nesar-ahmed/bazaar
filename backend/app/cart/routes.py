from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.cart import service
from app.cart.models import Cart
from app.cart.schemas import CartItemInput, CartItemUpdate, CartRead
from app.db.session import get_db
from app.users.routes import AuthenticatedContext, get_optional_context

router = APIRouter(prefix="/api/v1/cart", tags=["cart"])
DatabaseSession = Annotated[Session, Depends(get_db)]
OptionalContext = Annotated[AuthenticatedContext | None, Depends(get_optional_context)]


def _cart_for_request(
    database: Session,
    context: AuthenticatedContext | None,
    cart_token: str | None,
) -> tuple[Cart, str | None]:
    return service.get_or_create_cart(
        database,
        context.user if context else None,
        cart_token,
    )


def _raise_service_error(error: Exception) -> None:
    if isinstance(error, LookupError):
        raise HTTPException(status_code=404, detail=str(error)) from error
    if isinstance(error, ValueError):
        raise HTTPException(status_code=409, detail=str(error)) from error
    raise error


@router.get("", response_model=CartRead)
def get_cart(
    database: DatabaseSession,
    context: OptionalContext,
    cart_token: Annotated[str | None, Header(alias="X-Cart-Token")] = None,
) -> CartRead:
    cart, new_token = _cart_for_request(database, context, cart_token)
    return service.serialize_cart(cart, new_token)


@router.post("/items", response_model=CartRead, status_code=status.HTTP_200_OK)
def post_cart_item(
    payload: CartItemInput,
    database: DatabaseSession,
    context: OptionalContext,
    cart_token: Annotated[str | None, Header(alias="X-Cart-Token")] = None,
) -> CartRead:
    cart, new_token = _cart_for_request(database, context, cart_token)
    try:
        cart = service.add_item(database, cart, payload.product_id, payload.quantity)
    except (LookupError, ValueError) as error:
        _raise_service_error(error)
    return service.serialize_cart(cart, new_token)


@router.patch("/items/{product_id}", response_model=CartRead)
def patch_cart_item(
    product_id: int,
    payload: CartItemUpdate,
    database: DatabaseSession,
    context: OptionalContext,
    cart_token: Annotated[str | None, Header(alias="X-Cart-Token")] = None,
) -> CartRead:
    cart, new_token = _cart_for_request(database, context, cart_token)
    try:
        cart = service.update_item(database, cart, product_id, payload.quantity)
    except (LookupError, ValueError) as error:
        _raise_service_error(error)
    return service.serialize_cart(cart, new_token)


@router.delete("/items/{product_id}", response_model=CartRead)
def delete_cart_item(
    product_id: int,
    database: DatabaseSession,
    context: OptionalContext,
    cart_token: Annotated[str | None, Header(alias="X-Cart-Token")] = None,
) -> CartRead:
    cart, new_token = _cart_for_request(database, context, cart_token)
    try:
        cart = service.remove_item(database, cart, product_id)
    except LookupError as error:
        _raise_service_error(error)
    return service.serialize_cart(cart, new_token)
