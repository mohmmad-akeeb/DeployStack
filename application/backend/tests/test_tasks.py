from fastapi.testclient import TestClient

from tests.test_projects import register_and_login


def test_task_crud_lifecycle(client: TestClient) -> None:
    """Verify task creation, retrieval, listing, update, and deletion."""
    owner_headers = register_and_login(client, "alice_task@deploystack.local", "Alice")

    # 1. Create project
    proj_res = client.post(
        "/api/v1/projects",
        headers=owner_headers,
        json={"name": "Task Test Project"},
    )
    project_id = proj_res.json()["id"]

    # 2. Create task
    task_res = client.post(
        "/api/v1/tasks",
        headers=owner_headers,
        json={
            "project_id": project_id,
            "title": "Build Infrastructure",
            "description": "Terraform VPC module",
            "status": "todo",
            "priority": "high",
            "position": 0,
        },
    )
    assert task_res.status_code == 201
    task_data = task_res.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Build Infrastructure"
    assert task_data["status"] == "todo"
    assert task_data["priority"] == "high"
    assert task_data["created_by"]["email"] == "alice_task@deploystack.local"

    # 3. Get task detail
    get_res = client.get(f"/api/v1/tasks/{task_id}", headers=owner_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == task_id

    # 4. List tasks with project_id
    list_res = client.get(f"/api/v1/tasks?project_id={project_id}", headers=owner_headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1

    # 5. Update task
    update_res = client.put(
        f"/api/v1/tasks/{task_id}",
        headers=owner_headers,
        json={
            "title": "Build Infrastructure (Updated)",
            "priority": "urgent",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Build Infrastructure (Updated)"
    assert update_res.json()["priority"] == "urgent"

    # 6. Delete task
    del_res = client.delete(f"/api/v1/tasks/{task_id}", headers=owner_headers)
    assert del_res.status_code == 204

    # 7. Check 404
    assert client.get(f"/api/v1/tasks/{task_id}", headers=owner_headers).status_code == 404


def test_task_status_transition_kanban(client: TestClient) -> None:
    """Verify Kanban status transition across columns and position reordering."""
    owner_headers = register_and_login(client, "kanban_lead@deploystack.local", "Kanban Lead")

    proj_res = client.post(
        "/api/v1/projects",
        headers=owner_headers,
        json={"name": "Kanban Project"},
    )
    project_id = proj_res.json()["id"]

    task_res = client.post(
        "/api/v1/tasks",
        headers=owner_headers,
        json={
            "project_id": project_id,
            "title": "Kanban Card",
            "status": "todo",
            "position": 0,
        },
    )
    task_id = task_res.json()["id"]

    # Valid status transition to in_progress, position 2
    patch_res = client.patch(
        f"/api/v1/tasks/{task_id}/status",
        headers=owner_headers,
        json={"status": "in_progress", "position": 2},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "in_progress"
    assert patch_res.json()["position"] == 2

    # Transition to completed
    complete_res = client.patch(
        f"/api/v1/tasks/{task_id}/status",
        headers=owner_headers,
        json={"status": "completed", "position": 0},
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # Invalid status fails with 400
    assert (
        client.patch(
            f"/api/v1/tasks/{task_id}/status",
            headers=owner_headers,
            json={"status": "invalid_status", "position": 0},
        ).status_code
        == 400
    )


def test_task_assignments(client: TestClient) -> None:
    """Verify assigning and unassigning project members to tasks."""
    owner_headers = register_and_login(client, "assign_lead@deploystack.local", "Assign Lead")
    dev_headers = register_and_login(client, "assign_dev@deploystack.local", "Assign Dev")
    outsider_headers = register_and_login(client, "outsider@deploystack.local", "Outsider")

    # Project and member enrollment
    proj_id = client.post(
        "/api/v1/projects",
        headers=owner_headers,
        json={"name": "Assignment Project"},
    ).json()["id"]

    client.post(
        f"/api/v1/projects/{proj_id}/members",
        headers=owner_headers,
        json={"email": "assign_dev@deploystack.local", "role": "member"},
    )
    dev_id = client.get("/api/v1/auth/me", headers=dev_headers).json()["id"]
    outsider_id = client.get("/api/v1/auth/me", headers=outsider_headers).json()["id"]

    # Create task
    task_id = client.post(
        "/api/v1/tasks",
        headers=owner_headers,
        json={
            "project_id": proj_id,
            "title": "Assigned Task",
        },
    ).json()["id"]

    # 1. Assign active project member
    assign_res = client.post(
        f"/api/v1/tasks/{task_id}/assignments",
        headers=owner_headers,
        json={"user_ids": [dev_id], "role": "assignee"},
    )
    assert assign_res.status_code == 200
    assignees = assign_res.json()
    assert len(assignees) == 1
    assert assignees[0]["user"]["email"] == "assign_dev@deploystack.local"
    assert assignees[0]["role"] == "assignee"

    # 2. Attempt to assign outsider not in project -> 400 Bad Request
    fail_res = client.post(
        f"/api/v1/tasks/{task_id}/assignments",
        headers=owner_headers,
        json={"user_ids": [outsider_id], "role": "assignee"},
    )
    assert fail_res.status_code == 400

    # 3. List assignments
    list_assign = client.get(f"/api/v1/tasks/{task_id}/assignments", headers=dev_headers)
    assert list_assign.status_code == 200
    assert len(list_assign.json()) == 1

    # 4. Remove assignment
    del_assign = client.delete(
        f"/api/v1/tasks/{task_id}/assignments/{dev_id}",
        headers=owner_headers,
    )
    assert del_assign.status_code == 204

    # 5. Check assignments list is empty
    empty_list = client.get(f"/api/v1/tasks/{task_id}/assignments", headers=dev_headers)
    assert len(empty_list.json()) == 0
