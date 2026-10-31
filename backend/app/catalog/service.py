from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.models import Category, Product
from app.catalog.schemas import CategoryCreate, CategoryUpdate, ProductCreate, ProductUpdate


def list_categories(database: Session) -> list[Category]:
    return list(database.scalars(select(Category).order_by(Category.name)))


def get_category(database: Session, category_id: int) -> Category | None:
    return database.get(Category, category_id)


def create_category(database: Session, payload: CategoryCreate) -> Category:
    category = Category(**payload.model_dump())
    database.add(category)
    return _commit(database, category)


def update_category(
    database: Session, category: Category, payload: CategoryUpdate
) -> Category:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, value)
    return _commit(database, category)


def delete_category(database: Session, category: Category) -> None:
    if database.scalar(select(func.count(Product.id)).where(Product.category_id == category.id)):
        raise ValueError("Move or remove this category's products before deleting it")
    database.delete(category)
    _commit(database)


def list_products(
    database: Session,
    *,
    category_id: int | None,
    search: str | None,
    offset: int,
    limit: int,
    include_inactive: bool = False,
) -> list[Product]:
    statement = select(Product).order_by(Product.id.desc()).offset(offset).limit(limit)
    if not include_inactive:
        statement = statement.where(Product.is_active.is_(True))
    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(Product.name.ilike(term), Product.description.ilike(term))
        )
    return list(database.scalars(statement))


def get_product_by_slug(database: Session, slug: str) -> Product | None:
    return database.scalar(
        select(Product).where(Product.slug == slug, Product.is_active.is_(True))
    )


def get_product(database: Session, product_id: int) -> Product | None:
    return database.get(Product, product_id)


def create_product(database: Session, payload: ProductCreate) -> Product:
    if payload.category_id is not None and database.get(Category, payload.category_id) is None:
        raise LookupError("Category not found")
    return _commit(database, Product(**payload.model_dump()))


def update_product(
    database: Session, product: Product, payload: ProductUpdate
) -> Product:
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("category_id") is not None and database.get(Category, changes["category_id"]) is None:
        raise LookupError("Category not found")
    for key, value in changes.items():
        setattr(product, key, value)
    return _commit(database, product)


def delete_product(database: Session, product: Product) -> None:
    product.is_active = False
    _commit(database, product)


def _commit(database: Session, entity=None):
    if entity is not None:
        database.add(entity)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ValueError("A category or product with that name or slug already exists") from error
    if entity is not None:
        database.refresh(entity)
    return entity
