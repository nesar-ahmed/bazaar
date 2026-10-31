import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.cart.models import Cart, CartItem
from app.cart.schemas import CartLineRead, CartRead
from app.catalog.models import Product
from app.users.models import User
from app.users.security import hash_refresh_token


def get_or_create_cart(
    database: Session,
    user: User | None,
    guest_token: str | None,
) -> tuple[Cart, str | None]:
    if user is not None:
        cart = database.scalar(
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
            .where(Cart.user_id == user.id, Cart.status == "active")
        )
        if cart is not None:
            return cart, None
        cart = Cart(user_id=user.id)
        database.add(cart)
        database.commit()
        database.refresh(cart)
        return _load_cart(database, cart.id), None

    raw_token = None
    cart = None
    if guest_token:
        cart = database.scalar(
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
            .where(
                Cart.guest_token_hash == hash_refresh_token(guest_token),
                Cart.status == "active",
                Cart.user_id.is_(None),
            )
        )
    if cart is None:
        raw_token = secrets.token_urlsafe(32)
        cart = Cart(guest_token_hash=hash_refresh_token(raw_token))
        database.add(cart)
        database.commit()
        database.refresh(cart)
        cart = _load_cart(database, cart.id)
    return cart, raw_token


def serialize_cart(
    cart: Cart,
    cart_token: str | None = None,
    warnings: list[str] | None = None,
) -> CartRead:
    lines = [
        CartLineRead(
            product_id=item.product_id,
            product_name=item.product.name,
            product_slug=item.product.slug,
            image_url=item.product.image_url,
            unit_price_cents=item.product.price_cents,
            quantity=item.quantity,
            line_total_cents=item.quantity * item.product.price_cents,
        )
        for item in cart.items
    ]
    return CartRead(
        id=cart.id,
        items=lines,
        subtotal_cents=sum(item.line_total_cents for item in lines),
        cart_token=cart_token,
        warnings=warnings or [],
    )


def add_item(
    database: Session,
    cart: Cart,
    product_id: int,
    quantity: int,
) -> Cart:
    product = database.get(Product, product_id)
    if product is None or not product.is_active:
        raise LookupError("Product not found")
    item = database.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.id, CartItem.product_id == product_id
        )
    )
    next_quantity = quantity + (item.quantity if item else 0)
    if next_quantity > product.inventory_quantity:
        raise ValueError("Requested quantity exceeds available inventory")
    if next_quantity > 99:
        raise ValueError("A maximum of 99 units per product can be added")
    if item is None:
        database.add(CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity))
    else:
        item.quantity = next_quantity
    database.commit()
    return _load_cart(database, cart.id)


def update_item(
    database: Session, cart: Cart, product_id: int, quantity: int
) -> Cart:
    item = database.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.id, CartItem.product_id == product_id
        )
    )
    if item is None:
        raise LookupError("Cart item not found")
    product = database.get(Product, product_id)
    if product is None or not product.is_active:
        raise LookupError("Product not found")
    if quantity > product.inventory_quantity:
        raise ValueError("Requested quantity exceeds available inventory")
    item.quantity = quantity
    database.commit()
    return _load_cart(database, cart.id)


def remove_item(database: Session, cart: Cart, product_id: int) -> Cart:
    item = database.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.id, CartItem.product_id == product_id
        )
    )
    if item is None:
        raise LookupError("Cart item not found")
    database.delete(item)
    database.commit()
    return _load_cart(database, cart.id)


def merge_guest_cart(database: Session, user: User, guest_token: str) -> list[str]:
    guest_cart = database.scalar(
        select(Cart)
        .options(selectinload(Cart.items))
        .where(
            Cart.guest_token_hash == hash_refresh_token(guest_token),
            Cart.user_id.is_(None),
            Cart.status == "active",
        )
    )
    if guest_cart is None:
        return ["Your guest cart could not be found; please review your cart."]

    customer_cart = database.scalar(
        select(Cart)
        .options(selectinload(Cart.items))
        .where(Cart.user_id == user.id, Cart.status == "active")
    )
    if customer_cart is None:
        guest_cart.user_id = user.id
        guest_cart.guest_token_hash = None
        database.commit()
        return []

    warnings: list[str] = []
    for guest_item in list(guest_cart.items):
        product = database.get(Product, guest_item.product_id)
        target_item = next(
            (
                item
                for item in customer_cart.items
                if item.product_id == guest_item.product_id
            ),
            None,
        )
        if product is None or not product.is_active:
            warnings.append(f"{guest_item.product_id}: product is no longer available")
            database.delete(guest_item)
            continue

        wanted = guest_item.quantity + (target_item.quantity if target_item else 0)
        available = product.inventory_quantity
        merged_quantity = min(wanted, available, 99)
        if merged_quantity < wanted:
            warnings.append(f"{product.name}: quantity adjusted to available stock")
        if merged_quantity == 0:
            if target_item is not None:
                database.delete(target_item)
        elif target_item is None:
            customer_cart.items.append(
                CartItem(
                    product_id=product.id,
                    quantity=merged_quantity,
                )
            )
        else:
            target_item.quantity = merged_quantity
        database.delete(guest_item)

    guest_cart.status = "merged"
    guest_cart.guest_token_hash = None
    database.commit()
    return warnings


def _load_cart(database: Session, cart_id: int) -> Cart:
    cart = database.scalar(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product))
        .where(Cart.id == cart_id)
    )
    if cart is None:
        raise LookupError("Cart not found")
    return cart
