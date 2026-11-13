# ADR-007: Target Cloud Architecture & Deployment Model — AWS Three-Tier Multi-AZ VPC

## Status
**Accepted**

## Context
DeployStack requires a target cloud architecture that demonstrates production-grade reliability, security isolation, defense-in-depth, and scalability on Amazon Web Services (AWS).

The application comprises a web presentation layer, a stateless application API compute layer, a relational transactional persistence layer, an object storage service, and secret management.

We must choose a target cloud hosting and deployment topology that adheres to the **AWS Well-Architected Framework** while remaining practical, cost-transparent, and testable under a ₹0 development budget.

## Decision Drivers
* **Defense-in-Depth & Network Segmentation:** Absolute isolation between public ingress, application execution, and database storage. Compute and persistence tiers must never have public IP addresses.
* **High Availability & Fault Tolerance:** Elimination of single points of failure across all tiers by leveraging multiple Availability Zones (Multi-AZ).
* **Operational Simplicity & Industry Alignment:** The deployment model should reflect the classic, universally recognized enterprise three-tier pattern.
* **FinOps Transparency:** Clear understanding of cost drivers (e.g., NAT Gateways, Multi-AZ RDS) with mechanisms to toggle expensive components during development.

## Considered Alternatives

### Alternative 1: Serverless Architecture (AWS Lambda + API Gateway + DynamoDB / Aurora Serverless)
* **Pros:** Scale-to-zero pricing, zero OS maintenance.
* **Cons (Rejected):**
  * Cold start latency impacts interactive user experience.
  * Lambda execution model requires significant restructuring of FastAPI applications (Mangum adapter) and connection pooling workarounds for relational databases (RDS Proxy).
  * Obscures fundamental infrastructure automation concepts (VPC routing, subnets, EC2 user-data bootstrapping, security groups).

### Alternative 2: Container Orchestration on AWS (Amazon EKS / Kubernetes)
* **Pros:** Industry-standard container orchestration; fine-grained pod scheduling.
* **Cons (Rejected):**
  * Massive architectural bloat for a single modular monolith application.
  * EKS control plane incurs \$72/month fixed baseline cost just to exist.
  * Explicitly forbidden by project requirements to prevent unnecessary complexity.

### Alternative 3: Elastic Beanstalk
* **Pros:** Automated provisioning of EC2 and ALB.
* **Cons (Rejected):**
  * Black-box abstraction that hides IaC mechanics and limits granular VPC network design.
  * Legacy technology superseded by modern Terraform module composition.

### Alternative 4: Three-Tier Multi-AZ VPC with ALB, EC2 ASG, and RDS Multi-AZ (Chosen)
* **Approach:**
  * **VPC:** `10.0.0.0/16` across two Availability Zones (`az-a`, `az-b`).
  * **Tier 1 (Presentation):** Public subnets hosting dual-AZ Application Load Balancer (ALB) and NAT Gateways.
  * **Tier 2 (Application):** Private application subnets hosting EC2 Auto Scaling Group running Dockerized FastAPI containers.
  * **Tier 3 (Database):** Private database subnets hosting Amazon RDS PostgreSQL Multi-AZ cluster.
  * **Supporting Cloud Services:** Amazon S3 for file attachments (SSE-S3 encrypted) and AWS Secrets Manager for credentials.
* **Pros:**
  * Clean separation of concerns across public, private, and isolated network tiers.
  * Zero public IP addresses on application servers or databases.
  * Automatic multi-AZ failover for both compute (ALB + ASG self-healing) and persistence (RDS synchronous standby).
  * Direct alignment with enterprise reference architectures and AWS Well-Architected Framework.

## Decision Outcome
We adopt the **Three-Tier Multi-AZ VPC Architecture** as DeployStack's target cloud deployment model.

## Consequences

### Positive
* **Strict Security Boundaries:** Traffic flows only forward through chained security groups (`ALB -> EC2 -> RDS`). Direct internet ingress to compute and data tiers is physically impossible.
* **Fault Tolerance:** Outage of a complete AWS Availability Zone triggers automatic load balancer re-routing and RDS failover with zero manual intervention.
* **Predictable Autoscaling:** EC2 Auto Scaling Group scales dynamically based on CloudWatch CPU and request count metrics.
* **Clean IaC Translation:** The architecture maps 1:1 into reusable Terraform modules (`networking`, `security`, `load-balancer`, `compute`, `database`, `storage`).

### Negative / Trade-offs
* Provisioning this architecture in live AWS incurs real costs (~$128/month), primarily driven by dual NAT Gateways and Multi-AZ RDS.
* Mitigated completely by parameterizing NAT Gateway creation in Terraform (`enable_nat_gateway = false` in `dev`) and verifying the architecture in CI using Terraform 1.7+ mock providers without live provisioning.

### Neutral
* Static frontend assets can be delivered via CloudFront/S3 or served via Nginx on the compute tier.
