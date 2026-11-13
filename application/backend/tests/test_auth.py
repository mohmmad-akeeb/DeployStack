from fastapi.testclient import TestClient


def test_user_registration_success(client: TestClient) -> None:
    """Verify standard user registration succeeds with 201 Created."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alex@deploystack.local",
            "password": "SecureP@ssw0rd!",
            "full_name": "Alex Developer",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alex@deploystack.local"
    assert data["full_name"] == "Alex Developer"
    assert data["is_active"] is True
    assert data["is_superuser"] is False
    assert "id" in data
    assert "hashed_password" not in data
    assert "password" not in data


def test_user_registration_duplicate_email(client: TestClient) -> None:
    """Verify attempting to register an existing email returns 409 Conflict."""
    # First registration
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "alex@deploystack.local",
            "password": "SecureP@ssw0rd!",
            "full_name": "Alex Developer",
        },
    )

    # Duplicate registration
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alex@deploystack.local",
            "password": "AnotherSecure1!",
            "full_name": "Alex Impostor",
        },
    )
    assert response.status_code == 409
    data = response.json()
    assert data["status_code"] == 409
    assert data["error"] == "Conflict"
    assert "already registered" in data["message"]


def test_user_registration_weak_password(client: TestClient) -> None:
    """Verify registration fails with 400 Bad Request on weak password."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@deploystack.local",
            "password": "weak",
            "full_name": "Weak Password User",
        },
    )
    assert response.status_code == 400
    data = response.json()
    assert data["status_code"] == 400
    assert data["error"] == "Bad Request"


def test_user_registration_invalid_email(client: TestClient) -> None:
    """Verify registration fails with 422 on invalid email format."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-an-email",
            "password": "SecureP@ssw0rd!",
            "full_name": "Invalid Email User",
        },
    )
    assert response.status_code == 422


def test_login_success_and_me_profile(client: TestClient) -> None:
    """Verify login issues valid JWT token that authenticates /me and profile update."""
    # Register user first
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alex@deploystack.local",
            "password": "SecureP@ssw0rd!",
            "full_name": "Alex Developer",
        },
    )
    assert reg_res.status_code == 201

    # 1. Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "alex@deploystack.local",
            "password": "SecureP@ssw0rd!",
        },
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get /me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "alex@deploystack.local"

    # 3. Update profile
    update_res = client.put(
        "/api/v1/auth/profile",
        headers=headers,
        json={
            "full_name": "Alexander The Great",
            "avatar_url": "https://avatar.deploystack.local/alex.png",
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["full_name"] == "Alexander The Great"
    assert updated_data["avatar_url"] == "https://avatar.deploystack.local/alex.png"


def test_login_invalid_credentials(client: TestClient) -> None:
    """Verify wrong password returns 401 Unauthorized."""
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "alex@deploystack.local",
            "password": "SecureP@ssw0rd!",
            "full_name": "Alex Developer",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "alex@deploystack.local",
            "password": "WrongPassword123!",
        },
    )
    assert response.status_code == 401
    assert response.json()["error"] == "Unauthorized"


def test_change_password_flow(client: TestClient) -> None:
    """Verify password change and subsequent re-login."""
    # Register separate user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "passwordchange@deploystack.local",
            "password": "OldPassword1!",
            "full_name": "Password Changer",
        },
    )
    assert reg_res.status_code == 201

    # Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "passwordchange@deploystack.local",
            "password": "OldPassword1!",
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong current password
    fail_res = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={
            "current_password": "WrongOldPassword!",
            "new_password": "NewSecureP@ssw0rd!",
        },
    )
    assert fail_res.status_code == 400

    # Successful change
    success_res = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={
            "current_password": "OldPassword1!",
            "new_password": "NewSecureP@ssw0rd!",
        },
    )
    assert success_res.status_code == 200

    # Old password no longer works
    assert client.post(
        "/api/v1/auth/login",
        json={
            "email": "passwordchange@deploystack.local",
            "password": "OldPassword1!",
        },
    ).status_code == 401

    # New password works
    assert client.post(
        "/api/v1/auth/login",
        json={
            "email": "passwordchange@deploystack.local",
            "password": "NewSecureP@ssw0rd!",
        },
    ).status_code == 200
