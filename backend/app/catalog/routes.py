from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.catalog import service
from app.catalog.models import Category, Product
from app.catalog.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)
from app.db.session import get_db
from app.users.routes import AdminUser

router = APIRouter(prefix="/api/v1", tags=["catalog"])
DatabaseSession = Annotated[Session, Depends(get_db)]


def _raise_service_error(error: Exception) -> None:
    if isinstance(error, LookupError):
        raise HTTPException(status_code=404, detail=str(error)) from error
    if isinstance(error, ValueError):
        raise HTTPException(status_code=409, detail=str(error)) from error
    raise error


@router.get("/categories", response_model=list[CategoryRead])
def get_categories(database: DatabaseSession) -> list[Category]:
    return service.list_categories(database)


@router.post(
    "/categories",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
def post_category(
    payload: CategoryCreate, database: DatabaseSession, _: AdminUser
) -> Category:
    try:
        return service.create_category(database, payload)
    except (LookupError, ValueError) as error:
        _raise_service_error(error)


@router.patch("/categories/{category_id}", response_model=CategoryRead)
def patch_category(
    category_id: int,
    payload: CategoryUpdate,
    database: DatabaseSession,
    _: AdminUser,
) -> Category:
    category = service.get_category(database, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    try:
        return service.update_category(database, category, payload)
    except (LookupError, ValueError) as error:
        _raise_service_error(error)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_category(category_id: int, database: DatabaseSession, _: AdminUser) -> None:
    category = service.get_category(database, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    try:
        service.delete_category(database, category)
    except ValueError as error:
        _raise_service_error(error)


@router.get("/products", response_model=list[ProductRead])
def get_products(
    database: DatabaseSession,
    category_id: int | None = Query(default=None, ge=1),
    search: str | None = Query(default=None, max_length=120),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=24, ge=1, le=100),
) -> list[Product]:
    return service.list_products(
        database, category_id=category_id, search=search, offset=offset, limit=limit
    )


@router.get("/admin/products", response_model=list[ProductRead])
def get_admin_products(
    database: DatabaseSession,
    _: AdminUser,
    category_id: int | None = Query(default=None, ge=1),
    search: str | None = Query(default=None, max_length=120),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> list[Product]:
    return service.list_products(
        database,
        category_id=category_id,
        search=search,
        offset=offset,
        limit=limit,
        include_inactive=True,
    )


@router.get("/products/{slug}", response_model=ProductRead)
def get_product(slug: str, database: DatabaseSession) -> Product:
    product = service.get_product_by_slug(database, slug)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def post_product(
    payload: ProductCreate, database: DatabaseSession, _: AdminUser
) -> Product:
    try:
        return service.create_product(database, payload)
    except (LookupError, ValueError) as error:
        _raise_service_error(error)


@router.patch("/products/{product_id}", response_model=ProductRead)
def patch_product(
    product_id: int,
    payload: ProductUpdate,
    database: DatabaseSession,
    _: AdminUser,
) -> Product:
    product = service.get_product(database, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        return service.update_product(database, product, payload)
    except (LookupError, ValueError) as error:
        _raise_service_error(error)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_product(product_id: int, database: DatabaseSession, _: AdminUser) -> None:
    product = service.get_product(database, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    service.delete_product(database, product)
