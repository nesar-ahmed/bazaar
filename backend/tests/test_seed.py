from sqlalchemy import func, select

from app.catalog.models import Category, Product
from app.seed import CATEGORIES, PRODUCTS, seed_catalog


def test_seed_catalog_adds_categories_and_products(client):
    from app.db.session import SessionLocal

    with SessionLocal() as database:
        created = seed_catalog(database)
        assert created == (len(CATEGORIES), len(PRODUCTS))
        assert database.scalar(select(func.count(Category.id))) == len(CATEGORIES)
        assert database.scalar(select(func.count(Product.id))) == len(PRODUCTS)


def test_seed_catalog_is_idempotent(client):
    from app.db.session import SessionLocal

    with SessionLocal() as database:
        assert seed_catalog(database) == (len(CATEGORIES), len(PRODUCTS))
        assert seed_catalog(database) == (0, 0)
        assert database.scalar(select(func.count(Category.id))) == len(CATEGORIES)
        assert database.scalar(select(func.count(Product.id))) == len(PRODUCTS)
