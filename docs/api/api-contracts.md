# DeployStack — REST API Specification & Contract Index

**Document Version:** 1.0.0  
**Status:** Approved Architecture Contract  
**API Protocol:** REST over HTTP/1.1 & HTTP/2  
**Serialization:** JSON (`application/json`), Multipart (`multipart/form-data`), Binary Stream (`application/octet-stream`)  
**Security Standard:** Stateless JWT Bearer (RFC 7519, HS256)  
**Date:** 2026-11-13  
**Authors:** Senior Software Architect & API Designer  

---

## 1. Architectural Principles & Global Conventions

### 1.1 Base URLs & Environments

| Environment | Base URL | Scope & Network |
| :--- | :--- | :--- |
| **Local Development** | `http://localhost:8000` | Host machine browser accessing FastAPI container |
| **Docker Compose Bridge** | `http://backend:8000` | Internal container network (`deploystack-net`) |
| **Target AWS Production** | `https://api.deploystack.local` | Public ALB DNS terminated with SSL/TLS |
| **API Version Prefix** | `/api/v1` | Global prefix for all versioned domain routes |

Interactive Documentation:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI 3.1 Spec:** [openapi.yaml](./openapi.yaml) / [openapi.json](./openapi.json)

---

### 1.2 Global Request & Response Headers

#### Ingress Headers
- `Authorization`: `Bearer <jwt_token>` (Required on all protected endpoints)
- `Content-Type`: `application/json` (or `multipart/form-data` for file uploads)
- `Accept`: `application/json`

#### Egress Headers
- `Content-Type`: `application/json; charset=utf-8` (or specific MIME type for file downloads)
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `X-XSS-Protection`: `1; mode=block`

---

### 1.3 Identifiers & Data Formatting Standards

- **Primary Identifiers:** All entity IDs (`id`, `project_id`, `task_id`, `user_id`) are formatted as standard **UUID v4** strings (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`).
- **Timestamps:** All temporal attributes (`created_at`, `updated_at`, `due_date`, `assigned_at`) are formatted in strict **ISO 8601 UTC** notation with the `Z` suffix (`YYYY-MM-DDTHH:MM:SSZ` or with fractional seconds).
- **String Enums:** Enums are stored and transmitted in lowercase snake_case (e.g., `todo`, `in_progress`, `completed`, `admin`, `member`, `viewer`).

---

### 1.4 Global Error Envelope (RFC 7807 Compliant)

All non-2xx responses return a consistent error body:

```json
{
  "status_code": 404,
  "error": "Not Found",
  "message": "Task with ID '8cf1cf14-1180-4965-b77c-a49cf97c0338' was not found",
  "detail": [
    {
      "field": "id",
      "issue": "EntityNotFound"
    }
  ],
  "timestamp": "2026-11-13T10:45:00Z",
  "path": "/api/v1/tasks/8cf1cf14-1180-4965-b77c-a49cf97c0338"
}
```

#### Validation Errors (HTTP 422 Unprocessable Entity)
When request payload validation fails, FastAPI/Pydantic returns:
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error"
    }
  ]
}
```

---

## 2. Authentication & Authorization Framework

### 2.1 Password Hashing & Security Rules
- **Algorithm:** `bcrypt` with work factor (cost) **12**.
- **Salt Generation:** Generated cryptographically per user using the platform's CSPRNG.
- **Plaintext Policy:** Plaintext passwords are never stored in memory longer than necessary for verification, never logged, and never included in error traces.
- **Complexity Requirements:**
  - Length: Minimum 8 characters, maximum 128 characters.
  - Character Sets: Must include at least 1 uppercase letter, 1 lowercase letter, 1 numeric digit, and 1 special symbol.

---

### 2.2 JWT Access Token Specification
- **Standard:** RFC 7519
- **Signing Algorithm:** HMAC-SHA256 (`HS256`)
- **Secret Key:** Injected via `SECRET_KEY` environment variable (minimum 256-bit entropy).
- **Lifespan:** **60 minutes** (`ACCESS_TOKEN_EXPIRE_MINUTES = 60`).
- **Token Claims Payload:**
  ```json
  {
    "sub": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "alex@deploystack.local",
    "name": "Alex Developer",
    "iat": 1794564000,
    "exp": 1794567600,
    "jti": "e1f13b19-482d-4560-bf86-53d9e877a941",
    "type": "access"
  }
  ```

---

### 2.3 Role-Based Access Control (RBAC) Matrix

DeployStack enforces a two-tier authorization model:
1. **Platform Level:** Validates that the caller has a valid JWT and their account is marked `is_active = TRUE`.
2. **Project Workspace Level:** Validates membership and role permissions within the specific project:

| Action / Capability | Project Owner | Project Admin | Project Member | Project Viewer | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **System Health Check** | Yes | Yes | Yes | Yes | **Public** |
| **Register / Login** | Yes | Yes | Yes | Yes | **Public** |
| **View Own Profile / Update Password** | Yes | Yes | Yes | Yes | No |
| **Create Project** | Yes | Yes | Yes | Yes | No |
| **View Project Metadata** | Yes | Yes | Yes | Yes | No |
| **Update Project Metadata** | **Yes** | **Yes** | No | No | No |
| **Delete Project** | **Yes** | No | No | No | No |
| **List Project Members** | Yes | Yes | Yes | Yes | No |
| **Add / Invite Member** | **Yes** | **Yes** | No | No | No |
| **Update Member Role** | **Yes** | No | No | No | No |
| **Remove Member** | **Yes** | **Yes** (Non-owners)| Self-Only | Self-Only | No |
| **List Tasks / Kanban Board** | Yes | Yes | Yes | Yes | No |
| **Create Task** | Yes | Yes | Yes | No | No |
| **Update Task Details** | Yes | Yes | Assigned / Author | No | No |
| **Move Task Status / Reorder** | Yes | Yes | Yes | No | No |
| **Assign / Unassign Members** | Yes | Yes | Yes | No | No |
| **Delete Task** | **Yes** | **Yes** | Author Only | No | No |
| **Upload Attachment** | Yes | Yes | Yes | No | No |
| **Download Attachment** | Yes | Yes | Yes | Yes | No |
| **Delete Attachment** | **Yes** | **Yes** | Uploader Only | No | No |
| **View Project Activity Log** | Yes | Yes | Yes | Yes | No |
| **View Project Statistics** | Yes | Yes | Yes | Yes | No |

---

## 3. Complete REST Endpoint Contracts

```mermaid
flowchart TD
    subgraph AuthGroup ["1. Authentication & Profile"]
        R1["POST /api/v1/auth/register"]
        R2["POST /api/v1/auth/login"]
        R3["GET /api/v1/auth/me"]
        R4["PUT /api/v1/auth/profile"]
        R5["POST /api/v1/auth/change-password"]
    end

    subgraph ProjectGroup ["2. Projects & Membership"]
        P1["POST /api/v1/projects"]
        P2["GET /api/v1/projects"]
        P3["GET /api/v1/projects/{id}"]
        P4["PUT /api/v1/projects/{id}"]
        P5["DELETE /api/v1/projects/{id}"]
        M1["GET /api/v1/projects/{id}/members"]
        M2["POST /api/v1/projects/{id}/members"]
        M3["PUT /api/v1/projects/{id}/members/{user_id}/role"]
        M4["DELETE /api/v1/projects/{id}/members/{user_id}"]
    end

    subgraph TaskGroup ["3. Tasks, Kanban & Assignments"]
        T1["POST /api/v1/tasks"]
        T2["GET /api/v1/tasks"]
        T3["GET /api/v1/tasks/{id}"]
        T4["PUT /api/v1/tasks/{id}"]
        T5["DELETE /api/v1/tasks/{id}"]
        S1["PATCH /api/v1/tasks/{id}/status"]
        A1["GET /api/v1/tasks/{id}/assignments"]
        A2["POST /api/v1/tasks/{id}/assignments"]
        A3["DELETE /api/v1/tasks/{id}/assignments/{user_id}"]
    end

    subgraph AttachGroup ["4. Attachments & Audit"]
        F1["POST /api/v1/tasks/{id}/attachments"]
        F2["GET /api/v1/tasks/{id}/attachments"]
        F3["GET /api/v1/attachments/{id}/download"]
        F4["DELETE /api/v1/attachments/{id}"]
        L1["GET /api/v1/projects/{id}/activities"]
        L2["GET /api/v1/tasks/{id}/activities"]
    end

    subgraph StatsGroup ["5. Observability & Dashboards"]
        D1["GET /api/v1/dashboard/stats"]
        D2["GET /api/v1/projects/{id}/stats"]
        H1["GET /health"]
        H2["GET /api/v1/health"]
    end
```

---

### 3.1 System Health & Observability Endpoints

#### `GET /health` & `GET /api/v1/health`
- **Summary:** Readiness probe for load balancers and container orchestrators.
- **Authentication:** Public (No authorization required).
- **Authorization:** Open to all callers.
- **Success Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "environment": "development",
    "database_connected": true,
    "version": "0.1.0"
  }
  ```
- **Error Responses:**
  - `503 Service Unavailable`: If PostgreSQL connection ping fails.
    ```json
    {
      "status": "unhealthy",
      "environment": "development",
      "database_connected": false,
      "version": "0.1.0"
    }
    ```

---

### 3.2 Authentication & User Profile Endpoints

#### `POST /api/v1/auth/register`
- **Summary:** Register a new platform user account.
- **Authentication:** Public.
- **Authorization:** Open to all callers.
- **Request Body (`application/json`):**
  ```json
  {
    "email": "alex@deploystack.local",
    "password": "SecureP@ssw0rd!",
    "full_name": "Alex Developer"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "alex@deploystack.local",
    "full_name": "Alex Developer",
    "avatar_url": null,
    "is_active": true,
    "is_superuser": false,
    "created_at": "2026-11-13T10:00:00Z",
    "updated_at": "2026-11-13T10:00:00Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Password fails complexity rules.
  - `409 Conflict`: Email already registered.
  - `422 Unprocessable Entity`: Malformed JSON or invalid email format.

---

#### `POST /api/v1/auth/login`
- **Summary:** Authenticate user credentials and receive a signed JWT access token.
- **Authentication:** Public.
- **Authorization:** Open to all callers.
- **Request Body (`application/json` or `application/x-www-form-urlencoded`):**
  ```json
  {
    "email": "alex@deploystack.local",
    "password": "SecureP@ssw0rd!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJlbWFpbCI6ImFsZXhAZGVwbG95c3RhY2subG9jYWwiLCJleHAiOjE3OTQ1Njc2MDAsImlhdCI6MTc5NDU2NDAwMH0.abcdef1234567890",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "alex@deploystack.local",
      "full_name": "Alex Developer",
      "avatar_url": null,
      "is_active": true,
      "is_superuser": false,
      "created_at": "2026-11-13T10:00:00Z",
      "updated_at": "2026-11-13T10:00:00Z"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Invalid email or password, or account disabled.
  - `422 Unprocessable Entity`: Missing fields.

---

#### `GET /api/v1/auth/me`
- **Summary:** Retrieve profile details of currently authenticated user.
- **Authentication:** `BearerAuth` (JWT required).
- **Authorization:** Authenticated user with `is_active = true`.
- **Success Response (200 OK):**
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "alex@deploystack.local",
    "full_name": "Alex Developer",
    "avatar_url": "https://avatar.deploystack.local/u/alex.png",
    "is_active": true,
    "is_superuser": false,
    "created_at": "2026-11-13T10:00:00Z",
    "updated_at": "2026-11-13T10:00:00Z"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing, invalid, or expired JWT token.

---

#### `PUT /api/v1/auth/profile`
- **Summary:** Update profile display name or avatar URL.
- **Authentication:** `BearerAuth`.
- **Authorization:** Authenticated user.
- **Request Body (`application/json`):**
  ```json
  {
    "full_name": "Alexander Developer",
    "avatar_url": "https://avatar.deploystack.local/u/alex_v2.png"
  }
  ```
- **Success Response (200 OK):**
  Returns updated `UserResponse`.
- **Error Responses:**
  - `400 Bad Request`: Invalid avatar URL format.
  - `401 Unauthorized`: Token invalid.
  - `422 Unprocessable Entity`: Validation failure.

---

#### `POST /api/v1/auth/change-password`
- **Summary:** Change user password by validating existing password first.
- **Authentication:** `BearerAuth`.
- **Authorization:** Authenticated user.
- **Request Body (`application/json`):**
  ```json
  {
    "current_password": "SecureP@ssw0rd!",
    "new_password": "NewSecureP@ssw0rd2026!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "message": "Password changed successfully",
    "detail": null
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Current password incorrect or new password does not satisfy complexity.
  - `401 Unauthorized`: Token invalid.

---

### 3.3 Project Workspace Management Endpoints

#### `POST /api/v1/projects`
- **Summary:** Create a new workspace project. Caller is automatically assigned as `Owner`.
- **Authentication:** `BearerAuth`.
- **Authorization:** Authenticated user.
- **Request Body (`application/json`):**
  ```json
  {
    "name": "Cloud Infrastructure Automation",
    "description": "Production AWS Terraform blueprints and zero-cost local stack",
    "status": "active"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
    "name": "Cloud Infrastructure Automation",
    "description": "Production AWS Terraform blueprints and zero-cost local stack",
    "status": "active",
    "owner": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "alex@deploystack.local",
      "full_name": "Alex Developer",
      "avatar_url": null
    },
    "member_count": 1,
    "task_count": 0,
    "current_user_role": "owner",
    "created_at": "2026-11-13T10:05:00Z",
    "updated_at": "2026-11-13T10:05:00Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid project name (empty or whitespace).
  - `401 Unauthorized`: Token invalid.
  - `422 Unprocessable Entity`: Validation failure.

---

#### `GET /api/v1/projects`
- **Summary:** List projects where caller is Owner or Member.
- **Authentication:** `BearerAuth`.
- **Authorization:** Authenticated user.
- **Query Parameters:**
  - `status`: Filter by status (`active`, `archived`, `completed`)
  - `page`: Page index (default: 1)
  - `page_size`: Items per page (default: 20, max: 100)
  - `search`: Keyword search on project name
- **Success Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
        "name": "Cloud Infrastructure Automation",
        "description": "Production AWS Terraform blueprints",
        "status": "active",
        "owner": {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "email": "alex@deploystack.local",
          "full_name": "Alex Developer",
          "avatar_url": null
        },
        "member_count": 4,
        "task_count": 18,
        "current_user_role": "owner",
        "created_at": "2026-11-13T10:05:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
  ```

---

#### `GET /api/v1/projects/{id}`
- **Summary:** Retrieve complete project details.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, Member, or Viewer.
- **Path Parameter:** `id` (UUID)
- **Success Response (200 OK):** Returns `ProjectDetailResponse`.
- **Error Responses:**
  - `401 Unauthorized`: Token missing or invalid.
  - `403 Forbidden`: User does not belong to this project.
  - `404 Not Found`: Project does not exist.

---

#### `PUT /api/v1/projects/{id}`
- **Summary:** Update project title, description, or active status.
- **Authentication:** `BearerAuth`.
- **Authorization:** Restricted to **Project Owner** or **Project Admin**.
- **Request Body (`application/json`):**
  ```json
  {
    "name": "Cloud Infrastructure Automation (V2)",
    "description": "Updated infrastructure architecture specification",
    "status": "active"
  }
  ```
- **Success Response (200 OK):** Returns updated `ProjectDetailResponse`.
- **Error Responses:**
  - `401 Unauthorized`: Token invalid.
  - `403 Forbidden`: Caller is Member or Viewer (lacks Admin/Owner role).
  - `404 Not Found`: Project not found.

---

#### `DELETE /api/v1/projects/{id}`
- **Summary:** Permanently delete a project workspace. Cascades to tasks, members, attachments, and activity logs.
- **Authentication:** `BearerAuth`.
- **Authorization:** Restricted strictly to **Project Owner**.
- **Path Parameter:** `id` (UUID)
- **Success Response (204 No Content):** Empty body.
- **Error Responses:**
  - `401 Unauthorized`: Token invalid.
  - `403 Forbidden`: Caller is not the Project Owner.
  - `404 Not Found`: Project not found.

---

### 3.4 Project Membership Collaboration Endpoints

#### `GET /api/v1/projects/{id}/members`
- **Summary:** List all members enrolled in the project with their assigned roles.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, Member, or Viewer.
- **Success Response (200 OK):**
  ```json
  {
    "items": [
      {
        "project_id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
        "user": {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "email": "alex@deploystack.local",
          "full_name": "Alex Developer",
          "avatar_url": null
        },
        "role": "owner",
        "joined_at": "2026-11-13T10:05:00Z"
      },
      {
        "project_id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
        "user": {
          "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "email": "devops@deploystack.local",
          "full_name": "DevOps Engineer",
          "avatar_url": null
        },
        "role": "admin",
        "joined_at": "2026-11-13T10:15:00Z"
      }
    ],
    "total": 2,
    "page": 1,
    "page_size": 50
  }
  ```

---

#### `POST /api/v1/projects/{id}/members`
- **Summary:** Add a registered user to the project by email with a designated role.
- **Authentication:** `BearerAuth`.
- **Authorization:** Restricted to **Project Owner** or **Project Admin**.
- **Request Body (`application/json`):**
  ```json
  {
    "email": "devops@deploystack.local",
    "role": "member"
  }
  ```
- **Success Response (201 Created):** Returns `ProjectMemberResponse`.
- **Error Responses:**
  - `400 Bad Request`: Invalid role specified.
  - `401 Unauthorized`: Token invalid.
  - `403 Forbidden`: Caller lacks Admin or Owner privileges.
  - `404 Not Found`: No registered user found with the given email address.
  - `409 Conflict`: User is already a member of this project.

---

#### `PUT /api/v1/projects/{id}/members/{user_id}/role`
- **Summary:** Update a member's role (`admin`, `member`, `viewer`).
- **Authentication:** `BearerAuth`.
- **Authorization:** Restricted to **Project Owner**.
- **Request Body (`application/json`):**
  ```json
  {
    "role": "admin"
  }
  ```
- **Success Response (200 OK):** Returns updated `ProjectMemberResponse`.
- **Error Responses:**
  - `400 Bad Request`: Cannot change owner's role directly (requires ownership transfer).
  - `403 Forbidden`: Caller is not the Project Owner.
  - `404 Not Found`: Member not found in project.

---

#### `DELETE /api/v1/projects/{id}/members/{user_id}`
- **Summary:** Remove a user from the project workspace. Automatically cascade-removes their active task assignments in this project.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Project Admin (cannot remove Owner), or user voluntarily leaving.
- **Success Response (204 No Content):** Empty body.
- **Error Responses:**
  - `400 Bad Request`: Project Owner cannot leave without transferring ownership.
  - `403 Forbidden`: Caller lacks permission to remove this member.
  - `404 Not Found`: Member not found.

---

### 3.5 Tasks & Kanban Management Endpoints

#### `POST /api/v1/tasks`
- **Summary:** Create a new task work item within a project.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, or Member.
- **Request Body (`application/json`):**
  ```json
  {
    "project_id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
    "title": "Configure Terraform Networking Module",
    "description": "Implement VPC, 2 public subnets, 4 private subnets across 2 AZs",
    "status": "todo",
    "priority": "high",
    "position": 0,
    "due_date": "2026-11-20T18:00:00Z",
    "assigned_user_ids": [
      "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
    "project_id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
    "title": "Configure Terraform Networking Module",
    "description": "Implement VPC, 2 public subnets, 4 private subnets across 2 AZs",
    "status": "todo",
    "priority": "high",
    "position": 0,
    "due_date": "2026-11-20T18:00:00Z",
    "created_by": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "alex@deploystack.local",
      "full_name": "Alex Developer",
      "avatar_url": null
    },
    "assignees": [
      {
        "task_id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
        "user": {
          "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "email": "devops@deploystack.local",
          "full_name": "DevOps Engineer",
          "avatar_url": null
        },
        "role": "assignee",
        "assigned_at": "2026-11-13T10:20:00Z"
      }
    ],
    "attachments": [],
    "created_at": "2026-11-13T10:20:00Z",
    "updated_at": "2026-11-13T10:20:00Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: One or more `assigned_user_ids` are not active members of this project.
  - `403 Forbidden`: Caller lacks write access to this project (e.g. Viewer).
  - `404 Not Found`: Parent project not found.

---

#### `GET /api/v1/tasks`
- **Summary:** List tasks filtered by project, status column, priority, or assignee.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Member, Admin, Owner, or Viewer.
- **Query Parameters:**
  - `project_id`: Target project UUID (Required)
  - `status`: Filter by Kanban status (`todo`, `in_progress`, `completed`)
  - `priority`: Filter by priority (`low`, `medium`, `high`, `urgent`)
  - `assignee_id`: Filter by assigned user UUID
  - `search`: Keyword search in task title or description
  - `page`: Page index (default: 1)
  - `page_size`: Items per page (default: 50)
- **Success Response (200 OK):** Returns `TaskListResponse`.

---

#### `GET /api/v1/tasks/{id}`
- **Summary:** Retrieve full task details, assignees, and attachments.
- **Authentication:** `BearerAuth`.
- **Authorization:** Member of parent project.
- **Path Parameter:** `id` (UUID)
- **Success Response (200 OK):** Returns `TaskDetailResponse`.
- **Error Responses:**
  - `403 Forbidden`: Caller is not enrolled in the parent project.
  - `404 Not Found`: Task not found.

---

#### `PUT /api/v1/tasks/{id}`
- **Summary:** Update task title, description, priority, or due date.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, the task author, or an assigned member.
- **Request Body (`application/json`):**
  ```json
  {
    "title": "Configure Terraform Networking Module (V2)",
    "description": "Enhanced with NAT Gateway conditional configuration",
    "priority": "urgent",
    "due_date": "2026-11-21T18:00:00Z"
  }
  ```
- **Success Response (200 OK):** Returns updated `TaskDetailResponse`.
- **Error Responses:**
  - `403 Forbidden`: Caller lacks permission to edit this task.
  - `404 Not Found`: Task not found.

---

#### `DELETE /api/v1/tasks/{id}`
- **Summary:** Permanently delete a task card.
- **Authentication:** `BearerAuth`.
- **Authorization:** Restricted to **Project Owner**, **Project Admin**, or the **task creator**.
- **Success Response (204 No Content):** Empty body.
- **Error Responses:**
  - `403 Forbidden`: Caller is an assigned member or viewer without deletion rights.
  - `404 Not Found`: Task not found.

---

### 3.6 Task Status Transition & Reordering Endpoints

#### `PATCH /api/v1/tasks/{id}/status`
- **Summary:** Transition task across Kanban columns (`todo`, `in_progress`, `completed`) and update its vertical position index. Automatically logs an activity event.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, or Member.
- **Path Parameter:** `id` (UUID)
- **Request Body (`application/json`):**
  ```json
  {
    "status": "in_progress",
    "position": 1
  }
  ```
- **Success Response (200 OK):** Returns updated `TaskDetailResponse`.
- **Error Responses:**
  - `400 Bad Request`: Invalid status value or position < 0.
  - `403 Forbidden`: Caller lacks member access.
  - `404 Not Found`: Task not found.

---

### 3.7 Decoupled Task Assignment Endpoints

#### `GET /api/v1/tasks/{id}/assignments`
- **Summary:** List all users assigned to a task.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Member.
- **Success Response (200 OK):**
  ```json
  [
    {
      "task_id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
      "user": {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "email": "devops@deploystack.local",
        "full_name": "DevOps Engineer",
        "avatar_url": null
      },
      "role": "assignee",
      "assigned_by": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "email": "alex@deploystack.local",
        "full_name": "Alex Developer",
        "avatar_url": null
      },
      "assigned_at": "2026-11-13T10:20:00Z"
    }
  ]
  ```

---

#### `POST /api/v1/tasks/{id}/assignments`
- **Summary:** Assign one or more team members to the task.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, or Member.
- **Request Body (`application/json`):**
  ```json
  {
    "user_ids": [
      "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    ],
    "role": "assignee"
  }
  ```
- **Success Response (200 OK):** Returns array of updated `TaskAssigneeResponse` items.
- **Error Responses:**
  - `400 Bad Request`: One or more users are not active members of the task's parent project.
  - `404 Not Found`: Task not found.

---

#### `DELETE /api/v1/tasks/{id}/assignments/{user_id}`
- **Summary:** Remove a user's assignment from a task.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, task author, or assigned user removing self.
- **Success Response (204 No Content):** Empty body.
- **Error Responses:**
  - `403 Forbidden`: Caller lacks permission to modify assignments.
  - `404 Not Found`: Task or assignment not found.

---

### 3.8 File Attachment Endpoints (MinIO / S3 Storage)

#### `POST /api/v1/tasks/{id}/attachments`
- **Summary:** Upload a file attachment to a task (max 10MB). Streams multipart bytes to S3/MinIO and records metadata in PostgreSQL.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Owner, Admin, or Member.
- **Headers:** `Content-Type: multipart/form-data`
- **Request Form:** `file`: Binary file stream (max 10,485,760 bytes).
- **Success Response (201 Created):**
  ```json
  {
    "id": "d6f78f8c-4c4c-4731-893d-d6a0f76901f1",
    "task_id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
    "file_name": "architecture-diagram.png",
    "file_size": 204800,
    "content_type": "image/png",
    "uploader": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "alex@deploystack.local",
      "full_name": "Alex Developer",
      "avatar_url": null
    },
    "created_at": "2026-11-13T10:40:00Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Empty file or missing multipart field.
  - `403 Forbidden`: Caller is not a project member.
  - `404 Not Found`: Task not found.
  - `413 Payload Too Large`: Uploaded file exceeds 10MB limit.
  - `415 Unsupported Media Type`: Disallowed file type.
  - `500 Internal Server Error`: S3 storage failure.

---

#### `GET /api/v1/tasks/{id}/attachments`
- **Summary:** List all attachment metadata for a task.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Member.
- **Success Response (200 OK):** Returns array of `AttachmentResponse` objects.

---

#### `GET /api/v1/attachments/{id}/download`
- **Summary:** Download an attachment file via backend streaming proxy.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Member of parent project.
- **Success Response (200 OK):**
  - **Headers:**
    - `Content-Disposition`: `attachment; filename="architecture-diagram.png"`
    - `Content-Type`: `image/png`
    - `Content-Length`: `204800`
  - **Body:** Binary octet stream streamed directly from S3/MinIO.
- **Error Responses:**
  - `403 Forbidden`: Caller lacks access to the parent project.
  - `404 Not Found`: Attachment record or S3 object not found.

---

#### `DELETE /api/v1/attachments/{id}`
- **Summary:** Delete an attachment record and purge the binary object from S3 / MinIO.
- **Authentication:** `BearerAuth`.
- **Authorization:** Restricted to **Project Owner**, **Project Admin**, or the **original uploader**.
- **Success Response (204 No Content):** Empty body.
- **Error Responses:**
  - `403 Forbidden`: Caller is not authorized to delete this file.
  - `404 Not Found`: Attachment not found.

---

### 3.9 Activity Logs Audit Trail Endpoints

#### `GET /api/v1/projects/{id}/activities`
- **Summary:** Chronologically descending audit feed of state changes within a project workspace.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Member.
- **Query Parameters:**
  - `action`: Filter by action enum (e.g. `TASK_STATUS_CHANGED`)
  - `entity_type`: Filter by entity type (`project`, `task`, `member`, `assignment`, `attachment`)
  - `user_id`: Filter by actor UUID
  - `page`: Page index (default: 1)
  - `page_size`: Items per page (default: 20, max: 100)
- **Success Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "9e1c4b22-8611-4796-9f87-54b6c3e98123",
        "project_id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
        "task_id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
        "user": {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "email": "alex@deploystack.local",
          "full_name": "Alex Developer",
          "avatar_url": null
        },
        "action": "TASK_STATUS_CHANGED",
        "entity_type": "task",
        "entity_id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
        "metadata": {
          "old_status": "todo",
          "new_status": "in_progress",
          "task_title": "Configure Terraform Networking Module"
        },
        "created_at": "2026-11-13T10:35:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
  ```

---

#### `GET /api/v1/tasks/{id}/activities`
- **Summary:** Chronological audit history specifically for a single task card.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Member.
- **Success Response (200 OK):** Returns `ActivityLogListResponse`.

---

### 3.10 Dashboard Statistics Endpoints

#### `GET /api/v1/dashboard/stats`
- **Summary:** Retrieve personal cross-project dashboard metrics for current user.
- **Authentication:** `BearerAuth`.
- **Authorization:** Authenticated user.
- **Success Response (200 OK):**
  ```json
  {
    "total_assigned_tasks": 7,
    "tasks_by_status": {
      "todo": 3,
      "in_progress": 3,
      "completed": 1
    },
    "tasks_by_priority": {
      "low": 1,
      "medium": 2,
      "high": 3,
      "urgent": 1
    },
    "tasks_due_within_7_days": 4,
    "overdue_tasks_count": 0,
    "active_projects_count": 2,
    "recent_activities": [
      {
        "id": "9e1c4b22-8611-4796-9f87-54b6c3e98123",
        "project_id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
        "task_id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
        "user": {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "email": "alex@deploystack.local",
          "full_name": "Alex Developer",
          "avatar_url": null
        },
        "action": "TASK_STATUS_CHANGED",
        "entity_type": "task",
        "entity_id": "8cf1cf14-1180-4965-b77c-a49cf97c0338",
        "metadata": {
          "old_status": "todo",
          "new_status": "in_progress"
        },
        "created_at": "2026-11-13T10:35:00Z"
      }
    ]
  }
  ```

---

#### `GET /api/v1/projects/{id}/stats`
- **Summary:** Aggregate project-level metrics: status breakdown, priority distribution, overdue count, completion ratio, and team member workload.
- **Authentication:** `BearerAuth`.
- **Authorization:** Project Member.
- **Success Response (200 OK):**
  ```json
  {
    "project_id": "4b5b7192-3a3a-4464-9be8-f9b6e828d844",
    "total_tasks": 18,
    "status_distribution": {
      "todo": 8,
      "in_progress": 6,
      "completed": 4
    },
    "priority_distribution": {
      "low": 2,
      "medium": 8,
      "high": 6,
      "urgent": 2
    },
    "overdue_tasks_count": 1,
    "completed_ratio": 0.222,
    "active_members_count": 4,
    "member_workload": [
      {
        "user": {
          "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "email": "devops@deploystack.local",
          "full_name": "DevOps Engineer",
          "avatar_url": null
        },
        "assigned_count": 5,
        "in_progress_count": 2,
        "completed_count": 2
      }
    ]
  }
  ```

---

## 4. End-to-End Sequence Diagrams

### 4.1 Kanban Drag-and-Drop Task Status Transition

```mermaid
sequenceDiagram
    autonumber
    actor User as Team Member
    participant UI as React Kanban Board
    participant API as FastAPI Ingress & JWT Filter
    participant TS as TaskService
    participant AS as ActivityService
    participant DB as PostgreSQL 16

    User->>UI: Drags Task Card to "In Progress" column (position: 1)
    activate UI
    UI->>UI: Optimistically updates board column UI
    UI->>API: PATCH /api/v1/tasks/{id}/status {status: "in_progress", position: 1}
    activate API
    API->>API: Validates JWT signature & expiration (HS256)
    API->>TS: update_task_status(task_id, "in_progress", 1, caller_id)
    activate TS
    TS->>DB: Query task & verify caller has member access to project
    DB-->>TS: Access verified
    TS->>DB: UPDATE tasks SET status = 'in_progress', position = 1, updated_at = NOW() WHERE id = :id
    DB-->>TS: Row updated
    TS->>AS: record_activity(project_id, task_id, caller_id, "TASK_STATUS_CHANGED", metadata)
    activate AS
    AS->>DB: INSERT INTO activity_logs (project_id, task_id, user_id, action, metadata) VALUES (...)
    DB-->>AS: Audit row inserted
    deactivate AS
    TS->>DB: COMMIT TRANSACTION
    TS-->>API: TaskDetailResponse DTO
    deactivate TS
    API-->>UI: HTTP 200 OK (Updated Task JSON)
    deactivate API
    UI-->>User: Card position confirmed on board
    deactivate UI
```

---

### 4.2 Secure File Upload & Streaming Download Proxy

```mermaid
sequenceDiagram
    autonumber
    actor User as Team Member
    participant UI as React Task Detail Modal
    participant API as FastAPI Attachment Router
    participant S3 as MinIO / AWS S3 Bucket
    participant DB as PostgreSQL 16

    Note over User,DB: Upload Workflow (Max 10MB)
    User->>UI: Attaches architecture-diagram.png (200 KB)
    UI->>API: POST /api/v1/tasks/{id}/attachments (multipart/form-data + JWT)
    activate API
    API->>API: Verify JWT & project membership
    API->>API: Validate file size (<= 10MB) & MIME type
    API->>S3: boto3.put_object(Bucket, Key, Body=stream)
    S3-->>API: Upload Success (ETag)
    API->>DB: INSERT INTO attachments (task_id, uploader_id, file_name, file_size, s3_key) VALUES (...)
    DB-->>API: Attachment row created
    API-->>UI: HTTP 201 Created (AttachmentResponse JSON)
    deactivate API
    UI-->>User: Attachment pill rendered on task card

    Note over User,DB: Streamed Download Proxy Workflow
    User->>UI: Clicks "Download Attachment"
    UI->>API: GET /api/v1/attachments/{id}/download (JWT Bearer)
    activate API
    API->>DB: SELECT s3_key, file_name, content_type FROM attachments WHERE id = :id
    DB-->>API: Record metadata
    API->>S3: boto3.get_object(Bucket, Key=s3_key)
    S3-->>API: StreamingBody stream
    API-->>UI: HTTP 200 OK with StreamingResponse & Content-Disposition
    deactivate API
    UI-->>User: Browser saves file directly to disk
```
