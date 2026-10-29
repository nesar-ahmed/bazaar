def register_user(client, email="shopper@example.com", password="correct-horse-42"):
    return client.post(
        "/api/v1/users/register",
        json={
            "email": email,
            "full_name": "  Bazaar Shopper  ",
            "password": password,
        },
    )


def login_user(client, email="shopper@example.com", password="correct-horse-42"):
    return client.post(
        "/api/v1/users/login",
        json={"email": email, "password": password},
    )


def test_register_user_returns_public_profile(client):
    response = register_user(client, email=" Shopper@Example.com ")

    assert response.status_code == 201
    assert response.json()["email"] == "shopper@example.com"
    assert response.json()["full_name"] == "Bazaar Shopper"
    assert response.json()["is_active"] is True
    assert "password" not in response.json()
    assert "hashed_password" not in response.json()


def test_duplicate_registration_is_rejected_case_insensitively(client):
    assert register_user(client).status_code == 201

    duplicate = register_user(client, email="SHOPPER@example.com")

    assert duplicate.status_code == 409


def test_user_can_login_read_and_update_own_profile(client):
    register_user(client)

    login_response = login_user(client)

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert login_response.json()["token_type"] == "bearer"
    assert login_response.json()["expires_in"] > 0

    headers = {"Authorization": f"Bearer {token}"}
    profile = client.get("/api/v1/users/me", headers=headers)
    updated_profile = client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"full_name": "Updated Shopper"},
    )

    assert profile.status_code == 200
    assert profile.json()["full_name"] == "Bazaar Shopper"
    assert updated_profile.status_code == 200
    assert updated_profile.json()["full_name"] == "Updated Shopper"
    assert "hashed_password" not in updated_profile.json()


def test_invalid_login_uses_generic_error(client):
    register_user(client)

    wrong_password = login_user(client, password="not-the-password")
    unknown_email = login_user(client, email="unknown@example.com")

    assert wrong_password.status_code == 401
    assert unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_profile_requires_valid_bearer_token(client):
    missing_token = client.get("/api/v1/users/me")
    invalid_token = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert missing_token.status_code == 401
    assert invalid_token.status_code == 401


def test_registration_rejects_invalid_email_and_short_password(client):
    invalid_email = client.post(
        "/api/v1/users/register",
        json={
            "email": "not-an-email",
            "full_name": "Shopper",
            "password": "correct-horse-42",
        },
    )
    short_password = client.post(
        "/api/v1/users/register",
        json={
            "email": "shopper@example.com",
            "full_name": "Shopper",
            "password": "short",
        },
    )

    assert invalid_email.status_code == 422
    assert short_password.status_code == 422
