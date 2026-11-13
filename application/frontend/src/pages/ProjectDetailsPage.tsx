import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Project,
  ProjectStatsResponse,
  Task,
  ActivityLog,
  ProjectMember,
} from "../api/types";
import { projectsApi, tasksApi, formatApiError } from "../api";
import { ProjectStatusBadge, ProjectRoleBadge, TaskStatusBadge, TaskPriorityBadge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Alert } from "../components/common/Alert";
import { Spinner } from "../components/common/Spinner";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ProjectModal } from "../components/projects/ProjectModal";
import { ProjectMembersModal } from "../components/projects/ProjectMembersModal";
import { TaskModal } from "../components/tasks/TaskModal";
import {
  FolderKanban,
  Kanban,
  Users,
  CheckSquare,
  Activity,
  Edit,
  Trash2,
  Plus,
  Calendar,
  PieChart,
  UserCheck,
} from "lucide-react";

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStatsResponse | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "members" | "activity">("overview");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [projData, statsData, tasksData, membersData, actsData] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.getStats(projectId),
        tasksApi.list({ project_id: projectId, page: 1, page_size: 50 }),
        projectsApi.getMembers(projectId, 1, 100),
        projectsApi.getActivities(projectId, 1, 20),
      ]);
      setProject(projData);
      setStats(statsData);
      setTasks(tasksData.items);
      setMembers(membersData.items);
      setActivities(actsData.items);
    } catch (err) {
      setError(formatApiError(err, "Failed to load project details."));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleDeleteProject = async () => {
    if (!projectId) return;
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectId);
      navigate("/projects");
    } catch (err) {
      setError(formatApiError(err, "Failed to delete project."));
    } finally {
      setIsDeleting(false);
    }
  };

  const canManage = project?.current_user_role === "owner" || project?.current_user_role === "admin";

  if (isLoading) {
    return (
      <div className="py-16">
        <Spinner size="lg" label="Loading project workspace..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-slate-800">Project not found</h3>
        <p className="text-xs text-slate-500 mt-1">This workspace might have been deleted or moved.</p>
        <Link to="/projects" className="mt-4 inline-block text-indigo-600 font-semibold text-xs">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="text-xs text-slate-500 flex items-center gap-2">
        <Link to="/projects" className="hover:text-indigo-600 transition">
          Projects
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 truncate">{project.name}</span>
      </nav>

      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Project Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner shrink-0">
              <FolderKanban className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
                <ProjectStatusBadge status={project.status} />
                <ProjectRoleBadge role={project.current_user_role} />
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {project.description || "No project description provided."}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span>Owner: <strong className="text-slate-700">{project.owner.full_name}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to={`/projects/${project.id}/kanban`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Kanban className="w-4 h-4" />
              Open Kanban
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMembersModalOpen(true)}
              leftIcon={<Users className="w-4 h-4" />}
            >
              Members ({project.member_count})
            </Button>

            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditProjectOpen(true)}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit
              </Button>
            )}

            {project.current_user_role === "owner" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`py-3 px-5 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PieChart className="w-4 h-4" />
          Overview & Metrics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`py-3 px-5 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "tasks"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tasks List ({tasks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`py-3 px-5 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "members"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Members ({members.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`py-3 px-5 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "activity"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity Log
        </button>
      </div>

      {/* Tab 1: Overview & Metrics */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Tasks
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_tasks ?? 0}</h3>
              <p className="text-xs text-slate-400 mt-1">Across all status lanes</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Completion Ratio
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {Math.round((stats?.completed_ratio ?? 0) * 100)}%
              </h3>
              <p className="text-xs text-slate-400 mt-1">Sprint completion velocity</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Members
              </p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">
                {stats?.active_members_count ?? members.length}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Collaborating engineers</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Overdue Tasks
              </p>
              <h3
                className={`text-2xl font-bold mt-1 ${
                  (stats?.overdue_tasks_count ?? 0) > 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {stats?.overdue_tasks_count ?? 0}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Requires immediate update</p>
            </div>
          </div>

          {/* Member Workload Distribution */}
          {stats?.member_workload && stats.member_workload.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Team Member Workload
              </h3>

              <div className="divide-y divide-slate-100">
                {stats.member_workload.map((workload) => (
                  <div
                    key={workload.user.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                        {workload.user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{workload.user.full_name}</p>
                        <p className="text-slate-400 text-[11px]">{workload.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Assigned
                        </span>
                        <p className="font-bold text-slate-800">{workload.assigned_count}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-bold text-amber-500">
                          In Progress
                        </span>
                        <p className="font-bold text-amber-700">{workload.in_progress_count}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-500">
                          Completed
                        </span>
                        <p className="font-bold text-emerald-700">{workload.completed_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tasks List */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Project Tasks ({tasks.length})
            </h3>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-xs text-slate-500 mb-3">No tasks created in this project yet.</p>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedTask(null);
                  setIsTaskModalOpen(true);
                }}
              >
                Create First Task
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsTaskModalOpen(true);
                  }}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <TaskPriorityBadge priority={task.priority} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <TaskStatusBadge status={task.status} />
                    {task.assignees.length > 0 && (
                      <div className="flex items-center -space-x-1.5">
                        {task.assignees.map((a) => (
                          <div
                            key={a.user.id}
                            title={a.user.full_name}
                            className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                          >
                            {a.user.full_name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Members */}
      {activeTab === "members" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Project Members ({members.length})
            </h3>
            {canManage && (
              <Button
                size="sm"
                onClick={() => setIsMembersModalOpen(true)}
                leftIcon={<Users className="w-4 h-4" />}
              >
                Manage Members
              </Button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.user.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    {member.user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{member.user.full_name}</p>
                    <p className="text-[11px] text-slate-400">{member.user.email}</p>
                  </div>
                </div>
                <ProjectRoleBadge role={member.role} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Activity Log */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Audit Trail Feed
          </h3>

          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              No activity logs recorded for this project yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">
                      {act.user?.full_name || "System"}
                    </span>{" "}
                    <span className="text-slate-600">{act.action.replace(/_/g, " ").toLowerCase()}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Type: {act.entity_type} {act.task_id ? `• Task: ${act.task_id}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        project={project}
        onProjectSaved={(updated) => {
          setProject(updated);
          fetchProjectData();
        }}
      />

      {/* Manage Members Modal */}
      <ProjectMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
        currentUserRole={project.current_user_role}
        onMembersUpdated={fetchProjectData}
      />

      {/* Task Modal (Create / Edit) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={project.id}
        task={selectedTask}
        projectMembers={members}
        onTaskSaved={() => {
          fetchProjectData();
        }}
        onTaskDeleted={() => {
          fetchProjectData();
        }}
      />

      {/* Delete Project Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project Workspace"
        message="Are you sure you want to permanently delete this project? All associated tasks, files, and memberships will be destroyed."
        confirmLabel="Delete Project"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
};
