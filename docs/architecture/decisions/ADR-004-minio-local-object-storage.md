# ADR-004: Local S3-Compatible Object Storage & Streaming Proxy — MinIO

## Status
**Accepted**

## Context
DeployStack supports file attachments on tasks (documents, images, specifications) up to 10MB per file.
In the target AWS cloud architecture, binary files are stored in an Amazon S3 bucket.
In the local development and testing environment, developers must be able to upload, store, and download attachments with zero cloud spend and zero dependency on live AWS infrastructure.

Furthermore, how file uploads and downloads are mediated across container boundaries poses significant architecture challenges:
* Direct client-to-storage presigned URLs signed within Docker Compose generate hostname mismatches (`http://minio:9000` inside containers vs. `http://localhost:9000` on the host machine).
* Direct public storage access bypasses fine-grained application-level authorization checks.

## Decision Drivers
* **Cloud API Parity:** The backend storage adapter code must use standard AWS SDK tooling (`boto3.client('s3')`) without maintaining separate code paths for local vs. cloud storage.
* **₹0 Budget Compliance:** Zero dependency on paid cloud storage for local testing or CI/CD execution.
* **Security & Authorization Enforcement:** Every file access request must be authenticated and authorized via JWT and project membership checks.
* **Seamless Local Developer Experience:** Developers should run `docker compose up` and have fully working file storage out of the box with zero `/etc/hosts` hacking.

## Considered Alternatives

### Alternative 1: Local Filesystem Storage (`/var/data/uploads`)
* **Pros:** Simple to implement using standard Python file operations (`open()`, `shutil`).
* **Cons (Rejected):**
  * Breaks cloud parity: backend code would require branching `if ENV == "local": use_filesystem() else: use_s3()`.
  * In a multi-instance production ASG, local filesystem storage on an EC2 instance is not shared; files uploaded to instance A are inaccessible to instance B unless costly distributed filesystems (Amazon EFS) are provisioned.

### Alternative 2: LocalStack AWS Emulator
* **Pros:** Emulates multiple AWS services (S3, Secrets Manager, RDS) in a single container.
* **Cons (Rejected):**
  * Heavy container image and slow startup times (>45-60s) in CI runners.
  * Licensing restrictions on advanced features; potential version incompatibilities.
  * Unnecessary overhead when only S3 object storage is required locally.

### Alternative 3: MinIO S3-Compatible Storage with Backend Streaming Proxy (Chosen)
* **Pros:**
  * **100% S3 API Compatibility:** Standard `boto3` operations (`put_object`, `get_object`, `delete_object`) run identically against MinIO and Amazon S3.
  * **Lightweight & High-Speed:** MinIO is a single compiled Go binary that launches in under 2 seconds with minimal memory consumption (~50MB).
  * **FastAPI Streaming Proxy:** Files are uploaded to FastAPI (`POST /attachments`) and downloaded via FastAPI (`GET /attachments/{id}/download`). FastAPI streams bytes to/from MinIO/S3 using Starlette's `StreamingResponse`.
  * **Unified Endpoint Injection:** Only an environment variable `S3_ENDPOINT_URL` differs between local (`http://minio:9000`) and AWS (empty / standard AWS endpoint).

## Decision Outcome
We adopt **MinIO** as the local object storage engine and implement a **Unified Storage Adapter with Backend Streaming Proxy** in FastAPI.

## Consequences

### Positive
* **Zero Hostname / DNS Friction:** Because the client browser communicates exclusively with FastAPI (`http://localhost:8000`), no presigned URL hostname translation issues occur between host and Docker network.
* **Fine-Grained Authorization:** Every download is verified against the database and project membership before streaming a single byte.
* **Private Credentials:** Storage access keys and bucket names remain completely hidden from the client browser.
* **True Cloud Parity:** Switching to AWS S3 in production requires zero application code changes—only environment variable updates.

### Negative / Trade-offs
* File transfer bytes pass through the FastAPI backend container, adding minor container I/O compared to direct-to-S3 presigned transfers. Given the 10MB file limit and internal team use case, this overhead is negligible and well within performance limits.

### Neutral
* MinIO data is persisted locally via a named Docker volume (`minio_data`). An initialization script or container creates the default bucket (`deploystack-attachments`) upon startup.
