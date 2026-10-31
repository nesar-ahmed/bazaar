from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.cart.models import Cart, CartItem
from app.catalog.models import Product
from app.orders.models import Order, OrderItem
from app.orders.schemas import OrderItemRead, OrderRead
from app.users.models import User

ORDER_TRANSITIONS = {
    "pending": {"processing", "cancelled"},
    "processing": {"shipped", "cancelled"},
    "shipped": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
}


def create_order(database: Session, user: User) -> Order:
    cart = database.scalar(
        select(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product))
        .where(Cart.user_id == user.id, Cart.status == "active")
        .with_for_update()
    )
    if cart is None or not cart.items:
        raise ValueError("Your cart is empty")

    order_items: list[OrderItem] = []
    subtotal_cents = 0
    for cart_item in cart.items:
        product = cart_item.product
        stock_update = database.execute(
            update(Product)
            .where(
                Product.id == product.id,
                Product.is_active.is_(True),
                Product.inventory_quantity >= cart_item.quantity,
            )
            .values(inventory_quantity=Product.inventory_quantity - cart_item.quantity)
        )
        if stock_update.rowcount != 1:
            database.rollback()
            raise ValueError(f"{product.name} is no longer available in that quantity")

        subtotal_cents += product.price_cents * cart_item.quantity
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_slug=product.slug,
                unit_price_cents=product.price_cents,
                quantity=cart_item.quantity,
            )
        )

    order = Order(
        user_id=user.id,
        cart_id=cart.id,
        status="pending",
        subtotal_cents=subtotal_cents,
        items=order_items,
    )
    cart.status = "ordered"
    try:
        database.add(order)
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ValueError("The cart could not be checked out; please try again") from error
    database.refresh(order)
    return get_order(database, order.id) or order


def list_orders(database: Session, user: User | None = None) -> list[Order]:
    statement = select(Order).options(selectinload(Order.items)).order_by(Order.id.desc())
    if user is not None:
        statement = statement.where(Order.user_id == user.id)
    return list(database.scalars(statement))


def get_order(database: Session, order_id: int) -> Order | None:
    return database.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )


def serialize_order(order: Order) -> OrderRead:
    return OrderRead(
        id=order.id,
        status=order.status,
        subtotal_cents=order.subtotal_cents,
        created_at=order.created_at,
        items=[
            OrderItemRead(
                product_id=item.product_id,
                product_name=item.product_name,
                product_slug=item.product_slug,
                unit_price_cents=item.unit_price_cents,
                quantity=item.quantity,
                line_total_cents=item.unit_price_cents * item.quantity,
            )
            for item in order.items
        ],
    )


def change_order_status(database: Session, order: Order, new_status: str) -> Order:
    old_status = order.status
    if new_status not in ORDER_TRANSITIONS[old_status]:
        raise ValueError(f"Order cannot transition from {old_status} to {new_status}")
    changed = database.execute(
        update(Order)
        .where(Order.id == order.id, Order.status == old_status)
        .values(status=new_status)
    )
    if changed.rowcount != 1:
        database.rollback()
        raise ValueError("The order status changed; reload the order and try again")
    if new_status == "cancelled":
        _restore_inventory(database, order)
    database.commit()
    return get_order(database, order.id) or order


def cancel_customer_order(database: Session, order: Order) -> Order:
    if order.status != "pending":
        raise ValueError("Only pending orders can be cancelled by the customer")
    return change_order_status(database, order, "cancelled")


def _restore_inventory(database: Session, order: Order) -> None:
    for item in order.items:
        database.execute(
            update(Product)
            .where(Product.id == item.product_id)
            .values(inventory_quantity=Product.inventory_quantity + item.quantity)
        )
