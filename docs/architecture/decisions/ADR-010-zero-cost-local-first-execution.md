# ADR-010: Zero-Cost Local-First Execution Strategy

## Status
**Accepted**

## Context
DeployStack is designed to demonstrate production-grade cloud infrastructure and full-stack software development. However, deploying a production three-tier AWS environment (including an Application Load Balancer, Multi-AZ RDS PostgreSQL, NAT Gateways, and EC2 Auto Scaling Groups) generates recurring infrastructure costs of $100+ per month. The project has a strict **₹0 / $0 development budget** and must remain accessible, testable, and demonstrable without requiring AWS credentials or credit card billing.

## Decision
We decouple the **Application Runtime Execution** from the **Cloud Infrastructure Specification**:

1. **Local Runtime Execution:**
   * The complete stack (React frontend, FastAPI backend, PostgreSQL 16, and MinIO object store) runs locally via Docker Compose.
   * Developers, reviewers, and automated CI pipelines run the entire application with zero cloud dependencies and zero cost.

2. **Cloud Infrastructure Specification:**
   * The production AWS architecture is authored in modular, reusable Terraform modules.
   * Infrastructure code is tested and verified in CI using `terraform fmt`, `terraform validate`, `tflint`, `checkov`, and Terraform 1.7+ mock provider tests.
   * `terraform apply` is **never executed against live AWS** during development or standard evaluation.

## Consequences

### Positive
* **Zero Financial Risk:** Absolutely no AWS billing or surprise costs.
* **Universal Accessibility:** Anyone with Docker and Git can clone, run, and evaluate the project locally.
* **Deterministic CI/CD:** Tests and builds run reliably in free GitHub Actions without AWS rate limits, credentials, or network flakiness.

### Negative / Trade-offs
* Live cloud behavior (e.g., AWS IAM instance profile metadata service, actual ALB TLS certificate provisioning) is simulated rather than executed live.

### Neutral
* When deploying to real AWS in the future, developers only need to configure real AWS credentials and run the already-validated Terraform configuration.
