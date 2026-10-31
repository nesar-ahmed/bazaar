from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    slug: str = Field(min_length=1, max_length=200, pattern=SLUG_PATTERN)
    description: str | None = None
    price_cents: int = Field(ge=0)
    inventory_quantity: int = Field(ge=0)
    image_url: str | None = Field(default=None, max_length=500)
    category_id: int | None = Field(default=None, ge=1)

    @field_validator("name", "slug")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This value cannot be blank")
        return value


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    slug: str | None = Field(default=None, min_length=1, max_length=200, pattern=SLUG_PATTERN)
    description: str | None = None
    price_cents: int | None = Field(default=None, ge=0)
    inventory_quantity: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=500)
    category_id: int | None = Field(default=None, ge=1)
    is_active: bool | None = None

    @field_validator("name", "slug")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("This value cannot be blank")
        return value


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
    price_cents: int
    inventory_quantity: int
    image_url: str | None
    category_id: int | None
    is_active: bool
    created_at: datetime


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=140, pattern=SLUG_PATTERN)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name", "slug")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This value cannot be blank")
        return value


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=140, pattern=SLUG_PATTERN)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name", "slug")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("This value cannot be blank")
        return value


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
