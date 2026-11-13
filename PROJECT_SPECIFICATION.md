# Project 1 — DeployStack: Requirements Analysis and Project Understanding

We are starting a new project called **DeployStack — Three-Tier Web Application with Terraform and AWS**.

Act as a Senior Software Architect and Cloud Infrastructure Architect.

Your first responsibility is to understand the project requirements, evaluate technical feasibility, identify risks and establish a clear project scope.

**Do not start implementation yet.**

## 1. Project Overview

DeployStack is a production-style infrastructure automation project designed to demonstrate how to build, containerize, test and prepare a full-stack web application for deployment on AWS using Infrastructure as Code (IaC).

The project combines:

- Full-stack application development.
- Python and FastAPI backend engineering.
- React and TypeScript frontend development.
- PostgreSQL database engineering.
- Docker containerization.
- Terraform infrastructure automation.
- AWS architecture design.
- CI/CD automation.
- Infrastructure and application testing.

The main objective is to demonstrate practical cloud infrastructure and DevOps engineering skills through a functional application.

## 2. Application Use Case

Build a **Team Task and Issue Management Application**.

Core functionality:

- User registration and authentication.
- Project creation and management.
- Task creation, assignment and updates.
- Kanban task board with To Do, In Progress and Completed statuses.
- File attachments.
- Project activity tracking.
- Dashboard statistics.

The application must remain deliberately limited in scope. Prioritize functional completeness, maintainability and engineering quality over unnecessary features.

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | JWT |
| File storage | MinIO (S3-compatible) |
| Containerization | Docker + Docker Compose |
| Infrastructure as Code | Terraform |
| Cloud architecture | AWS |
| CI/CD | GitHub Actions |
| Backend testing | Pytest |
| Load testing | Locust |
| Infrastructure testing | Terraform mock providers |

Use free and open-source development tools wherever possible.

## 4. Target AWS Architecture

Design a three-tier, highly available AWS architecture.

### Presentation Layer

- Application Load Balancer.
- Two public subnets across two Availability Zones.
- Incoming HTTP/HTTPS traffic.

### Application Layer

- EC2 instances in private application subnets.
- Auto Scaling Group.
- FastAPI application running inside Docker containers.
- Security groups restricting application access to the ALB.

### Data Layer

- Amazon RDS PostgreSQL in private database subnets.
- Amazon S3 for file attachments.
- AWS Secrets Manager for database credentials.

### Networking

- VPC.
- Two public subnets.
- Two private application subnets.
- Two private database subnets.
- Internet Gateway.
- NAT Gateway in the production architecture.

Actual AWS deployment is optional and excluded from the zero-cost MVP.

## 5. Terraform Structure

Create reusable Terraform modules:

```text
infrastructure/
├── modules/
│   ├── networking/
│   ├── security/
│   ├── load-balancer/
│   ├── compute/
│   ├── database/
│   └── storage/
│
├── environments/
│   ├── dev/
│   └── production/
│
├── tests/
└── versions.tf
```

Each module should contain:

- main.tf
- variables.tf
- outputs.tf
- versions.tf

Infrastructure requirements:

- Reusable Terraform modules.
- Typed variables and meaningful outputs.
- Explicit resource dependencies where appropriate.
- Environment-specific configurations.
- Consistent naming and tagging.
- Security group restrictions.
- No hardcoded credentials.

For the zero-cost MVP:

- Use local Terraform state.
- Do not configure an S3 remote backend.
- Do not configure DynamoDB state locking.
- Do not provision real AWS resources.
- Use Terraform mock providers for supported infrastructure tests.
- Do not execute `terraform apply`.

## 6. Application Repository Structure

Proposed structure:

```text
deploystack/
├── application/
│   ├── frontend/
│   └── backend/
│       ├── app/
│       ├── tests/
│       └── Dockerfile
│
├── infrastructure/
│   ├── modules/
│   ├── environments/
│   └── tests/
│
├── docker-compose.yml
│
├── .github/
│   └── workflows/
│       ├── backend-tests.yml
│       └── terraform-ci.yml
│
├── docs/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   ├── deployment.md
│   └── cost-estimation.md
│
└── README.md
```

Treat this as a proposed structure. Evaluate whether any adjustments are necessary based on the selected architecture.

## 7. CI/CD Requirements

Use GitHub Actions to automate application and infrastructure validation.

### Terraform validation

- `terraform fmt -check`
- `terraform init -backend=false`
- `terraform validate`
- TFLint
- Checkov security scanning
- Terraform mock-provider tests

### Application validation

- Backend unit tests using Pytest.
- Frontend build validation.
- Docker image builds.
- Integration tests where practical.

Pull requests should automatically trigger validation.

Production deployment should require a manual approval gate in a future AWS-enabled implementation.

## 8. Zero-Cost Development Constraints

The project must remain fully usable without an AWS account.

Use:

- Local Docker containers.
- Local PostgreSQL.
- MinIO for S3-compatible object storage.
- Local Terraform execution.
- Terraform mock providers.
- GitHub Actions within available free usage allowances.
- Open-source testing tools.

Do not provision:

- EC2 instances.
- Application Load Balancers.
- RDS instances.
- NAT Gateways.
- Paid S3 storage.
- Secrets Manager resources.

AWS infrastructure should be represented through Terraform configuration and architecture documentation, not actual provisioning.

## 9. Engineering Priorities

Prioritize the following:

1. Reusable Terraform modules.
2. AWS networking and security architecture.
3. Three-tier application architecture.
4. Docker-based local deployment.
5. Infrastructure validation and testing.
6. CI/CD automation.
7. Application functionality.
8. Technical documentation.

Avoid:

- Unnecessary microservices.
- Kubernetes.
- Complex authentication systems.
- Paid cloud dependencies.
- Premature optimization.

Do not claim high availability, performance improvements, concurrent-user capacity or production deployment without actual testing and evidence.

## 10. Your Initial Assignment: Requirements Analysis

Analyze the complete specification above and produce the following.

### A. Problem Understanding

1. Explain the problem this project solves.
2. Explain its primary engineering objectives.
3. Identify its intended users.
4. Distinguish application objectives from infrastructure engineering objectives.

### B. Functional Requirements

Identify and organize all functional requirements for:

- Authentication.
- Project management.
- Task management.
- Kanban functionality.
- File attachments.
- Activity tracking.
- Dashboard statistics.
- Infrastructure automation.
- CI/CD validation.

### C. Non-Functional Requirements

Define appropriate requirements for:

- Security.
- Maintainability.
- Scalability.
- Reliability.
- Testability.
- Performance.
- Observability.
- Portability.
- Cost control.

Distinguish measurable requirements from qualitative engineering goals.

### D. User Roles and Permissions

Identify the necessary application roles and their permissions.

Avoid introducing roles or permission complexity that the application does not require.

### E. System Boundaries

Identify:

- Internal application components.
- External services.
- Infrastructure dependencies.
- Development-time dependencies.
- Optional cloud dependencies.

Clearly distinguish the local development environment from the target AWS environment.

### F. Technology Stack Assessment

Evaluate the proposed technology stack.

For each technology, explain:

- Its responsibility.
- Why it is appropriate.
- Its advantages.
- Its limitations.
- Integration considerations.

Do not replace the proposed stack without explaining a concrete technical reason.

### G. Technical Constraints

Identify all budget, infrastructure, implementation, tooling and deployment constraints.

Pay particular attention to:

- ₹0 budget.
- Local-first execution.
- No mandatory AWS provisioning.
- Terraform mock-provider testing.
- No remote Terraform backend.
- Open-source development tools.
- Limited implementation scope.

### H. Feasibility Assessment

Evaluate whether the complete project can realistically be implemented within the specified seven-day development window.

Identify:

- Critical-path activities.
- High-risk components.
- Dependencies between implementation activities.
- Features that should be simplified.
- Features that can be deferred without compromising the primary engineering objectives.

Do not remove requirements silently.

### I. Risks and Mitigation

Identify technical and project risks, including:

- Terraform configuration errors.
- AWS networking design mistakes.
- Security misconfigurations.
- Docker integration problems.
- Database migration issues.
- Authentication vulnerabilities.
- CI/CD failures.
- Scope expansion.
- Development time constraints.

Provide a practical mitigation strategy for each.

### J. Missing Requirements and Contradictions

Identify:

- Ambiguous requirements.
- Missing acceptance criteria.
- Architectural inconsistencies.
- Potential technology conflicts.
- Requirements that may contradict the zero-cost constraint.
- Assumptions that require approval.

Do not invent answers for unresolved requirements.

## 11. Strict Working Instructions

At this stage:

1. Read the entire project specification.
2. Analyze requirements systematically.
3. Do not write application code.
4. Do not write Terraform code.
5. Do not install packages or dependencies.
6. Do not create project files.
7. Do not modify the repository.
8. Do not change the proposed technology stack.
9. Do not silently remove requirements.
10. Do not begin implementation.

Present the complete analysis in a structured technical report.

Separate confirmed requirements, assumptions, recommendations and unresolved questions.

Where appropriate, use tables and concise technical explanations.

Conclude with:

- Your understanding of DeployStack.
- Recommended project scope.
- Critical technical risks.
- Feasibility assessment.
- Decisions requiring my approval.

**Wait for my explicit approval before proceeding to system architecture design.**