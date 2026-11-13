# DeployStack — Relational Database Architecture

This directory contains the database entity definitions, relational schema diagrams, and DDL migrations for PostgreSQL 16.

---

## Documentation Index

- **Authoritative Schema Specification:** [schema.md](./schema.md) — Comprehensive specification covering all tables, columns, indexes, foreign key constraints, cascade semantics, trigger automation, and the architectural analysis of decoupled task assignments vs project membership.
- **Baseline PostgreSQL DDL:** [schema.sql](./schema.sql) — Fully executable DDL script initializing extensions, triggers, tables, constraints, and composite indexes.

---

## Entity Relationship Overview

The schema is normalized to 3NF and indexed for sub-150ms P95 latency across all Kanban operations:

1. **`users`**: Platform user accounts, bcrypt credential storage, and activation state.
2. **`projects`**: Top-level workspaces containing tasks, activity history, and members.
3. **`project_members`**: Many-to-many relationship linking users to projects with roles (`owner`, `admin`, `member`, `viewer`).
4. **`tasks`**: Kanban work items with status (`todo`, `in_progress`, `completed`), priority (`low`, `medium`, `high`, `urgent`), and integer position.
5. **`task_assignments`**: Decoupled many-to-many assignment table linking tasks to assigned team members with role and timestamp metadata.
6. **`attachments`**: Binary file references pointing to MinIO / S3 bucket object keys (enforcing 10MB limit).
7. **`activity_logs`**: Append-only audit trail capturing project and task state changes with structured JSONB metadata.

---

## Migrations

Schema migrations are managed programmatically via Alembic in `application/backend/alembic/`.

To generate a new migration revision:
```bash
cd application/backend
alembic revision --autogenerate -m "create domain tables"
alembic upgrade head
```

Refer to [schema.md](./schema.md) for detailed architectural documentation.
