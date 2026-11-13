-- DeployStack Authoritative Relational DDL (PostgreSQL 16)
-- Target: Zero-cost Docker Compose & AWS RDS PostgreSQL Multi-AZ

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 3. PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_projects_owner_id FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_projects_status CHECK (status IN ('active', 'archived', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);

DROP TRIGGER IF EXISTS set_timestamp_projects ON projects;
CREATE TRIGGER set_timestamp_projects
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 4. PROJECT MEMBERS TABLE (M:N Membership)
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_project_members PRIMARY KEY (project_id, user_id),
    CONSTRAINT fk_pm_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_pm_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_pm_user_id ON project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_pm_project_role ON project_members (project_id, role);

DROP TRIGGER IF EXISTS set_timestamp_project_members ON project_members;
CREATE TRIGGER set_timestamp_project_members
BEFORE UPDATE ON project_members
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 5. TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'todo',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    position INTEGER NOT NULL DEFAULT 0,
    due_date TIMESTAMPTZ DEFAULT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tasks_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_tasks_status CHECK (status IN ('todo', 'in_progress', 'completed')),
    CONSTRAINT ck_tasks_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT ck_tasks_position CHECK (position >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON tasks (project_id, status, position);
CREATE INDEX IF NOT EXISTS idx_tasks_project_created ON tasks (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date) WHERE due_date IS NOT NULL;

DROP TRIGGER IF EXISTS set_timestamp_tasks ON tasks;
CREATE TRIGGER set_timestamp_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 6. TASK ASSIGNMENTS TABLE (Decoupled M:N Work Delegation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_assignments (
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    assigned_by UUID DEFAULT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'assignee',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_task_assignments PRIMARY KEY (task_id, user_id),
    CONSTRAINT fk_ta_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_ta_role CHECK (role IN ('assignee', 'reviewer', 'watcher'))
);

CREATE INDEX IF NOT EXISTS idx_ta_user_id ON task_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_ta_assigned_by ON task_assignments (assigned_by);

-- ============================================================================
-- 7. ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    uploader_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_attachments_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_attachments_uploader_id FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_attachments_s3_key UNIQUE (s3_key),
    CONSTRAINT ck_attachments_file_size CHECK (file_size > 0 AND file_size <= 10485760)
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments (task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader_id ON attachments (uploader_id);

DROP TRIGGER IF EXISTS set_timestamp_attachments ON attachments;
CREATE TRIGGER set_timestamp_attachments
BEFORE UPDATE ON attachments
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- 8. ACTIVITY LOGS TABLE (Append-Only Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    task_id UUID DEFAULT NULL,
    user_id UUID DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_act_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_act_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    CONSTRAINT fk_act_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_act_entity_type CHECK (entity_type IN ('project', 'task', 'member', 'assignment', 'attachment'))
);

CREATE INDEX IF NOT EXISTS idx_act_project_created ON activity_logs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_act_task_created ON activity_logs (task_id, created_at DESC) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_act_user_created ON activity_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_act_metadata_gin ON activity_logs USING GIN (metadata);
