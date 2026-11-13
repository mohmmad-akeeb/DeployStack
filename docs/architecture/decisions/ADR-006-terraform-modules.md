# ADR-006: Reusable Infrastructure as Code Modularity — Terraform Modules

## Status
**Accepted**

## Context
DeployStack must model a complete three-tier AWS cloud infrastructure (VPC, subnets, route tables, security groups, ALB, Auto Scaling Groups, RDS PostgreSQL, S3, Secrets Manager) using Infrastructure as Code (IaC).

To adhere to enterprise DevOps standards, the infrastructure codebase must:
1. Avoid monolithic, brittle configuration files.
2. Foster code reusability across multiple environments (e.g., `dev` and `production`).
3. Enforce strict parameter typing, variable documentation, and explicit outputs.
4. Support automated linting (`tflint`), security scanning (`checkov`), and native mock testing (`terraform test`).

## Decision Drivers
* **Separation of Concerns:** Networking, compute, storage, security, and persistence tiers have different lifecycles and blast radiuses; they must not be intertwined in a single script.
* **Environment Parity:** The exact same infrastructure modules used to define the production Multi-AZ topology must be consumable in a zero-cost development configuration by toggling input variables (e.g., `enable_nat_gateway = false`).
* **Testability:** Modular code allows isolated unit testing of individual modules using Terraform 1.7+ mock providers without deploying real AWS resources.
* **Industry Standard Practices:** Following HashiCorp standard module structure conventions (`main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`).

## Considered Alternatives

### Alternative 1: Monolithic Flat Terraform Configuration
* **Approach:** Place all AWS resource declarations in a single directory containing a massive `main.tf` file.
* **Pros:** Quick to draft initially; no module parameter passing.
* **Cons (Rejected):**
  * Anti-pattern for production IaC: unmaintainable, tightly coupled, and prone to catastrophic blast radius errors.
  * Code duplication between `dev` and `production` environments (copy-pasting files).
  * Highly difficult to test in isolation.

### Alternative 2: AWS Cloud Development Kit (CDK) or Pulumi
* **Approach:** Define infrastructure using imperative programming languages (TypeScript or Python).
* **Pros:** Expressive constructs, object-oriented inheritance, familiar programming language syntax.
* **Cons (Rejected):**
  * CDK synthesizes massive CloudFormation templates; Pulumi requires external state backends.
  * Project specification explicitly mandates standard declarative HashiCorp Terraform CLI and HCL syntax.
  * Less universally standard for cloud-agnostic platform engineering demonstrations than pure Terraform.

### Alternative 3: Reusable Modular Terraform Architecture (Chosen)
* **Approach:** Structure the codebase into decoupled, composable modules under `infrastructure/modules/`:
  * `networking`: VPC, public/private subnets across 2 AZs, IGW, NAT Gateways, route tables.
  * `security`: Chained security groups and IAM instance roles/policies.
  * `load-balancer`: Application Load Balancer, listeners, target groups, and health checks.
  * `compute`: Launch template, EC2 Auto Scaling Group, user data bootstrapping.
  * `database`: RDS DB subnet group, RDS PostgreSQL instance, parameter groups.
  * `storage`: S3 bucket, server-side encryption, public access block.
* **Pros:**
  * Clean boundaries: each module manages an isolated infrastructure domain.
  * Reusable: `environments/dev` and `environments/production` instantiate the same modules with different variable configurations.
  * High testability: each module can be verified independently in `infrastructure/tests/` via `mock_provider "aws"`.

## Decision Outcome
We organize the DeployStack infrastructure using a **Reusable Modular Terraform Architecture** following HashiCorp official conventions.

## Consequences

### Positive
* **DRY (Don't Repeat Yourself) Infrastructure:** Zero copy-pasting of resource logic between environments.
* **Granular Blast Radius:** Changes to compute launch templates do not touch VPC routing or database subnet groups.
* **Automated Static Analysis:** Linters and scanners pinpoint exact lines and modules violating best practices.
* **Mock Testing Compatibility:** Individual modules can be tested via `terraform test` in CI without AWS credentials.

### Negative / Trade-offs
* Requires disciplined design of module inputs (`variables.tf`) and outputs (`outputs.tf`) to pass resource references (e.g., Subnet IDs, Security Group IDs) cleanly across module boundaries.

### Neutral
* Local state (`terraform.tfstate`) is used for the zero-cost development environment; production would configure an S3 remote backend with DynamoDB state locking.
