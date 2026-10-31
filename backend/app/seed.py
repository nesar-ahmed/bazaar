from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.catalog.models import Category, Product
from app.db.session import SessionLocal


@dataclass(frozen=True)
class CategorySeed:
    name: str
    slug: str
    description: str


@dataclass(frozen=True)
class ProductSeed:
    name: str
    slug: str
    description: str
    price_cents: int
    inventory_quantity: int
    image_url: str
    category_slug: str


CATEGORIES = (
    CategorySeed(
        name="Home & Living",
        slug="home-living",
        description="Thoughtful details for a calmer, more considered home.",
    ),
    CategorySeed(
        name="Clothing",
        slug="clothing",
        description="Easy-to-wear pieces made for everyday routines.",
    ),
    CategorySeed(
        name="Accessories",
        slug="accessories",
        description="Small finishing touches with lasting usefulness.",
    ),
)

PRODUCTS = (
    ProductSeed(
        name="Hand-thrown Ceramic Vase",
        slug="hand-thrown-ceramic-vase",
        description="A softly sculpted stoneware vase with a tactile matte glaze.",
        price_cents=4200,
        inventory_quantity=18,
        image_url="https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85",
        category_slug="home-living",
    ),
    ProductSeed(
        name="Linen Cushion Cover",
        slug="linen-cushion-cover",
        description="A breathable, natural linen cover in a warm oat shade.",
        price_cents=3200,
        inventory_quantity=24,
        image_url="https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=85",
        category_slug="home-living",
    ),
    ProductSeed(
        name="Everyday Stoneware Mug",
        slug="everyday-stoneware-mug",
        description="A comfortable, handmade mug for the first or fifth cup.",
        price_cents=1800,
        inventory_quantity=32,
        image_url="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85",
        category_slug="home-living",
    ),
    ProductSeed(
        name="Woven Market Tote",
        slug="woven-market-tote",
        description="A roomy, reusable carry-all for market days and everyday errands.",
        price_cents=3600,
        inventory_quantity=15,
        image_url="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
        category_slug="accessories",
    ),
    ProductSeed(
        name="Soft Cotton Overshirt",
        slug="soft-cotton-overshirt",
        description="An easy layer in brushed cotton with a relaxed, timeless fit.",
        price_cents=6800,
        inventory_quantity=12,
        image_url="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85",
        category_slug="clothing",
    ),
    ProductSeed(
        name="Canvas Everyday Cap",
        slug="canvas-everyday-cap",
        description="A simple cotton canvas cap with an adjustable back strap.",
        price_cents=2400,
        inventory_quantity=20,
        image_url="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85",
        category_slug="accessories",
    ),
    ProductSeed(
        name="Botanical Notebook",
        slug="botanical-notebook",
        description="A cloth-bound notebook for lists, sketches, and passing thoughts.",
        price_cents=1600,
        inventory_quantity=40,
        image_url="https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85",
        category_slug="accessories",
    ),
    ProductSeed(
        name="Relaxed Cotton Tee",
        slug="relaxed-cotton-tee",
        description="A soft everyday tee in midweight cotton with a relaxed silhouette.",
        price_cents=2900,
        inventory_quantity=22,
        image_url="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
        category_slug="clothing",
    ),
)


def seed_catalog(database: Session) -> tuple[int, int]:
    categories_by_slug: dict[str, Category] = {}
    created_categories = 0
    created_products = 0

    for seed in CATEGORIES:
        category = database.scalar(
            select(Category).where(Category.slug == seed.slug)
        )
        if category is None:
            category = Category(
                name=seed.name,
                slug=seed.slug,
                description=seed.description,
            )
            database.add(category)
            created_categories += 1
        categories_by_slug[seed.slug] = category

    database.flush()
    for seed in PRODUCTS:
        product = database.scalar(select(Product).where(Product.slug == seed.slug))
        if product is not None:
            continue
        category = categories_by_slug[seed.category_slug]
        database.add(
            Product(
                name=seed.name,
                slug=seed.slug,
                description=seed.description,
                price_cents=seed.price_cents,
                inventory_quantity=seed.inventory_quantity,
                image_url=seed.image_url,
                category_id=category.id,
            )
        )
        created_products += 1

    database.commit()
    return created_categories, created_products


def main() -> None:
    with SessionLocal() as database:
        categories, products = seed_catalog(database)
    print(
        "Catalog seed complete: "
        f"{categories} categories and {products} products added "
        f"({len(CATEGORIES)} categories and {len(PRODUCTS)} products in the sample set)."
    )


if __name__ == "__main__":
    main()
