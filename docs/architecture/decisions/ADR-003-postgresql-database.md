# ADR-003: Relational Persistence Engine Selection — PostgreSQL 16

## Status
**Accepted**

## Context
DeployStack requires a primary persistence engine for all application data: users, project workspaces, project memberships, tasks, Kanban column ordering, file attachment metadata, and project activity audit logs.

The data model exhibits strong relational characteristics:
* Many-to-one and many-to-many relationships (Users <-> Projects <-> Tasks).
* Strict referential integrity requirements (cascading deletions, foreign key enforcement).
* Complex query patterns: Kanban column filtering with positional ordering, chronological activity feeds with pagination, and aggregate project metrics.
* Dynamic payload requirements for audit events (storing state diffs and event metadata).

## Decision Drivers
* **Relational Integrity & ACID Guarantees:** Zero tolerance for orphaned task records, dangling memberships, or corrupted state.
* **Performance & Advanced Indexing:** Efficient support for composite B-tree indexes on `(project_id, status)` and `(project_id, created_at DESC)`.
* **Hybrid Data Modeling:** Ability to store structured tabular data alongside semi-structured JSON payloads (audit event metadata).
* **Parity Between Local & Cloud:** Identical engine locally (PostgreSQL container in Docker Compose) and in AWS (Amazon RDS PostgreSQL Multi-AZ).
* **Open Source & Ecosystem Support:** Rich tooling ecosystem (Alembic migrations, `pgvector`, robust backup utilities).

## Considered Alternatives

### Alternative 1: Document Database (MongoDB)
* **Pros:** Schema flexibility, easy JSON document storage.
* **Cons (Rejected):**
  * Weak multi-document relational enforcement; referential integrity must be managed in application code.
  * Complex aggregation pipelines required for basic joins between projects, tasks, and users.
  * Diverges from standard enterprise three-tier relational patterns specified in the project charter.

### Alternative 2: NoSQL Key-Value / Wide-Column (Amazon DynamoDB)
* **Pros:** Managed cloud scalability, single-digit millisecond latency.
* **Cons (Rejected):**
  * Single-table design for complex relational access patterns is notoriously rigid and difficult to evolve.
  * Local emulation (`DynamoDB Local`) diverges significantly from production semantics.
  * Heavy cloud vendor lock-in.

### Alternative 3: MySQL 8.0
* **Pros:** Widespread adoption, robust ACID transactions, excellent read performance.
* **Cons (Rejected):**
  * Inferior JSON handling compared to PostgreSQL's native `JSONB` data type with GIN indexing.
  * Weaker support for advanced window functions and transactional DDL migrations (Alembic migrations in MySQL can leave tables in a broken state on failure).

### Alternative 4: PostgreSQL 16 (Chosen)
* **Pros:**
  * Industry benchmark for open-source relational database reliability and standards compliance.
  * Native `JSONB` column type allows storing activity audit log diffs cleanly without a separate document store.
  * Full transactional DDL support: schema migrations execute inside transactions; failed migrations roll back cleanly without leaving the schema corrupted.
  * Superior query planner and indexing options (B-Tree, Hash, GIN, GiST, BRIN).
  * Direct managed cloud parity on Amazon RDS PostgreSQL with Multi-AZ automated failover.

## Decision Outcome
We choose **PostgreSQL 16** as the sole relational database engine for DeployStack.

## Consequences

### Positive
* **Rock-Solid Referential Integrity:** Foreign keys with `ON DELETE CASCADE` prevent orphaned records.
* **Optimized Board Performance:** Composite indexes deliver sub-5ms Kanban column queries.
* **Hybrid Data Capability:** Tabular relational models for core entities, combined with `JSONB` for activity audit metadata.
* **Seamless Local-to-Cloud Portability:** The exact same SQL queries and migrations run against the local Docker Compose PostgreSQL 16 container and Amazon RDS PostgreSQL 16.

### Negative / Trade-offs
* Requires careful database connection pool tuning in FastAPI to prevent connection exhaustion.
* Database migrations must be managed deliberately via Alembic in CI and deployment pipelines.

### Neutral
* Local storage persists to a Docker named volume (`postgres_data`), while RDS persists to an encrypted AWS EBS volume (`gp3`).
