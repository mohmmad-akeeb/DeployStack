from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from tests.test_projects import register_and_login


def test_activity_logging_lifecycle(client: TestClient) -> None:
    """Verify that domain operations record immutable activity logs in the same transaction."""
    lead_headers = register_and_login(client, "audit_lead@deploystack.local", "Audit Lead")

    # 1. Create project
    proj_res = client.post(
        "/api/v1/projects",
        headers=lead_headers,
        json={"name": "Audit Trail Workspace"},
    )
    proj_id = proj_res.json()["id"]

    # 2. Verify PROJECT_CREATED activity exists
    proj_act_res = client.get(f"/api/v1/projects/{proj_id}/activities", headers=lead_headers)
    assert proj_act_res.status_code == 200
    proj_acts = proj_act_res.json()["items"]
    assert len(proj_acts) >= 1
    assert proj_acts[0]["action"] == "PROJECT_CREATED"
    assert proj_acts[0]["entity_type"] == "project"

    # 3. Create task
    task_res = client.post(
        "/api/v1/tasks",
        headers=lead_headers,
        json={
            "project_id": proj_id,
            "title": "Audited Task",
            "priority": "high",
        },
    )
    task_id = task_res.json()["id"]

    # 4. Status change
    client.patch(
        f"/api/v1/tasks/{task_id}/status",
        headers=lead_headers,
        json={"status": "in_progress", "position": 1},
    )

    # 5. Check task-level activities
    task_act_res = client.get(f"/api/v1/tasks/{task_id}/activities", headers=lead_headers)
    assert task_act_res.status_code == 200
    task_acts = task_act_res.json()["items"]
    assert len(task_acts) == 2  # TASK_STATUS_CHANGED, TASK_CREATED
    assert task_acts[0]["action"] == "TASK_STATUS_CHANGED"
    assert task_acts[0]["metadata"]["old_status"] == "todo"
    assert task_acts[0]["metadata"]["new_status"] == "in_progress"
    assert task_acts[1]["action"] == "TASK_CREATED"


def test_dashboard_and_project_stats(client: TestClient) -> None:
    """Verify personal dashboard statistics and project-level aggregate metrics."""
    lead_headers = register_and_login(client, "stats_lead@deploystack.local", "Stats Lead")
    lead_id = client.get("/api/v1/auth/me", headers=lead_headers).json()["id"]

    # Create project
    proj_id = client.post(
        "/api/v1/projects",
        headers=lead_headers,
        json={"name": "Analytics Workspace"},
    ).json()["id"]

    # Create 3 tasks with assignees and due dates
    now = datetime.now(UTC)
    due_tomorrow = (now + timedelta(days=1)).isoformat()
    overdue_yesterday = (now - timedelta(days=1)).isoformat()

    client.post(
        "/api/v1/tasks",
        headers=lead_headers,
        json={
            "project_id": proj_id,
            "title": "Task 1",
            "status": "todo",
            "priority": "high",
            "due_date": due_tomorrow,
            "assigned_user_ids": [lead_id],
        },
    )

    client.post(
        "/api/v1/tasks",
        headers=lead_headers,
        json={
            "project_id": proj_id,
            "title": "Task 2",
            "status": "in_progress",
            "priority": "urgent",
            "due_date": overdue_yesterday,
            "assigned_user_ids": [lead_id],
        },
    )

    client.post(
        "/api/v1/tasks",
        headers=lead_headers,
        json={
            "project_id": proj_id,
            "title": "Task 3",
            "status": "completed",
            "priority": "low",
        },
    )

    # 1. Test User Dashboard Stats: GET /api/v1/dashboard/stats
    dash_res = client.get("/api/v1/dashboard/stats", headers=lead_headers)
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash["total_assigned_tasks"] == 2
    assert dash["tasks_by_status"]["todo"] == 1
    assert dash["tasks_by_status"]["in_progress"] == 1
    assert dash["tasks_by_priority"]["high"] == 1
    assert dash["tasks_by_priority"]["urgent"] == 1
    assert dash["tasks_due_within_7_days"] == 1
    assert dash["overdue_tasks_count"] == 1
    assert dash["active_projects_count"] == 1
    assert len(dash["recent_activities"]) >= 3

    # 2. Test Project Stats: GET /api/v1/projects/{id}/stats
    proj_stats_res = client.get(f"/api/v1/projects/{proj_id}/stats", headers=lead_headers)
    assert proj_stats_res.status_code == 200
    p_stats = proj_stats_res.json()
    assert p_stats["project_id"] == proj_id
    assert p_stats["total_tasks"] == 3
    assert p_stats["status_distribution"]["todo"] == 1
    assert p_stats["status_distribution"]["in_progress"] == 1
    assert p_stats["status_distribution"]["completed"] == 1
    assert p_stats["overdue_tasks_count"] == 1
    assert p_stats["completed_ratio"] == 0.333
    assert p_stats["active_members_count"] == 1
    assert len(p_stats["member_workload"]) == 1
    assert p_stats["member_workload"][0]["assigned_count"] == 2
