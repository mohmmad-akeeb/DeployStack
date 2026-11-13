# ADR-005: Local Multi-Container Orchestration — Docker Compose

## Status
**Accepted**

## Context
DeployStack consists of multiple distinct execution components:
1. React Single Page Application (Vite/Node).
2. FastAPI backend application (Python 3.11 / Uvicorn).
3. PostgreSQL 16 relational database.
4. MinIO S3-compatible object storage server.

Developers and automated CI pipelines need a reliable, repeatable, one-command mechanism to bootstrap, network, configure, and tear down the complete application environment without manual software installations on host machines.

## Decision Drivers
* **One-Command Developer Onboarding:** A developer should be able to run `git clone` followed by a single command to have the entire full-stack application running with database and storage pre-configured.
* **Deterministic Isolation:** Network boundaries, port bindings, environment variable injection, and persistent volumes must be declaratively codified in source control.
* **Low System Resource Overhead:** Must run smoothly on standard laptops and free GitHub Actions CI runners without overwhelming CPU or RAM.
* **Production Parity:** Container definitions should align closely with the containers deployed on EC2 instances in production.

## Considered Alternatives

### Alternative 1: Local Host Bare-Metal Execution
* **Approach:** Install Node.js, Python 3.11, PostgreSQL server, and MinIO binary directly onto the developer's operating system.
* **Pros:** Native host performance.
* **Cons (Rejected):**
  * "Works on my machine" syndrome caused by differing OS versions, Python virtualenvs, and system packages.
  * Messy host environment pollution; challenging cleanup.
  * Incompatible with deterministic CI/CD automation.

### Alternative 2: Local Kubernetes (Minikube / Kind / K3s)
* **Approach:** Orchestrate containers using Kubernetes manifests, Helm charts, and local ingress controllers.
* **Pros:** Demonstrates container orchestration patterns; closer parity with enterprise K8s clusters.
* **Cons (Rejected):**
  * Massive resource overhead (Minikube consumes 2-4GB of RAM just for the control plane).
  * High cognitive load: writing Deployments, Services, Ingresses, PVCs, and ConfigMaps for a four-container setup is unnecessary complexity.
  * Project charter explicitly forbids Kubernetes to avoid premature optimization and complexity.

### Alternative 3: Docker Compose (Chosen)
* **Approach:** Define all services, shared bridge network, health checks, environment variables, and persistent named volumes in a single `docker-compose.yml` file.
* **Pros:**
  * **Ubiquitous Standard:** Docker Compose is available on every developer workstation and pre-installed on GitHub Actions runners.
  * **Declarative Networking:** Internal DNS resolution (e.g., `postgres:5432`, `minio:9000`) works automatically over a private bridge network (`deploystack-net`).
  * **Health-Check Dependency Management:** Uses `depends_on` with `condition: service_healthy` to ensure FastAPI only starts after PostgreSQL and MinIO are fully ready.
  * **Zero Cost & Rapid Startup:** Boots the entire stack in under 15 seconds with minimal memory footprint.

## Decision Outcome
We choose **Docker Compose** as the authoritative local orchestration engine for DeployStack.

## Consequences

### Positive
* **Turnkey Setup:** Running `docker compose up --build` launches the full-stack environment seamlessly.
* **Network Isolation:** Internal communication (FastAPI to PostgreSQL and MinIO) is secured within the bridge network and isolated from host traffic.
* **Fast CI/CD Verification:** Integration tests in GitHub Actions run against standard Docker Compose services without requiring external cloud accounts.
* **Volume Persistence:** Data is retained across container restarts using named volumes (`postgres_data`, `minio_data`).

### Negative / Trade-offs
* Docker Compose does not support advanced auto-scaling or multi-node scheduling; these are managed in AWS via Auto Scaling Groups and Terraform, not Docker Compose.

### Neutral
* Environment variables are managed cleanly via a `.env.example` template copied to `.env` during setup.
