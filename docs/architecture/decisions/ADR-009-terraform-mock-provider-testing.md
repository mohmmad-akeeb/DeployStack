# ADR-009: Terraform 1.7+ Mock Provider Testing in CI/CD

## Status
**Accepted**

## Context
DeployStack must validate its modular Terraform infrastructure code automatically in CI/CD without:
1. Incurring AWS cloud costs.
2. Requiring an AWS account or live credentials (AWS Access Keys).
3. Risking accidental resource provisioning.

Historically, IaC testing required either full deployment to an ephemeral sandbox AWS account, or complex local emulation frameworks like LocalStack (which has limitations on advanced AWS features and licensing constraints).

Starting in Terraform 1.7.0, HashiCorp introduced native mock provider support within the `terraform test` framework via `mock_provider` blocks.

## Decision
We utilize **Terraform 1.7+ Native Mock Providers and Static Linters** for infrastructure verification:

1. **Static Analysis & Formatting:**
   * `terraform fmt -check` (style compliance).
   * `terraform init -backend=false` (module download without remote state connection).
   * `terraform validate` (syntactic and type validation).
   * `tflint` (AWS-specific best practices, deprecated arguments, invalid instance types).
   * `checkov` (security posture, unencrypted buckets, open security group rules).
2. **Infrastructure Unit & Integration Tests:**
   * Written in `.tftest.hcl` files located in `infrastructure/tests/`.
   * Use native `mock_provider "aws" {}` to mock resource creation and output synthesis.
   * Assert module outputs, subnet CIDR logic, security group rules, and variable validations without calling live AWS APIs.

## Consequences

### Positive
* **Zero Cloud Credentials in CI:** GitHub Actions workflows execute without any secrets or AWS credentials.
* **Deterministic & Blazing Fast:** Mock tests run in seconds rather than the minutes required for live AWS resource provisioning.
* **100% Free:** Completely compliant with the ₹0 development budget.
* **Native Tooling:** Relies strictly on standard Terraform CLI features without external mocking daemons.

### Negative / Trade-offs
* Mock testing verifies logic, variable validation, outputs, and assertions, but cannot verify AWS-side runtime quotas, IAM permission nuances, or AWS service outages.
