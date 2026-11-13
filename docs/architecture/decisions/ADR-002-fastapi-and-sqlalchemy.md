# ADR-002: Backend Framework & ORM Selection — FastAPI and SQLAlchemy 2.0

## Status
**Accepted**

## Context
DeployStack requires a modern, robust, and high-performance backend web framework and Object-Relational Mapping (ORM) layer. The backend must:
1. Provide RESTful JSON endpoints for authentication, project management, Kanban task state transitions, and file streaming.
2. Support automatic OpenAPI (Swagger) documentation generation.
3. Offer robust request and response validation with strict typing.
4. Interact reliably with PostgreSQL using modern database patterns (declarative models, migrations, connection pooling).
5. Minimize latency and resource footprint on containerized EC2 instances (`t3.micro`/`t4g.micro`).

## Decision Drivers
* **Performance & Asynchronous I/O:** Need for high-throughput non-blocking request handling, particularly for I/O-heavy file streaming and database queries.
* **Developer Experience & Type Safety:** Strong static analysis, autocompletion, and schema validation.
* **Modern Standards:** Alignment with current Python ecosystem best practices (Python 3.11+, Pydantic V2, SQLAlchemy 2.0 style syntax).
* **Ecosystem Maturity:** Rich documentation, wide industry adoption, and seamless integration with containerization and testing frameworks.

## Considered Alternatives

### Alternative 1: Django & Django REST Framework (DRF)
* **Pros:** "Batteries-included" administrative interface, mature ORM, built-in authentication tables.
* **Cons (Rejected):**
  * Heavy monolithic footprint; high baseline memory consumption unsuited for low-cost `t3.micro` nodes.
  * Synchronous WSGI heritage (ASGI support is secondary and clunky).
  * Tied to Django's proprietary ORM rather than independent modern data access patterns.

### Alternative 2: Flask & Flask-SQLAlchemy
* **Pros:** Lightweight, highly flexible, simple learning curve.
* **Cons (Rejected):**
  * Lacks native request/response validation; requires bolting on third-party libraries (Marshmallow, Webargs).
  * No automatic OpenAPI/Swagger documentation generation.
  * Synchronous WSGI model by default; asynchronous request handling is limited.

### Alternative 3: Node.js (Express.js or NestJS) with Prisma / TypeORM
* **Pros:** Single language across frontend and backend (TypeScript).
* **Cons (Rejected):** Project specification explicitly requires Python for backend engineering, Pytest for backend testing, and integration with AWS Boto3 SDK.

### Alternative 4: FastAPI + SQLAlchemy 2.0 + Pydantic V2 (Chosen)
* **Pros:**
  * **Exceptional Performance:** Built on Starlette and Uvicorn, among the fastest Python web frameworks available.
  * **Native OpenAPI / Swagger:** Auto-generates interactive API documentation at `/docs` and `/redoc`.
  * **Pydantic V2:** High-speed schema validation and serialization powered by a Rust core.
  * **SQLAlchemy 2.0:** Modern declarative models, full support for `select()` syntax, relationship loading strategies, and clean Alembic migration integration.
  * **First-Class Dependency Injection:** FastAPI's `Depends` system enables clean separation of database sessions, authentication context, and service layers.

## Decision Outcome
We select **FastAPI**, **SQLAlchemy 2.0**, and **Pydantic V2** as the foundation of the DeployStack application backend.

## Consequences

### Positive
* **Type Safety:** Comprehensive type hinting across routes, services, and schemas catches bugs at compile/lint time via MyPy/Ruff.
* **Rapid API Prototyping & Client Integration:** Auto-generated interactive Swagger UI simplifies frontend React integration.
* **Clean Architecture:** Dependency injection cleanly isolates controllers from domain services and database connections.
* **Streaming Capability:** Native Starlette `StreamingResponse` simplifies zero-buffering file streaming to and from MinIO/S3.

### Negative / Trade-offs
* SQLAlchemy 2.0 introduces conceptual differences between `session.execute(select(...))` and legacy 1.x `session.query(...)`. Developers must adhere strictly to 2.0 idioms.
* Async database drivers (e.g., `asyncpg`) introduce event-loop management nuances compared to traditional synchronous drivers (`psycopg2`).

### Neutral
* Alembic must be configured to generate migration revisions based on declarative SQLAlchemy base metadata.
