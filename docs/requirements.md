# DeployStack — System Requirements Specification (SRS)

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Date:** 2026-11-12  
**Original Reference:** [PROJECT_SPECIFICATION.md](../PROJECT_SPECIFICATION.md)  
**Authors:** Senior Software Architect & Cloud Infrastructure Architect  

---

## 1. Problem Statement & Project Purpose

### 1.1 Context
DeployStack bridges the gap between full-stack application development and production-grade cloud infrastructure automation without incurring recurring cloud provider charges. Developing and learning production-style AWS architectures (ALBs, Multi-AZ RDS, NAT Gateways, Auto Scaling Groups) typically costs \$40–\$100+ per month, which is prohibitive for zero-budget development.

### 1.2 Objective
Deliver a production-ready, highly maintainable Team Task and Issue Management application alongside a modular, reusable AWS Terraform infrastructure blueprint. The application must run 100% locally with Docker Compose at ₹0 cost, while the infrastructure is thoroughly validated through static analysis, security scanning, and Terraform mock-provider testing without live AWS resource provisioning.

### 1.3 Intended Audience & Stakeholders
*   **End Users:** Small software engineering teams and individual contributors who need task organization, Kanban workflows, attachment management, and project tracking.
*   **Engineering Evaluators:** Architects and DevOps reviewers assessing code structure, container practices, IaC modularity, and CI/CD quality.

---

## 2. Functional Requirements

### 2.1 Authentication & User Management (FR-AUTH)
*   **FR-AUTH-01:** User registration via email, password, and full name.
*   **FR-AUTH-02:** Passwords hashed with bcrypt (work factor >= 12). Plaintext passwords must never be stored or logged.
*   **FR-AUTH-03:** User login returning a signed JWT access token (HS256) valid for 60 minutes.
*   **FR-AUTH-04:** Stateless token verification on all protected endpoints via `Authorization: Bearer <token>`.
*   **FR-AUTH-05:** Current authenticated user profile retrieval endpoint (`GET /api/v1/auth/me`).

### 2.2 Project Management (FR-PROJ)
*   **FR-PROJ-01:** Create a new project with name, description, and status (`Active`, `Archived`).
*   **FR-PROJ-02:** List projects where the user is either the Owner or an assigned Member.
*   **FR-PROJ-03:** Retrieve detailed project metadata and member lists.
*   **FR-PROJ-04:** Update project details (restricted to Project Owner).
*   **FR-PROJ-05:** Archive or soft-delete a project (restricted to Project Owner).
*   **FR-PROJ-06:** Add or remove project members via registered email lookup.

### 2.3 Task Management (FR-TASK)
*   **FR-TASK-01:** Create tasks within a project with title, description, priority (`Low`, `Medium`, `High`, `Urgent`), due date, and assigned member.
*   **FR-TASK-02:** List tasks filtered by project, status, priority, or assignee.
*   **FR-TASK-03:** View full task details, including creator, assignee, timestamps, and attachments.
*   **FR-TASK-04:** Update task title, description, priority, due date, or assignee.
*   **FR-TASK-05:** Delete task (restricted to Project Owner or task creator).

### 2.4 Kanban Board Functionality (FR-KAN)
*   **FR-KAN-01:** Visual board rendering tasks grouped into three immutable status columns: `To Do`, `In Progress`, `Completed`.
*   **FR-KAN-02:** Task state transitions between columns via drag-and-drop or status update API calls.
*   **FR-KAN-03:** Sequential ordering of tasks within columns preserved in the database.

### 2.5 File Attachments (FR-FILE)
*   **FR-FILE-01:** Upload file attachments associated with a specific task (stored in S3-compatible object storage).
*   **FR-FILE-02:** File uploads restricted to max 10MB per file and allowed MIME types.
*   **FR-FILE-03:** Secure download of attachments via backend streaming proxy.
*   **FR-FILE-04:** Delete attachments (restricted to Project Owner or uploader).

### 2.6 Activity Tracking (FR-ACT)
*   **FR-ACT-01:** Automatically record domain events: project creation, task creation, status transitions, reassignments, attachment additions.
*   **FR-ACT-02:** Expose a chronologically sorted activity audit feed for both project and task views.

### 2.7 Dashboard Statistics (FR-DASH)
*   **FR-DASH-01:** Aggregate metrics per project: total task count, counts per status column, distribution by priority, overdue count.
*   **FR-DASH-02:** Personal user dashboard: total tasks assigned to the current user, tasks due within 7 days, recent activity.

### 2.8 Infrastructure Automation & CI/CD (FR-INFRA / FR-CICD)
*   **FR-INFRA-01:** Modular Terraform structure featuring independent modules: `networking`, `security`, `load-balancer`, `compute`, `database`, `storage`.
*   **FR-INFRA-02:** Parameterized `dev` and `production` environments consuming reusable modules.
*   **FR-INFRA-03:** Automated validation via GitHub Actions: `terraform fmt -check`, `terraform init -backend=false`, `terraform validate`, `tflint`, and `checkov`.
*   **FR-INFRA-04:** Zero-cloud unit testing of Terraform modules using Terraform 1.7+ mock providers (`.tftest.hcl`).
*   **FR-CICD-01:** Automated backend testing with Pytest, frontend build checks, and Docker container build tests on all pull requests.

---

## 3. Non-Functional Requirements

### 3.1 Measurable Criteria
*   **Security:**
    *   0 plaintext secrets in code or repository.
    *   Bcrypt hash rounds >= 12.
    *   Access token expiration <= 60 minutes.
    *   Security groups enforce strict ingress boundaries (ALB: 80/443; EC2: inbound ALB SG only; RDS: inbound EC2 SG on port 5432 only).
    *   S3 and MinIO buckets block public read/write access.
*   **Maintainability:**
    *   FastAPI backend organized by architectural layers: `routers`, `services`, `schemas`, `models`, `core`.
    *   React frontend strictly typed with TypeScript; zero `any` types.
    *   Modular Terraform with dedicated `variables.tf`, `outputs.tf`, `main.tf`, and `versions.tf`.
*   **Performance:**
    *   P95 API response time < 150ms for CRUD operations (excluding file uploads) under local Locust load tests.
    *   Frontend production bundle < 500KB gzipped.
*   **Testability:**
    *   Backend unit and integration test coverage >= 80% on core domain logic.
    *   100% of Terraform modules verified with mock-provider tests.
*   **Reliability:**
    *   Target AWS architecture spans 2 Availability Zones for compute, load balancing, and database.
    *   Local containers configure `restart: unless-stopped` with explicit health checks.
*   **Portability:**
    *   Entire application stack runs locally via single command: `docker compose up --build`.
*   **Cost Control:**
    *   **₹0 development budget.** Zero cloud charges incurred during development, testing, or review.

---

## 4. User Roles and Access Control Matrix

| Permission / Action | Project Owner | Project Member | Unauthenticated |
| :--- | :---: | :---: | :---: |
| Register / Login | Yes | Yes | Public |
| Create Project | Yes | Yes | No |
| Update / Archive / Delete Project | **Yes** | No | No |
| Add / Remove Members | **Yes** | No | No |
| Create / Edit / Reassign Task | Yes | Yes | No |
| Delete Task | **Yes** | Creator Only | No |
| Move Task on Kanban Board | Yes | Yes | No |
| Upload / Download Attachment | Yes | Yes | No |
| Delete Attachment | **Yes** | Uploader Only | No |
| View Activity Log & Statistics | Yes | Yes | No |

---

## 5. System Boundaries & Parity Mapping

| Subsystem | Local Development Environment (₹0 Runtime) | Target AWS Architecture (IaC Specification) |
| :--- | :--- | :--- |
| **Presentation** | React + Vite / Nginx container (`localhost:3000`) | S3 Bucket + CloudFront CDN / ALB |
| **Application** | FastAPI + Uvicorn container (`localhost:8000`) | EC2 Auto Scaling Group in Private Subnets |
| **Database** | PostgreSQL 16 container (`localhost:5432`) | Amazon RDS PostgreSQL Multi-AZ in DB Subnets |
| **Object Store** | MinIO container (`localhost:9000`) | Amazon S3 Bucket (Private, SSE-S3 encrypted) |
| **Secrets** | Local `.env` file (gitignored) | AWS Secrets Manager / Parameter Store |
| **Networking** | Docker Compose bridge network (`deploystack-net`)| Custom AWS VPC across 2 AZs (Public, App, DB) |
| **IaC State** | Local backend (`terraform.tfstate`) | Architecture documented for S3 + DynamoDB lock |
| **IaC Testing** | Terraform 1.7+ `mock_provider` + TFLint + Checkov | GitHub Actions automated runner |

---

## 6. Technical Constraints & Invariants

1.  **Strict Zero Budget (₹0):** No cloud services are provisioned. No AWS billing account is needed.
2.  **Local-First:** All application capabilities (including authentication, database persistence, and S3 file uploads) must function fully offline in Docker Compose.
3.  **No `terraform apply` on Live AWS:** Terraform modules are authoritatively tested via mock providers and static security analyzers.
4.  **No Remote State in Dev:** Terraform remote state backends (S3/DynamoDB) are disabled to guarantee zero cost and credential-free local execution.
5.  **Scope Guardrails:** No microservices, no Kubernetes, no OAuth2 third-party social logins, no WebSockets.
