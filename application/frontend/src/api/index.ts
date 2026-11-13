import { apiClient } from "./client";
import {
  ActivityLogListResponse,
  Attachment,
  ChangePasswordPayload,
  DashboardStatsResponse,
  HealthResponse,
  LoginPayload,
  ProfileUpdatePayload,
  Project,
  ProjectCreatePayload,
  ProjectMemberListResponse,
  ProjectMemberAddPayload,
  ProjectMemberRoleUpdatePayload,
  ProjectMember,
  ProjectListResponse,
  ProjectStatsResponse,
  ProjectStatus,
  ProjectUpdatePayload,
  RegisterPayload,
  Task,
  TaskAssignee,
  TaskAssignPayload,
  TaskCreatePayload,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
  TaskStatusUpdatePayload,
  TaskUpdatePayload,
  TokenResponse,
  User,
} from "./types";

export * from "./types";
export * from "./client";

// ==================== Health API ====================
export const healthApi = {
  async check(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>("/health");
    return response.data;
  },
};

// ==================== Auth API ====================
export const authApi = {
  async register(payload: RegisterPayload): Promise<User> {
    const response = await apiClient.post<User>("/auth/register", payload);
    return response.data;
  },

  async login(payload: LoginPayload): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>("/auth/login", payload);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<User> {
    const response = await apiClient.put<User>("/auth/profile", payload);
    return response.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>("/auth/change-password", payload);
    return response.data;
  },
};

// ==================== Projects API ====================
export const projectsApi = {
  async list(params?: {
    status?: ProjectStatus;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ProjectListResponse> {
    const response = await apiClient.get<ProjectListResponse>("/projects", { params });
    return response.data;
  },

  async get(id: string): Promise<Project> {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  async create(payload: ProjectCreatePayload): Promise<Project> {
    const response = await apiClient.post<Project>("/projects", payload);
    return response.data;
  },

  async update(id: string, payload: ProjectUpdatePayload): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${id}`, payload);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  async getMembers(id: string, page = 1, pageSize = 50): Promise<ProjectMemberListResponse> {
    const response = await apiClient.get<ProjectMemberListResponse>(`/projects/${id}/members`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  async addMember(id: string, payload: ProjectMemberAddPayload): Promise<ProjectMember> {
    const response = await apiClient.post<ProjectMember>(`/projects/${id}/members`, payload);
    return response.data;
  },

  async updateMemberRole(
    id: string,
    userId: string,
    payload: ProjectMemberRoleUpdatePayload
  ): Promise<ProjectMember> {
    const response = await apiClient.put<ProjectMember>(
      `/projects/${id}/members/${userId}/role`,
      payload
    );
    return response.data;
  },

  async removeMember(id: string, userId: string): Promise<void> {
    await apiClient.delete(`/projects/${id}/members/${userId}`);
  },

  async getActivities(id: string, page = 1, pageSize = 20): Promise<ActivityLogListResponse> {
    const response = await apiClient.get<ActivityLogListResponse>(`/projects/${id}/activities`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  async getStats(id: string): Promise<ProjectStatsResponse> {
    const response = await apiClient.get<ProjectStatsResponse>(`/projects/${id}/stats`);
    return response.data;
  },
};

// ==================== Tasks API ====================
export const tasksApi = {
  async list(params: {
    project_id: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<TaskListResponse> {
    const response = await apiClient.get<TaskListResponse>("/tasks", { params });
    return response.data;
  },

  async get(id: string): Promise<Task> {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  async create(payload: TaskCreatePayload): Promise<Task> {
    const response = await apiClient.post<Task>("/tasks", payload);
    return response.data;
  },

  async update(id: string, payload: TaskUpdatePayload): Promise<Task> {
    const response = await apiClient.put<Task>(`/tasks/${id}`, payload);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  async updateStatus(id: string, payload: TaskStatusUpdatePayload): Promise<Task> {
    const response = await apiClient.patch<Task>(`/tasks/${id}/status`, payload);
    return response.data;
  },

  async getAssignments(id: string): Promise<TaskAssignee[]> {
    const response = await apiClient.get<TaskAssignee[]>(`/tasks/${id}/assignments`);
    return response.data;
  },

  async assign(id: string, payload: TaskAssignPayload): Promise<TaskAssignee[]> {
    const response = await apiClient.post<TaskAssignee[]>(`/tasks/${id}/assignments`, payload);
    return response.data;
  },

  async removeAssignment(id: string, userId: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}/assignments/${userId}`);
  },

  async getAttachments(id: string): Promise<Attachment[]> {
    const response = await apiClient.get<Attachment[]>(`/tasks/${id}/attachments`);
    return response.data;
  },

  async uploadAttachment(id: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<Attachment>(`/tasks/${id}/attachments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async getActivities(id: string, page = 1, pageSize = 20): Promise<ActivityLogListResponse> {
    const response = await apiClient.get<ActivityLogListResponse>(`/tasks/${id}/activities`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },
};

// ==================== Attachments API ====================
export const attachmentsApi = {
  getDownloadUrl(id: string): string {
    return `${apiClient.defaults.baseURL}/attachments/${id}/download`;
  },

  async downloadFile(id: string, filename: string): Promise<void> {
    const response = await apiClient.get(`/attachments/${id}/download`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/attachments/${id}`);
  },
};

// ==================== Dashboard API ====================
export const dashboardApi = {
  async getStats(): Promise<DashboardStatsResponse> {
    const response = await apiClient.get<DashboardStatsResponse>("/dashboard/stats");
    return response.data;
  },
};
