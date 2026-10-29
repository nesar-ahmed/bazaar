# Bazaar

Bazaar is an early-stage ecommerce monorepo containing a Next.js storefront
and a modular FastAPI backend. The backend currently provides health and
foundational user registration/authentication/profile APIs. Catalog browsing,
carts, checkout, payments, inventory management, and admin/user panels are
not yet implemented.

This document describes the current code, how to run it, and conventions for
extending it. Treat the source code and dependency lockfiles as authoritative
if this document and implementation ever differ.

## Technology

- **Frontend:** Next.js App Router, React, TypeScript, npm
- **Backend:** FastAPI, SQLAlchemy, Pydantic, JWT bearer authentication
- **Python environment and dependencies:** uv

The frontend and backend are independent applications. Install, run, test, and
manage their dependencies from their respective directories; there is no root
npm workspace.

## Requirements

- Node.js 20.9 or newer (Node.js 24 LTS recommended)
- npm
- Python 3.10 or newer
- [uv](https://docs.astral.sh/uv/)

## Setup

Install dependencies separately:

```bash
cd frontend
npm ci
```

In another terminal:

```bash
cd backend
uv sync
cp -n .env.example .env
```

`npm ci` installs the exact frontend dependencies from `frontend/package-lock.json`.
`uv sync` creates/updates the backend virtual environment from `backend/uv.lock`.
The `cp -n` command creates a local `.env` only if one does not already exist.
Optionally copy `frontend/.env.example` to `frontend/.env.local` to configure the
backend URL used by the Next.js server.

## Run locally

Start the API in one terminal:

```bash
cd backend
openssl rand -hex 32
# Set JWT_SECRET_KEY in backend/.env to the generated value.
uv run uvicorn app.main:app --reload
```

Start the storefront in another terminal:

```bash
cd frontend
npm run dev
```

The storefront is at <http://localhost:3000>. The API is at
<http://localhost:8000>, and its interactive OpenAPI documentation is at
<http://localhost:8000/docs>.

The browser authentication UI is available at `/login`, `/register`, and
`/account`. Browser requests go to Next.js route handlers, which call the
FastAPI user endpoints server-to-server. The API access token is stored in an
HttpOnly, SameSite=Lax cookie; it is not exposed to browser JavaScript.
`API_URL` configures the backend base URL (default `http://localhost:8000`).
For deployments behind a reverse proxy, set `APP_ORIGIN` to the exact public
frontend origin so mutating BFF routes can validate request origins reliably.
The cookie lifetime matches the current access-token lifetime; refresh tokens
and persistent sessions are not implemented yet.

The backend loads configuration from `backend/.env`; exported environment
variables take precedence over values in the file. `backend/.env.example`
documents the available settings. SQLite is the default and creates
`backend/bazaar.db` on startup. `JWT_SECRET_KEY` must contain at least 32
characters. `ACCESS_TOKEN_EXPIRE_MINUTES` sets the access-token lifetime
(default: 30 minutes), and `DATABASE_URL` can override the database URL.
Keep `backend/.env` private; it is ignored by Git.

The storefront is currently a UI starting point and attempts to fetch products
from `http://localhost:8000/api/products`. Since the backend does not yet have
catalog endpoints, it displays a notice that the catalog API is not implemented.

## Project layout

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, lifespan, router registration
│   │   ├── api/
│   │   │   └── router.py           # Combines feature routers
│   │   ├── core/
│   │   │   └── config.py           # Database and JWT settings
│   │   ├── db/
│   │   │   ├── base.py             # SQLAlchemy declarative base
│   │   │   └── session.py          # Engine, sessions, DB dependency
│   │   ├── health/
│   │   │   └── routes.py           # Health endpoint
│   │   └── users/
│   │       ├── routes.py           # Registration, login, current profile
│   │       ├── schemas.py          # User request/response types
│   │       ├── models.py           # User persistence model
│   │       ├── service.py          # User registration/profile operations
│   │       └── security.py         # Password hashing and JWT helpers
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_config.py
│   │   ├── test_health.py
│   │   └── test_users.py
│   ├── .env.example                 # Local configuration template (safe to commit)
│   ├── pyproject.toml              # Python project and dependency config
│   └── uv.lock                     # Locked Python dependency versions
└── frontend/
    ├── app/
    │   ├── page.tsx                # Storefront/catalog page
    │   ├── layout.tsx              # Root layout and metadata
    │   └── globals.css             # Global storefront styles
    │   ├── login/page.tsx          # Sign-in page
    │   ├── register/page.tsx       # Account creation page
    │   ├── account/page.tsx        # Authenticated profile panel
    │   ├── api/auth/               # BFF login, registration, logout routes
    │   ├── api/profile/            # BFF profile read/update routes
    │   └── components/             # Shared site and form components
    ├── lib/                        # Server-side auth/API helpers
    ├── .env.example                # Frontend environment template
    ├── AGENTS.md                   # Next.js-generated agent guidance
    ├── package.json                # Frontend scripts and dependencies
    └── package-lock.json           # Locked frontend dependency versions
```

## Backend architecture

Feature code lives directly under `backend/app/`. Each feature owns its
related routes, schemas, models, and service logic. The `users/` feature
implements account registration and current-user profile operations; add
future `catalog/`, `carts/`, `orders/`, `payments/`, or `notifications/`
packages alongside it. Avoid a generic `modules/` wrapper or global folders
that scatter feature files.

Responsibilities:

- `main.py` creates the FastAPI application and registers the API router.
- `api/router.py` composes feature routers into the application.
- A feature's `routes.py` handles HTTP details and delegates business work.
- A feature's `service.py` contains its business operations and queries.
- A feature's `schemas.py` defines validated API input/output shapes.
- A feature's `models.py` defines its SQLAlchemy persistence entities.
- `core/` and `db/` contain shared configuration and persistence setup.

Keep modules focused and avoid adding layers such as repositories or handlers
unless they solve a concrete need. Add tests under `backend/tests/` for new
behavior.

The backend currently creates missing tables with SQLAlchemy `create_all()`
during startup. This is suitable only for the current development foundation;
add a migration workflow before managing production schema changes.

## Current API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Basic API health response |
| `POST` | `/api/v1/users/register` | Register with email, full name, and password |
| `POST` | `/api/v1/users/login` | Exchange email/password for a bearer JWT |
| `GET` | `/api/v1/users/me` | Read the authenticated user's profile |
| `PATCH` | `/api/v1/users/me` | Update the authenticated user's full name |

Passwords are hashed with Argon2 and are never included in user responses.
Registration normalizes email addresses and rejects duplicates. Invalid login
attempts use the same response whether the email is unknown or the password is
incorrect. Protected endpoints require `Authorization: Bearer <token>`.

Email verification, password reset, roles/permissions, refresh tokens, and
administrative user management are not implemented yet. Before production,
also add rate limiting for login/registration, security monitoring, and
database migrations.

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

When adding a backend dependency, update the project with uv from `backend/`
and keep `uv.lock` checked in. When changing frontend dependencies, run npm in
`frontend/` and commit the updated `package-lock.json`.
