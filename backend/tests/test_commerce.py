from app.core.config import settings


def register(client, email="shopper@example.com"):
    return client.post(
        "/api/v1/users/register",
        json={
            "email": email,
            "full_name": "Bazaar Shopper",
            "password": "correct-horse-42",
        },
    )


def login(client, email="shopper@example.com", cart_token=None):
    headers = {"X-Cart-Token": cart_token} if cart_token else {}
    response = client.post(
        "/api/v1/users/login",
        json={"email": email, "password": "correct-horse-42"},
        headers=headers,
    )
    assert response.status_code == 200
    return response.json()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def make_admin(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", "admin@example.com")
    assert register(client, "admin@example.com").status_code == 201
    return login(client, "admin@example.com")["access_token"]


def create_product(client, admin_token, *, stock=10, slug="linen-shirt"):
    category_response = client.post(
        "/api/v1/categories",
        headers=auth_headers(admin_token),
        json={"name": "Clothing", "slug": "clothing"},
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]
    response = client.post(
        "/api/v1/products",
        headers=auth_headers(admin_token),
        json={
            "name": "Linen Shirt",
            "slug": slug,
            "price_cents": 2599,
            "inventory_quantity": stock,
            "category_id": category_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_refresh_rotation_replay_logout_and_password_change(client):
    assert register(client).status_code == 201
    tokens = login(client)
    first_access = auth_headers(tokens["access_token"])
    rotated = client.post(
        "/api/v1/users/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != tokens["refresh_token"]

    replay = client.post(
        "/api/v1/users/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert replay.status_code == 401
    assert client.get("/api/v1/users/me", headers=first_access).status_code == 401

    active_tokens = login(client)
    logged_out = client.post(
        "/api/v1/users/logout",
        headers=auth_headers(active_tokens["access_token"]),
    )
    assert logged_out.status_code == 204
    assert (
        client.post(
            "/api/v1/users/refresh",
            json={"refresh_token": active_tokens["refresh_token"]},
        ).status_code
        == 401
    )

    password_tokens = login(client)
    changed = client.post(
        "/api/v1/users/change-password",
        headers=auth_headers(password_tokens["access_token"]),
        json={
            "current_password": "correct-horse-42",
            "new_password": "another-correct-42",
        },
    )
    assert changed.status_code == 204
    assert (
        client.get(
            "/api/v1/users/me",
            headers=auth_headers(password_tokens["access_token"]),
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/users/login",
            json={
                "email": "shopper@example.com",
                "password": "another-correct-42",
            },
        ).status_code
        == 200
    )


def test_admin_only_catalog_management_and_public_browsing(client, monkeypatch):
    assert register(client).status_code == 201
    customer_token = login(client)["access_token"]
    forbidden = client.post(
        "/api/v1/categories",
        headers=auth_headers(customer_token),
        json={"name": "Clothing", "slug": "clothing"},
    )
    assert forbidden.status_code == 403

    admin_token = make_admin(client, monkeypatch)
    product = create_product(client, admin_token)
    listing = client.get("/api/v1/products")
    detail = client.get(f"/api/v1/products/{product['slug']}")
    assert listing.status_code == 200
    assert listing.json()[0]["id"] == product["id"]
    assert detail.json()["price_cents"] == 2599

    duplicate = client.post(
        "/api/v1/products",
        headers=auth_headers(admin_token),
        json={
            "name": "Different name",
            "slug": product["slug"],
            "price_cents": 100,
            "inventory_quantity": 1,
        },
    )
    assert duplicate.status_code == 409


def test_hidden_products_are_private_to_admin_catalog(client, monkeypatch):
    admin_token = make_admin(client, monkeypatch)
    product = create_product(client, admin_token)
    assert register(client).status_code == 201
    customer_token = login(client)["access_token"]

    hidden = client.delete(
        f"/api/v1/products/{product['id']}",
        headers=auth_headers(admin_token),
    )
    assert hidden.status_code == 204
    assert client.get("/api/v1/products").json() == []
    assert client.get("/api/v1/products/linen-shirt").status_code == 404
    assert client.get("/api/v1/admin/products").status_code == 401
    assert client.get(
        "/api/v1/admin/products",
        headers=auth_headers(customer_token),
    ).status_code == 403

    admin_products = client.get(
        "/api/v1/admin/products",
        headers=auth_headers(admin_token),
    )
    assert admin_products.status_code == 200
    assert admin_products.json()[0]["id"] == product["id"]
    assert admin_products.json()[0]["is_active"] is False


def test_guest_cart_merges_on_login_and_validates_stock(client, monkeypatch):
    admin_token = make_admin(client, monkeypatch)
    product = create_product(client, admin_token, stock=4)
    guest_cart = client.get("/api/v1/cart")
    assert guest_cart.status_code == 200
    cart_token = guest_cart.json()["cart_token"]
    added = client.post(
        "/api/v1/cart/items",
        headers={"X-Cart-Token": cart_token},
        json={"product_id": product["id"], "quantity": 3},
    )
    assert added.status_code == 200
    overstock = client.patch(
        f"/api/v1/cart/items/{product['id']}",
        headers={"X-Cart-Token": cart_token},
        json={"quantity": 5},
    )
    assert overstock.status_code == 409

    assert register(client).status_code == 201
    tokens = login(client, cart_token=cart_token)
    customer_cart = client.get(
        "/api/v1/cart",
        headers=auth_headers(tokens["access_token"]),
    )
    assert customer_cart.json()["items"][0]["quantity"] == 3
    assert tokens["cart_merge_warnings"] == []


def test_checkout_snapshots_stock_and_cancellation_restores_once(client, monkeypatch):
    admin_token = make_admin(client, monkeypatch)
    product = create_product(client, admin_token, stock=5)
    assert register(client).status_code == 201
    shopper_token = login(client)["access_token"]
    headers = auth_headers(shopper_token)
    assert client.post(
        "/api/v1/cart/items",
        headers=headers,
        json={"product_id": product["id"], "quantity": 2},
    ).status_code == 200

    checkout = client.post("/api/v1/orders", headers=headers)
    assert checkout.status_code == 201
    order = checkout.json()
    assert order["status"] == "pending"
    assert order["subtotal_cents"] == 5198
    assert order["items"][0]["product_name"] == "Linen Shirt"
    current_product = client.get(f"/api/v1/products/{product['slug']}").json()
    assert current_product["inventory_quantity"] == 3

    cancelled = client.post(f"/api/v1/orders/{order['id']}/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert client.post(
        f"/api/v1/orders/{order['id']}/cancel", headers=headers
    ).status_code == 409
    current_product = client.get(f"/api/v1/products/{product['slug']}").json()
    assert current_product["inventory_quantity"] == 5


def test_orders_are_private_and_admin_can_advance_status(client, monkeypatch):
    admin_token = make_admin(client, monkeypatch)
    product = create_product(client, admin_token)
    assert register(client).status_code == 201
    shopper_token = login(client)["access_token"]
    shopper_headers = auth_headers(shopper_token)
    client.post(
        "/api/v1/cart/items",
        headers=shopper_headers,
        json={"product_id": product["id"], "quantity": 1},
    )
    order = client.post("/api/v1/orders", headers=shopper_headers).json()

    assert register(client, "other@example.com").status_code == 201
    other_token = login(client, "other@example.com")["access_token"]
    assert client.get(
        f"/api/v1/orders/{order['id']}",
        headers=auth_headers(other_token),
    ).status_code == 404

    changed = client.patch(
        f"/api/v1/admin/orders/{order['id']}/status",
        headers=auth_headers(admin_token),
        json={"status": "processing"},
    )
    assert changed.status_code == 200
    assert changed.json()["status"] == "processing"


def test_checkout_rolls_back_when_stock_changes_after_cart_add(client, monkeypatch):
    admin_token = make_admin(client, monkeypatch)
    product = create_product(client, admin_token, stock=5)
    assert register(client).status_code == 201
    shopper_headers = auth_headers(login(client)["access_token"])
    added = client.post(
        "/api/v1/cart/items",
        headers=shopper_headers,
        json={"product_id": product["id"], "quantity": 2},
    )
    assert added.status_code == 200

    updated = client.patch(
        f"/api/v1/products/{product['id']}",
        headers=auth_headers(admin_token),
        json={"inventory_quantity": 1},
    )
    assert updated.status_code == 200
    failed_checkout = client.post("/api/v1/orders", headers=shopper_headers)
    assert failed_checkout.status_code == 409
    assert client.get(
        f"/api/v1/products/{product['slug']}"
    ).json()["inventory_quantity"] == 1
    assert client.get(
        "/api/v1/orders", headers=shopper_headers
    ).json() == []
