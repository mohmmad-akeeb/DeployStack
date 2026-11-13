from fastapi.testclient import TestClient


def register_and_login(client: TestClient, email: str, name: str) -> dict[str, str]:
    """Helper to register and login a test user, returning auth header."""
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecureP@ssw0rd!",
            "full_name": name,
        },
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "SecureP@ssw0rd!",
        },
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_project_crud_lifecycle(client: TestClient) -> None:
    """Verify project creation, retrieval, listing, updating, and deletion."""
    owner_headers = register_and_login(client, "alice@deploystack.local", "Alice Owner")

    # 1. Create project
    create_res = client.post(
        "/api/v1/projects",
        headers=owner_headers,
        json={
            "name": "Cloud Infrastructure",
            "description": "AWS automation",
            "status": "active",
        },
    )
    assert create_res.status_code == 201
    project_data = create_res.json()
    project_id = project_data["id"]
    assert project_data["name"] == "Cloud Infrastructure"
    assert project_data["owner"]["email"] == "alice@deploystack.local"
    assert project_data["member_count"] == 1
    assert project_data["current_user_role"] == "owner"

    # 2. Get project detail
    get_res = client.get(f"/api/v1/projects/{project_id}", headers=owner_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id

    # 3. List projects
    list_res = client.get("/api/v1/projects", headers=owner_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert len(list_data["items"]) == 1

    # 4. Update project
    update_res = client.put(
        f"/api/v1/projects/{project_id}",
        headers=owner_headers,
        json={
            "name": "Cloud Infrastructure V2",
            "description": "Updated description",
            "status": "active",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Cloud Infrastructure V2"

    # 5. Delete project
    del_res = client.delete(f"/api/v1/projects/{project_id}", headers=owner_headers)
    assert del_res.status_code == 204

    # 6. Verify deleted (404)
    assert client.get(f"/api/v1/projects/{project_id}", headers=owner_headers).status_code == 404


def test_project_access_authorization_and_isolation(client: TestClient) -> None:
    """Verify non-members cannot read or modify a private project."""
    alice_headers = register_and_login(client, "alice2@deploystack.local", "Alice")
    bob_headers = register_and_login(client, "bob@deploystack.local", "Bob")

    # Alice creates a project
    create_res = client.post(
        "/api/v1/projects",
        headers=alice_headers,
        json={"name": "Alice's Secret Project"},
    )
    project_id = create_res.json()["id"]

    # Bob cannot view Alice's project
    assert client.get(f"/api/v1/projects/{project_id}", headers=bob_headers).status_code == 403

    # Bob does not see Alice's project in his list
    bob_list = client.get("/api/v1/projects", headers=bob_headers).json()
    assert bob_list["total"] == 0

    # Bob cannot update or delete Alice's project
    assert (
        client.put(
            f"/api/v1/projects/{project_id}",
            headers=bob_headers,
            json={"name": "Hacked"},
        ).status_code
        == 403
    )
    assert client.delete(f"/api/v1/projects/{project_id}", headers=bob_headers).status_code == 403


def test_project_membership_and_rbac(client: TestClient) -> None:
    """Verify member invitation, role promotion, and RBAC permission enforcement."""
    owner_headers = register_and_login(client, "lead@deploystack.local", "Lead Owner")
    dev_headers = register_and_login(client, "dev@deploystack.local", "Dev Member")
    other_headers = register_and_login(client, "other@deploystack.local", "Other User")

    # Owner creates project
    proj_res = client.post(
        "/api/v1/projects",
        headers=owner_headers,
        json={"name": "Team Platform"},
    )
    project_id = proj_res.json()["id"]

    # 1. Add Dev Member as 'member'
    add_res = client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=owner_headers,
        json={"email": "dev@deploystack.local", "role": "member"},
    )
    assert add_res.status_code == 201
    member_data = add_res.json()
    dev_id = member_data["user"]["id"]
    assert member_data["role"] == "member"

    # Dev Member can now view project
    assert client.get(f"/api/v1/projects/{project_id}", headers=dev_headers).status_code == 200

    # Regular Member cannot update project metadata (403)
    assert (
        client.put(
            f"/api/v1/projects/{project_id}",
            headers=dev_headers,
            json={"name": "Dev Modified Name"},
        ).status_code
        == 403
    )

    # Regular Member cannot invite new members (403)
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=dev_headers,
            json={"email": "other@deploystack.local", "role": "member"},
        ).status_code
        == 403
    )

    # 2. Owner promotes Dev to 'admin'
    role_res = client.put(
        f"/api/v1/projects/{project_id}/members/{dev_id}/role",
        headers=owner_headers,
        json={"role": "admin"},
    )
    assert role_res.status_code == 200
    assert role_res.json()["role"] == "admin"

    # Now Admin CAN update project metadata
    assert (
        client.put(
            f"/api/v1/projects/{project_id}",
            headers=dev_headers,
            json={"name": "Admin Updated Name"},
        ).status_code
        == 200
    )

    # But Admin CANNOT delete project (strictly owner-only)
    assert client.delete(f"/api/v1/projects/{project_id}", headers=dev_headers).status_code == 403

    # Admin CAN invite Other User
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=dev_headers,
            json={"email": "other@deploystack.local", "role": "viewer"},
        ).status_code
        == 201
    )

    # 3. List members
    members_res = client.get(f"/api/v1/projects/{project_id}/members", headers=dev_headers)
    assert members_res.status_code == 200
    assert members_res.json()["total"] == 3

    # 4. Remove member
    # Dev removes Other User
    other_id = client.get("/api/v1/auth/me", headers=other_headers).json()["id"]
    assert (
        client.delete(
            f"/api/v1/projects/{project_id}/members/{other_id}",
            headers=dev_headers,
        ).status_code
        == 204
    )

    # Owner cannot leave without transferring ownership
    owner_id = client.get("/api/v1/auth/me", headers=owner_headers).json()["id"]
    assert (
        client.delete(
            f"/api/v1/projects/{project_id}/members/{owner_id}",
            headers=owner_headers,
        ).status_code
        == 400
    )
