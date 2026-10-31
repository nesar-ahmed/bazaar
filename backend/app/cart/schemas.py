from pydantic import BaseModel, Field


class CartItemInput(BaseModel):
    product_id: int = Field(ge=1)
    quantity: int = Field(ge=1, le=99)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartLineRead(BaseModel):
    product_id: int
    product_name: str
    product_slug: str
    image_url: str | None
    unit_price_cents: int
    quantity: int
    line_total_cents: int


class CartRead(BaseModel):
    id: int
    items: list[CartLineRead]
    subtotal_cents: int
    cart_token: str | None = None
    warnings: list[str] = Field(default_factory=list)
