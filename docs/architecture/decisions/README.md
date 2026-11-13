# Architecture Decision Records (ADR) Log

This directory contains the documented Architecture Decision Records (ADRs) for **DeployStack**.  
Each record follows the standard format: **Title, Status, Context, Decision Drivers, Considered Alternatives, Decision Outcome, and Consequences**.

## ADR Index

| ADR ID | Title | Status | Primary Domain |
| :--- | :--- | :---: | :--- |
| **[ADR-001](./ADR-001-modular-monolith-vs-microservices.md)** | Modular Monolith vs. Microservices Architecture | **Accepted** | Application Architecture |
| **[ADR-002](./ADR-002-fastapi-and-sqlalchemy.md)** | Backend Framework & ORM Selection (FastAPI & SQLAlchemy 2.0) | **Accepted** | Backend Engineering |
| **[ADR-003](./ADR-003-postgresql-database.md)** | Relational Persistence Engine Selection (PostgreSQL 16) | **Accepted** | Data Architecture |
| **[ADR-004](./ADR-004-minio-local-object-storage.md)** | Local S3-Compatible Object Storage & Streaming Proxy (MinIO) | **Accepted** | Storage Architecture |
| **[ADR-005](./ADR-005-docker-compose-orchestration.md)** | Local Multi-Container Orchestration (Docker Compose) | **Accepted** | Local Development & DX |
| **[ADR-006](./ADR-006-terraform-modules.md)** | Reusable Infrastructure as Code Modularity (Terraform Modules) | **Accepted** | Cloud Infrastructure |
| **[ADR-007](./ADR-007-aws-three-tier-deployment-model.md)** | Target Cloud Architecture & Deployment Model (AWS Three-Tier Multi-AZ) | **Accepted** | Cloud Architecture |
| **[ADR-008](./ADR-008-stateless-jwt-authentication.md)** | Stateless JWT Bearer Authentication | **Accepted** | Security & Auth |
| **[ADR-009](./ADR-009-terraform-mock-provider-testing.md)** | Terraform 1.7+ Mock Provider Testing in CI/CD | **Accepted** | CI/CD & Testing |
| **[ADR-010](./ADR-010-zero-cost-local-first-execution.md)** | Zero-Cost Local-First Execution Strategy | **Accepted** | FinOps & Strategy |

## How to Add New Records
1. Copy the standard ADR format: `Title`, `Status`, `Context`, `Decision Drivers`, `Considered Alternatives`, `Decision Outcome`, `Consequences (Positive / Negative / Neutral)`.
2. Assign the next sequential ID (`ADR-011`, etc.).
3. Update this index table.
