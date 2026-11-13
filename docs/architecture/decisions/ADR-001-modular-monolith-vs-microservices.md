# ADR-001: Modular Monolith vs. Microservices Architecture

## Status
**Accepted**

## Context
DeployStack is a Team Task and Issue Management application engineered to demonstrate production-grade software engineering, cloud infrastructure automation, and maintainability.

When architecting the application tier, software engineering teams must choose between:
1. A **Modular Monolith** (a single unified codebase and deployment artifact containing strictly separated domain modules).
2. A **Microservices Architecture** (independent, independently deployed microservices communicating over network boundaries via HTTP/gRPC or message queues).

The application domain comprises user authentication, project workspace management, task and Kanban board execution, file attachments, project activity audit logging, and dashboard metrics aggregation.

## Decision Drivers
* **Operational Simplicity & Budget:** The project has a ₹0 cloud development budget. Microservices require multiple container registries, orchestration overhead (Kubernetes/ECS), API gateway routing, and distributed observability tools, which inflate cloud and operational complexity.
* **Transactional Integrity:** Operations such as moving a task and recording an audit activity log entry require immediate, strong consistency. Distributed transactions across microservices introduce the Saga pattern, outbox tables, and eventual consistency failures.
* **Team Velocity & Code Cohesion:** A modular monolith allows unified refactoring, shared data models, and straightforward end-to-end testing with zero network flakiness.
* **Horizontal Scalability:** The backend compute tier can scale horizontally across EC2 instances behind an Application Load Balancer as a unified, stateless unit.

## Considered Alternatives

### Alternative 1: Distributed Microservices Architecture
* **Approach:** Split the backend into 5+ separate services: `auth-service`, `project-service`, `task-service`, `attachment-service`, `activity-service`, coordinated via an API Gateway and Apache Kafka or RabbitMQ.
* **Pros:** Independent deployments, independent scaling for hot modules, distinct technology stacks per service.
* **Cons (Rejected):**
  * Massive operational overhead: multiple CI/CD pipelines, container images, and service discovery mechanisms.
  * Distributed data management: cross-service queries require complex joins or distributed caching.
  * Network latency and cascading failure modes requiring circuit breakers, retries, and distributed tracing (OpenTelemetry/Jaeger).
  * Incompatible with zero-cost lightweight local execution on developer machines.

### Alternative 2: Unstructured Monolith ("Spaghetti Monolith")
* **Approach:** A single codebase without strict internal domain boundaries, where presentation layers query database tables directly and domain logic is intertwined across controllers.
* **Pros:** Fast initial prototype development.
* **Cons (Rejected):** Creates high coupling, technical debt, and untestable code. Changes to tasks break project permissions; refactoring becomes perilous.

### Alternative 3: Modular Monolith (Chosen)
* **Approach:** A single deployable Python/FastAPI service structured into cleanly separated domain modules (`auth`, `projects`, `tasks`, `attachments`, `activities`, `metrics`). Each module encapsulates its domain logic, Pydantic schemas, and SQLAlchemy data models. Inter-module communication occurs via typed in-process service method calls and shared database sessions.
* **Pros:**
  * Strict separation of concerns without network overhead.
  * Strong ACID transactional integrity across domain boundaries.
  * Single deployable Docker image and unified CI/CD pipeline.
  * Straightforward local execution via Docker Compose.
  * Clear architectural boundaries enable future extraction into microservices if domain scale ever demands it.

## Decision Outcome
We choose the **Modular Monolith** architecture for DeployStack. All domain logic resides in a single, well-structured FastAPI codebase executed as a stateless container.

## Consequences

### Positive
* **Deterministic ACID Guarantees:** Multi-entity operations execute atomically within single database transactions.
* **Zero Network Overhead:** Eliminates HTTP/gRPC hop latency between internal domain modules.
* **Simplified CI/CD:** A single test suite (`pytest`) runs in seconds in GitHub Actions.
* **Stateless Horizontal Scalability:** The monolithic application container scales horizontally behind the AWS Application Load Balancer across multiple EC2 instances.

### Negative / Trade-offs
* All modules share the same runtime and technology stack (Python 3.11 / FastAPI).
* A deployment redeploys all modules simultaneously.

### Neutral
* High discipline is required in code reviews to ensure developers do not bypass domain service interfaces to query arbitrary internal tables directly.
