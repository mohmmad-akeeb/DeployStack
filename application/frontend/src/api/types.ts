/**
 * DeployStack Frontend API Types & Interfaces
 * Accurately aligned with backend Pydantic models and API specification.
 */

export interface HealthResponse {
  status: "healthy" | "degraded" | string;
  environment: string;
  database_connected: boolean;
  version: string;
}

// ==================== User & Auth Types ====================

export interface UserBrief {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  avatar_url?: string | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

// ==================== Project Types ====================

export type ProjectStatus = "active" | "archived" | "completed";
export type ProjectRole = "owner" | "admin" | "member" | "viewer";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  owner: UserBrief;
  member_count: number;
  task_count: number;
  current_user_role: ProjectRole;
  created_at: string;
  updated_at?: string | null;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProjectCreatePayload {
  name: string;
  description?: string;
  status?: ProjectStatus;
}

export interface ProjectUpdatePayload {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
}

export interface ProjectMember {
  project_id: string;
  user: UserBrief;
  role: ProjectRole;
  joined_at: string;
}

export interface ProjectMemberListResponse {
  items: ProjectMember[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProjectMemberAddPayload {
  email: string;
  role?: ProjectRole;
}

export interface ProjectMemberRoleUpdatePayload {
  role: ProjectRole;
}

// ==================== Task Types ====================

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskAssignee {
  task_id: string;
  user: UserBrief;
  role: string;
  assigned_by?: UserBrief | null;
  assigned_at: string;
}

export interface TaskAttachmentBrief {
  id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploader_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  due_date?: string | null;
  created_by: UserBrief;
  assignees: TaskAssignee[];
  attachments: TaskAttachmentBrief[];
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TaskCreatePayload {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  due_date?: string | null;
  assigned_user_ids?: string[];
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  due_date?: string | null;
}

export interface TaskStatusUpdatePayload {
  status: TaskStatus;
  position: number;
}

export interface TaskAssignPayload {
  user_ids: string[];
  role?: string;
}

// ==================== Attachment Types ====================

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploader: UserBrief;
  created_at: string;
}

// ==================== Activity & Audit Types ====================

export interface ActivityLog {
  id: string;
  project_id: string;
  task_id?: string | null;
  user?: UserBrief | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLogListResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  page_size: number;
}

// ==================== Dashboard & Metrics Types ====================

export interface MemberWorkload {
  user: UserBrief;
  assigned_count: number;
  in_progress_count: number;
  completed_count: number;
}

export interface DashboardStatsResponse {
  total_assigned_tasks: number;
  tasks_by_status: Record<TaskStatus | string, number>;
  tasks_by_priority: Record<TaskPriority | string, number>;
  tasks_due_within_7_days: number;
  overdue_tasks_count: number;
  active_projects_count: number;
  recent_activities: ActivityLog[];
}

export interface ProjectStatsResponse {
  project_id: string;
  total_tasks: number;
  status_distribution: Record<TaskStatus | string, number>;
  priority_distribution: Record<TaskPriority | string, number>;
  overdue_tasks_count: number;
  completed_ratio: number;
  active_members_count: number;
  member_workload: MemberWorkload[];
}

// ==================== Error Envelope ====================

export interface ApiErrorDetail {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
  field?: string;
  issue?: string;
}

export interface ApiErrorResponse {
  status_code?: number;
  error?: string;
  message?: string;
  detail?: string | ApiErrorDetail[];
  timestamp?: string;
  path?: string;
}
