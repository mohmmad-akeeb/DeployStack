import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, formatApiError, DashboardStatsResponse } from "../api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { Alert } from "../components/common/Alert";
import { Skeleton } from "../components/common/Spinner";
import { ProjectModal } from "../components/projects/ProjectModal";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ListTodo,
  AlertTriangle,
  ArrowRight,
  Activity,
  Plus,
  RefreshCw,
  Calendar,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      setError(formatApiError(err, "Failed to load dashboard metrics."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatActivityText = (act: DashboardStatsResponse["recent_activities"][0]) => {
    const meta = act.metadata || {};
    switch (act.action) {
      case "PROJECT_CREATED":
        return `Created project "${meta.name || "Workspace"}"`;
      case "TASK_CREATED":
        return `Created task "${meta.title || "Task"}"`;
      case "TASK_STATUS_CHANGED":
        return `Moved task to ${meta.new_status || "new status"}`;
      case "TASK_ASSIGNED":
        return `Assigned member to task`;
      case "ATTACHMENT_UPLOADED":
        return `Uploaded file "${meta.file_name || "Attachment"}"`;
      default:
        return `${act.action.replace(/_/g, " ").toLowerCase()}`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name || "Engineer"}
            </h1>
            <p className="mt-2 text-indigo-100 text-xs sm:text-sm leading-relaxed">
              Track multi-cloud workspace initiatives, Kanban sprint status, and team assignments
              persisted in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateProjectModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Project
            </Button>
            <Link
              to="/kanban"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold text-xs shadow-sm hover:bg-indigo-50 transition"
            >
              Open Kanban
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={
            <div className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <Button size="xs" variant="outline" onClick={fetchStats} leftIcon={<RefreshCw className="w-3 h-3" />}>
                Retry
              </Button>
            </div>
          }
        />
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Projects
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-14 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.active_projects_count ?? 0}
              </h3>
            )}
            <Link
              to="/projects"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2 inline-flex items-center gap-1"
            >
              View all projects <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Assigned Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Tasks
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-14 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.total_assigned_tasks ?? 0}
              </h3>
            )}
            <p className="text-xs text-slate-400 mt-2">Active across workspaces</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ListTodo className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Tasks In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tasks In Progress
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-14 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats?.tasks_by_status?.in_progress ?? 0}
              </h3>
            )}
            <p className="text-xs text-amber-600 font-medium mt-2">Currently being executed</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Overdue Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Tasks
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-14 mt-1" />
            ) : (
              <h3
                className={`text-2xl font-bold mt-1 ${
                  (stats?.overdue_tasks_count ?? 0) > 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {stats?.overdue_tasks_count ?? 0}
              </h3>
            )}
            <p className="text-xs text-slate-400 mt-2">Needs immediate attention</p>
          </div>
          <div
            className={`p-3 rounded-xl ${
              (stats?.overdue_tasks_count ?? 0) > 0
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Breakdown: Status Distribution & Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            Tasks by Status
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-600">To Do</span>
                  <span className="font-semibold text-slate-900">
                    {stats?.tasks_by_status?.todo ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-slate-500 h-2 rounded-full"
                    style={{
                      width: `${
                        Math.min(
                          100,
                          (((stats?.tasks_by_status?.todo ?? 0) /
                            Math.max(1, stats?.total_assigned_tasks ?? 1)) *
                            100)
                        )
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-600">In Progress</span>
                  <span className="font-semibold text-amber-700">
                    {stats?.tasks_by_status?.in_progress ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{
                      width: `${
                        Math.min(
                          100,
                          (((stats?.tasks_by_status?.in_progress ?? 0) /
                            Math.max(1, stats?.total_assigned_tasks ?? 1)) *
                            100)
                        )
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-600">Completed</span>
                  <span className="font-semibold text-emerald-700">
                    {stats?.tasks_by_status?.completed ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${
                        Math.min(
                          100,
                          (((stats?.tasks_by_status?.completed ?? 0) /
                            Math.max(1, stats?.total_assigned_tasks ?? 1)) *
                            100)
                        )
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-indigo-600" />
            Priority Distribution
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold uppercase text-rose-700">Urgent</span>
                <p className="text-xl font-extrabold text-rose-800 mt-0.5">
                  {stats?.tasks_by_priority?.urgent ?? 0}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                <span className="text-[10px] font-bold uppercase text-orange-700">High</span>
                <p className="text-xl font-extrabold text-orange-800 mt-0.5">
                  {stats?.tasks_by_priority?.high ?? 0}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold uppercase text-indigo-700">Medium</span>
                <p className="text-xl font-extrabold text-indigo-800 mt-0.5">
                  {stats?.tasks_by_priority?.medium ?? 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-600">Low</span>
                <p className="text-xl font-extrabold text-slate-800 mt-0.5">
                  {stats?.tasks_by_priority?.low ?? 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Deadlines (Next 7 Days)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tasks approaching target delivery milestones
            </p>

            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
              <span className="text-3xl font-extrabold text-indigo-700">
                {stats?.tasks_due_within_7_days ?? 0}
              </span>
              <p className="text-xs text-indigo-900 font-medium mt-1">Due within the upcoming week</p>
            </div>
          </div>

          <Link
            to="/kanban"
            className="mt-4 w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold text-center transition"
          >
            Review in Kanban Board
          </Link>
        </div>
      </div>

      {/* Recent Activities Audit Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Recent Audit Trail
          </h3>
          <span className="text-xs text-slate-400">Live Workspace Activity</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !stats?.recent_activities || stats.recent_activities.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-6 text-center">
            No recent activity recorded yet. Create projects and tasks to see audit logs.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recent_activities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {act.user?.full_name ? act.user.full_name.charAt(0).toUpperCase() : "S"}
                  </div>
                  <div>
                    <p className="text-slate-800 font-medium">
                      <span className="font-semibold text-slate-900">
                        {act.user?.full_name || "System"}
                      </span>{" "}
                      {formatActivityText(act)}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      Entity: {act.entity_type} • Action: {act.action}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(act.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onProjectSaved={() => {
          fetchStats();
        }}
      />
    </div>
  );
};
