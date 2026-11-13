# ADR-008: Stateless JWT Bearer Authentication

## Status
**Accepted**

## Context
DeployStack requires user registration, login, and authorization for projects, tasks, and attachments. We must choose between server-side session cookies (backed by a centralized cache like Redis or DB session tables) and stateless JSON Web Tokens (JWT).

In a horizontally scaled AWS target environment, EC2 instances run in an Auto Scaling Group behind an Application Load Balancer. If server-side sessions were used, instances would either require ALB sticky sessions (session affinity) or a shared Redis cluster (ElastiCache), which adds significant infrastructure complexity and cloud cost.

## Decision
We implement **Stateless JWT Bearer Authentication**:

1. **Token Standard:**
   * Signed using HMAC-SHA256 (`HS256`) with a securely injected secret key (`JWT_SECRET_KEY`).
   * Payload claims include `sub` (user UUID), `email`, `exp` (expiration timestamp, 60 minutes), and `iat` (issued at timestamp).
2. **Token Lifecycle:**
   * Passed via the HTTP standard header: `Authorization: Bearer <token>`.
   * Frontend stores token in browser memory / secure storage and attaches it via an Axios request interceptor.
3. **Password Security:**
   * Hashed using `bcrypt` with a work factor >= 12.
4. **FastAPI Integration:**
   * Native `OAuth2PasswordBearer` scheme and dependency injection (`get_current_user`).

## Consequences

### Positive
* **100% Stateless Compute:** Any container instance behind the ALB or inside Docker Compose can validate incoming requests without querying a cache or database for session state.
* **Zero Additional Infrastructure:** Eliminates the need for Redis, Memcached, or session database tables.
* **Cloud-Native Scalability:** ASG can scale EC2 instances up and down dynamically without breaking active user sessions.

### Negative / Trade-offs
* Tokens cannot be revoked before their expiration time without maintaining a token revocation blocklist. Given the 60-minute lifetime and the project's internal team management scope, this is an acceptable and industry-standard trade-off.

### Neutral
* Secret signing keys are injected locally via `.env` and in AWS via AWS Secrets Manager.
