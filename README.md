# Bazaar

Bazaar is an ecommerce monorepo with a Next.js storefront and a FastAPI
backend. The backend currently provides authentication, role-protected
catalog management, guest and customer carts, inventory-aware checkout, and
order management. Payment processing is not integrated; orders remain pending
until an administrator updates their status.

The frontend and backend are independent applications. Install, run, test, and
manage their dependencies from their respective directories; there is no root
npm workspace.

## Technology

- **Frontend:** Next.js App Router, React, TypeScript, npm
- **Backend:** FastAPI, SQLAlchemy, Pydantic, SQLite, Alembic
- **Python environment and dependencies:** uv

## Requirements

- Node.js 20.9 or newer (Node.js 24 LTS recommended)
- npm
- Python 3.10 or newer
- [uv](https://docs.astral.sh/uv/)

## Setup

Install frontend dependencies:

```bash
cd frontend
npm ci
```

In another terminal, install backend dependencies, configure the local
environment, and apply database migrations:

```bash
cd backend
uv sync
cp -n .env.example .env
# Set JWT_SECRET_KEY in .env to a random value of at least 32 characters.
uv run alembic upgrade head
```

`npm ci` and `uv sync` install the exact versions recorded in the lockfiles.
The `cp -n` command creates a local `.env` only if one does not already exist.
Optionally copy `frontend/.env.example` to `frontend/.env.local` to configure
the backend URL used by the Next.js server.

## Run locally

Start the API:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Start the storefront in another terminal:

```bash
cd frontend
npm run dev
```

The storefront is at <http://localhost:3000>. The API is at
<http://localhost:8000>, and interactive API documentation is at
<http://localhost:8000/docs>.

The home route (`/`) is a product-independent landing page. Use **Discover** to
open `/discover`, where the catalog is searchable, filterable, and paginated by
category.

The backend loads `backend/.env`; exported environment variables take
precedence. SQLite defaults to `backend/bazaar.db`. `JWT_SECRET_KEY` must have
at least 32 characters. `ACCESS_TOKEN_EXPIRE_MINUTES` defaults to 30,
`REFRESH_TOKEN_EXPIRE_DAYS` to 30, and `AUTH_SESSION_EXPIRE_DAYS` to 90.
`DATABASE_URL` can override the database URL. `ADMIN_EMAIL` is optional: when
set, a matching account is granted the admin role at registration or startup.
Keep `backend/.env` private; it is ignored by Git.

## Backend behavior

- Access tokens are signed JWTs. Refresh tokens are opaque, stored only as
  hashes, rotate on use, and revoke the session if a previously consumed token
  is replayed. Logging out revokes the current session; changing a password
  revokes all of the user's sessions.
- New accounts are customers unless their email matches `ADMIN_EMAIL`.
  There is no self-service role promotion.
- Categories and active products are publicly readable. Admins can also list
  hidden products; only admins can create, update, or remove catalog records.
  Product removal hides the product without deleting its record.
- Guests can use carts identified by a random `X-Cart-Token`. The initial
  `GET /api/v1/cart` response returns the token in `cart_token`; retain it and
  send it on later guest-cart requests. Sending it with login merges the guest
  cart into the customer's active cart. Carts do not reserve inventory.
- Checkout requires an authenticated user. It snapshots product names and
  prices and decrements stock transactionally. Customer cancellation of a
  pending order restores stock. Admins can advance or cancel orders.
- Order totals currently include item subtotals only; payment, tax, shipping,
  addresses, and payment-provider callbacks are not implemented.

The browser authentication UI uses Next.js route handlers to call the backend
server-to-server and stores access and refresh tokens in HttpOnly cookies. The
frontend BFF rotates refresh tokens when access expires and retries the
original request. `API_URL` configures the backend base URL (default
`http://localhost:8000`). For deployments behind a reverse proxy, set
`APP_ORIGIN` to the exact public frontend origin for request-origin validation.

## API

The health endpoint is `GET /health`; all other API routes use the
`/api/v1` prefix. Interactive documentation is available at `/docs`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Check API liveness |
| `POST` | `/api/v1/users/register` | Public | Register a customer (or the configured admin email) |
| `POST` | `/api/v1/users/login` | Public | Sign in and receive access/refresh tokens |
| `POST` | `/api/v1/users/refresh` | Public | Rotate a refresh token |
| `POST` | `/api/v1/users/logout` | Authenticated | Revoke the current session |
| `GET`, `PATCH` | `/api/v1/users/me` | Authenticated | Read or update the current profile |
| `POST` | `/api/v1/users/change-password` | Authenticated | Change password and revoke all sessions |
| `GET` | `/api/v1/categories` | Public | List categories |
| `POST` | `/api/v1/categories` | Admin | Create a category |
| `PATCH`, `DELETE` | `/api/v1/categories/{category_id}` | Admin | Update or delete a category; deletion is blocked while it has products |
| `GET` | `/api/v1/products` | Public | Browse active products; supports `category_id`, `search`, `offset`, and `limit` |
| `GET` | `/api/v1/products/{slug}` | Public | Read an active product |
| `POST` | `/api/v1/products` | Admin | Create a product |
| `GET` | `/api/v1/admin/products` | Admin | List products, including hidden products; supports the same filters and pagination |
| `PATCH`, `DELETE` | `/api/v1/products/{product_id}` | Admin | Update a product or hide it from public listings |
| `GET` | `/api/v1/cart` | Public or authenticated | Read the active guest or customer cart |
| `POST` | `/api/v1/cart/items` | Public or authenticated | Add a product to the cart |
| `PATCH`, `DELETE` | `/api/v1/cart/items/{product_id}` | Public or authenticated | Change quantity or remove a cart item |
| `POST` | `/api/v1/orders` | Authenticated | Check out the active cart and reserve inventory |
| `GET` | `/api/v1/orders` | Authenticated | List the current user's orders |
| `GET` | `/api/v1/orders/{order_id}` | Owner or admin | Read an order |
| `POST` | `/api/v1/orders/{order_id}/cancel` | Owner or admin | Cancel a pending order and restore inventory |
| `GET` | `/api/v1/admin/orders` | Admin | List all orders |
| `PATCH` | `/api/v1/admin/orders/{order_id}/status` | Admin | Advance or cancel an order |

Protected endpoints require `Authorization: Bearer <access-token>`. Cart
endpoints accept an optional `X-Cart-Token` for guest carts.

## Database migrations

Apply migrations from `backend/` after syncing dependencies:

```bash
uv run alembic upgrade head
```

The included migration creates the commerce/auth tables and adds the customer
role to the existing `users` table. Existing user rows are retained and get
the `customer` role. New schema changes should be made with Alembic revisions;
the application does not mutate the database schema automatically at startup.

To add sample catalog data for local API and storefront testing, run:

```bash
cd backend
uv run python -m app.seed
```

The seed command adds three categories and eight products with prices,
inventory, descriptions, and sample image URLs. It is safe to rerun: records
are matched by slug, and existing categories/products are left unchanged.
Seeding is an explicit command and does not run during app startup. Use it with
a local development database, not production. Open the storefront at
<http://localhost:3000> to browse the sample catalog.

## Project layout

```text
.
├── backend/
│   ├── app/
│   │   ├── api/          # API router composition
│   │   ├── cart/         # Guest/customer carts
│   │   ├── catalog/      # Categories and products
│   │   ├── core/         # Configuration
│   │   ├── db/           # SQLAlchemy base, engine, and model registry
│   │   ├── health/       # Health endpoint
│   │   ├── orders/       # Checkout and order lifecycle
│   │   ├── users/        # Authentication, sessions, profiles, roles
│   │   └── seed.py       # Explicit local catalog seed command
│   ├── migrations/       # Alembic migration environment and revisions
│   ├── alembic.ini
│   ├── tests/
│   ├── .env.example
│   ├── pyproject.toml
│   └── uv.lock
└── frontend/
    ├── app/
    ├── lib/
    ├── .env.example
    ├── package.json
    └── package-lock.json
```

## Development checks

Run backend tests from `backend/`:

```bash
uv run pytest
```

Run frontend lint and production build from `frontend/`:

```bash
npm run lint
npm run build
```
