# DeployStack — REST API Specification & Contract Index

This directory maintains the OpenAPI 3.1 specification, contract documentation, and endpoint catalog for the DeployStack Modular Monolith.

---

## Documentation Index

- **Comprehensive API Contracts:** [api-contracts.md](./api-contracts.md) — Exhaustive contract specifications for all 10 endpoint domains, including request/response schemas, JWT authentication rules, RBAC authorization matrices, status codes, and sequence diagrams.
- **OpenAPI 3.1 Specification (YAML):** [openapi.yaml](./openapi.yaml) — Production OpenAPI 3.1 YAML specification.
- **OpenAPI 3.1 Specification (JSON):** [openapi.json](./openapi.json) — Synchronized JSON format for tooling and Swagger UI.

---

## Base URLs

- **Local Development:** `http://localhost:8000/api/v1`
- **Docker Compose Bridge:** `http://backend:8000/api/v1`
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Core Endpoint Catalog

### 1. Health & Observability
- `GET /health` or `GET /api/v1/health` — Readiness probe and database connectivity check.

### 2. Authentication & Profile (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Create new user account with bcrypt password hashing.
- `POST /api/v1/auth/login` — Exchange credentials for signed JWT access token (60 min expiration).
- `GET /api/v1/auth/me` — Retrieve profile of currently authenticated user.
- `PUT /api/v1/auth/profile` — Update user full name and avatar URL.
- `POST /api/v1/auth/change-password` — Change password with current password verification.

### 3. Projects (`/api/v1/projects`)
- `GET /api/v1/projects` — List user's active and archived projects (paginated).
- `POST /api/v1/projects` — Create project (caller becomes Owner).
- `GET /api/v1/projects/{id}` — Get project metadata, member counts, and caller's role.
- `PUT /api/v1/projects/{id}` — Update project metadata (Owner / Admin).
- `DELETE /api/v1/projects/{id}` — Cascade-delete project (Owner only).

### 4. Project Membership (`/api/v1/projects/{id}/members`)
- `GET /api/v1/projects/{id}/members` — List members and roles.
- `POST /api/v1/projects/{id}/members` — Add member by email (`admin`, `member`, `viewer`).
- `PUT /api/v1/projects/{id}/members/{user_id}/role` — Update member role (Owner only).
- `DELETE /api/v1/projects/{id}/members/{user_id}` — Remove member from project.

### 5. Tasks & Kanban (`/api/v1/tasks`)
- `GET /api/v1/tasks?project_id={id}` — List tasks within project (filtered by status, priority, assignee).
- `POST /api/v1/tasks` — Create task card with initial status, priority, position, and assignees.
- `GET /api/v1/tasks/{id}` — Full task details including assignees and attachments.
- `PUT /api/v1/tasks/{id}` — Update details, priority, or due date.
- `DELETE /api/v1/tasks/{id}` — Delete task (Owner, Admin, or author).

### 6. Task Status & Reordering (`PATCH /api/v1/tasks/{id}/status`)
- `PATCH /api/v1/tasks/{id}/status` — Transition Kanban status (`todo`, `in_progress`, `completed`) and position index.

### 7. Task Assignments (`/api/v1/tasks/{id}/assignments`)
- `GET /api/v1/tasks/{id}/assignments` — List assignees for task.
- `POST /api/v1/tasks/{id}/assignments` — Assign verified project members to task.
- `DELETE /api/v1/tasks/{id}/assignments/{user_id}` — Remove user assignment.

### 8. File Attachments (`/api/v1/tasks/{id}/attachments` & `/api/v1/attachments/{id}`)
- `POST /api/v1/tasks/{id}/attachments` — Upload file attachment (max 10MB) streamed to MinIO / S3.
- `GET /api/v1/tasks/{id}/attachments` — List attachment metadata for a task.
- `GET /api/v1/attachments/{id}/download` — Stream binary download proxy with private S3 keys.
- `DELETE /api/v1/attachments/{id}` — Purge attachment from database and S3.

### 9. Activity Logs (`/api/v1/projects/{id}/activities`)
- `GET /api/v1/projects/{id}/activities` — Project-wide audit trail.
- `GET /api/v1/tasks/{id}/activities` — Task-specific audit history.

### 10. Dashboard Statistics
- `GET /api/v1/dashboard/stats` — Personal cross-project metrics for current user.
- `GET /api/v1/projects/{id}/stats` — Aggregate metrics and team workload for project workspace.

For complete schema definitions, refer to [api-contracts.md](./api-contracts.md) and [openapi.yaml](./openapi.yaml).
