from datetime import datetime

from pydantic import BaseModel, Field


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(processing|shipped|delivered|cancelled)$")


class OrderItemRead(BaseModel):
    product_id: int
    product_name: str
    product_slug: str
    unit_price_cents: int
    quantity: int
    line_total_cents: int


class OrderRead(BaseModel):
    id: int
    status: str
    subtotal_cents: int
    created_at: datetime
    items: list[OrderItemRead]
