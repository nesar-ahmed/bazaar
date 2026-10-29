# Bazaar

Bazaar is an early-stage ecommerce monorepo containing a Next.js storefront
and a FastAPI backend. The backend currently exposes only a health endpoint;
catalog browsing, carts, checkout, payments, inventory management,
authentication, and admin/user panels are not implemented.

This document describes the current code, how to run it, and conventions for
extending it. Treat the source code and dependency lockfiles as authoritative
if this document and implementation ever differ.

## Technology

- **Frontend:** Next.js App Router, React, TypeScript, npm
- **Backend:** FastAPI, Python
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
```

`npm ci` installs the exact frontend dependencies from `frontend/package-lock.json`.
`uv sync` creates/updates the backend virtual environment from `backend/uv.lock`.

## Run locally

Start the API in one terminal:

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
<http://localhost:8000>, and its interactive OpenAPI documentation is at
<http://localhost:8000/docs>.

The storefront is currently a UI starting point and attempts to fetch products
from `http://localhost:8000/api/products`. Since the backend only has a health
endpoint, the storefront displays a notice that the backend catalog API is not
implemented yet.

## Project layout

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, lifespan, router registration
│   │   ├── api/
│   │   │   └── router.py           # Combines feature routers
│   │   └── health/
│   │       └── routes.py           # Health endpoint
│   ├── tests/
│   │   └── test_health.py
│   ├── pyproject.toml              # Python project and dependency config
│   └── uv.lock                     # Locked Python dependency versions
└── frontend/
    ├── app/
    │   ├── page.tsx                # Storefront/catalog page
    │   ├── layout.tsx              # Root layout and metadata
    │   └── globals.css             # Global storefront styles
    ├── package.json                # Frontend scripts and dependencies
    └── package-lock.json           # Locked frontend dependency versions
```

## Backend architecture

Feature code lives directly under `backend/app/`. The backend currently has
only the `health/` feature. As ecommerce functionality is added, create feature
packages such as `catalog/`, `users/`, `carts/`, `orders/`, `payments/`, or
`notifications/` directly under `app/`, with each feature owning its related
routes, schemas, models, and service logic. Avoid a generic `modules/` wrapper
or global folders that scatter feature files.

Responsibilities:

- `main.py` creates the FastAPI application and registers the API router.
- `api/router.py` composes feature routers into the application.
- A feature's `routes.py` handles HTTP details and delegates business work.
- A feature's `service.py` contains its business operations and queries.
- A feature's `schemas.py` defines validated API input/output shapes.
- A feature's `models.py` defines its SQLAlchemy persistence entities.

Keep modules focused and avoid adding layers such as repositories or handlers
unless they solve a concrete need. Add tests under `backend/tests/` for new
behavior.

The backend currently has no database integration. Add shared database setup
when persistence is introduced, and use migrations to manage schema evolution.

## Current API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Basic API health response |

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
