import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Project,
  Task,
  TaskStatus,
  ProjectMember,
} from "../api/types";
import { projectsApi, tasksApi, formatApiError } from "../api";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskModal } from "../components/tasks/TaskModal";
import { ProjectModal } from "../components/projects/ProjectModal";
import { Button } from "../components/common/Button";
import { Alert } from "../components/common/Alert";
import { Spinner } from "../components/common/Spinner";
import { EmptyState } from "../components/common/EmptyState";
import {
  Plus,
  Search,
  Filter,
  FolderKanban,
  Kanban as KanbanIcon,
  CheckCircle2,
  Clock,
  ListTodo,
  RefreshCw,
} from "lucide-react";

interface ColumnDefinition {
  id: TaskStatus;
  title: string;
  badgeColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const COLUMNS: ColumnDefinition[] = [
  {
    id: "todo",
    title: "To Do",
    badgeColor: "bg-slate-100 text-slate-700",
    borderColor: "border-slate-300",
    icon: <ListTodo className="w-4 h-4 text-slate-500" />,
  },
  {
    id: "in_progress",
    title: "In Progress",
    badgeColor: "bg-amber-100 text-amber-800",
    borderColor: "border-amber-300",
    icon: <Clock className="w-4 h-4 text-amber-600" />,
  },
  {
    id: "completed",
    title: "Completed",
    badgeColor: "bg-emerald-100 text-emerald-800",
    borderColor: "border-emerald-300",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
];

export const KanbanPage: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(routeProjectId || "");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag and drop tracking
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [targetColumnStatus, setTargetColumnStatus] = useState<TaskStatus>("todo");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // 1. Fetch available projects on mount
  useEffect(() => {
    let mounted = true;
    setIsLoadingProjects(true);
    projectsApi
      .list({ page: 1, page_size: 100 })
      .then((res) => {
        if (!mounted) return;
        setProjects(res.items);
        if (res.items.length > 0) {
          // If route param exists and valid, use it; else select first project
          const validId =
            routeProjectId && res.items.some((p) => p.id === routeProjectId)
              ? routeProjectId
              : res.items[0].id;
          setSelectedProjectId(validId);
        }
      })
      .catch((err) => {
        if (mounted) setError(formatApiError(err, "Failed to load projects."));
      })
      .finally(() => {
        if (mounted) setIsLoadingProjects(false);
      });

    return () => {
      mounted = false;
    };
  }, [routeProjectId]);

  // 2. Fetch tasks and project members when selectedProjectId changes
  const fetchTasksAndMembers = useCallback(async () => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    setIsLoadingTasks(true);
    setError(null);
    try {
      const [tasksRes, membersRes, projRes] = await Promise.all([
        tasksApi.list({
          project_id: selectedProjectId,
          page: 1,
          page_size: 100,
        }),
        projectsApi.getMembers(selectedProjectId, 1, 100),
        projectsApi.get(selectedProjectId),
      ]);
      setTasks(tasksRes.items);
      setProjectMembers(membersRes.items);
      setSelectedProject(projRes);
    } catch (err) {
      setError(formatApiError(err, "Failed to load Kanban tasks."));
    } finally {
      setIsLoadingTasks(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchTasksAndMembers();
  }, [fetchTasksAndMembers]);

  // Handle project selection change
  const handleProjectChange = (newProjId: string) => {
    setSelectedProjectId(newProjId);
    navigate(`/projects/${newProjId}/kanban`, { replace: true });
  };

  // Status transition via API (Persists changes!)
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksApi.updateStatus(taskId, {
        status: newStatus,
        position: 0,
      });
      // Silent refresh to sync timestamps/audit logs
      const updated = await tasksApi.get(taskId);
      setTasks((current) => current.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      // Rollback on failure
      setTasks(previousTasks);
      setError(formatApiError(err, "Failed to update task status. Reverted changes."));
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, columnId: TaskStatus) => {
    // Only clear if leaving the column itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, columnId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === columnId) return;

    await handleUpdateTaskStatus(taskId, columnId);
  };

  // Filter tasks based on search keyword and priority
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority =
      priorityFilter === "all" || t.priority.toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesPriority;
  });

  if (isLoadingProjects) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Initializing Kanban board..." />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kanban Task Board</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual workflow and task state management across To Do, In Progress, and Completed
          </p>
        </div>

        <EmptyState
          icon={<FolderKanban className="w-8 h-8 text-indigo-500" />}
          title="No Project Workspace Found"
          description="You need at least one project workspace to start creating and organizing tasks on the Kanban board."
          actionLabel="Create Project"
          onAction={() => setIsProjectModalOpen(true)}
        />

        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onProjectSaved={(newProj) => {
            setProjects([newProj]);
            setSelectedProjectId(newProj.id);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Board Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <KanbanIcon className="w-6 h-6 text-indigo-600" />
            {selectedProject ? selectedProject.name : "Kanban Board"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {selectedProject?.description ||
              "Drag and drop tasks between To Do, In Progress, and Completed columns."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Workspace Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="kanban-project-select"
              className="text-xs font-semibold text-slate-600 uppercase tracking-wider shrink-0"
            >
              Workspace:
            </label>
            <select
              id="kanban-project-select"
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-slate-300 py-1.5 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs max-w-xs"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setActiveTask(null);
              setTargetColumnStatus("todo");
              setIsTaskModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Task
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchTasksAndMembers}
            isLoading={isLoadingTasks}
            title="Refresh board"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Filter and Search Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full sm:w-36 py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <span className="text-xs text-slate-400 ml-2 shrink-0">
            {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={(e) => handleDragLeave(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`rounded-2xl p-4 flex flex-col min-h-[580px] border transition-all duration-200 ${
                isOver
                  ? "bg-indigo-50/70 border-2 border-indigo-400 shadow-md ring-2 ring-indigo-200"
                  : "bg-slate-100/90 border-slate-200"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  {column.icon}
                  <h3 className="font-bold text-sm text-slate-800">{column.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold shadow-xs ${column.badgeColor}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTask(null);
                    setTargetColumnStatus(column.id);
                    setIsTaskModalOpen(true);
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition"
                  title={`Add task to ${column.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setActiveTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    onStatusChange={handleUpdateTaskStatus}
                  />
                ))}

                {colTasks.length === 0 && (
                  <div
                    className={`border border-dashed rounded-xl p-8 text-center text-xs text-slate-400 transition-colors ${
                      isOver ? "border-indigo-400 text-indigo-600 font-medium" : "border-slate-300"
                    }`}
                  >
                    {isOver ? "Drop task here" : "No tasks in this lane"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Create / Edit Modal (Pages 7, 8, 9 integrated) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={selectedProjectId}
        task={activeTask}
        defaultStatus={targetColumnStatus}
        projectMembers={projectMembers}
        onTaskSaved={() => {
          fetchTasksAndMembers();
        }}
        onTaskDeleted={() => {
          fetchTasksAndMembers();
        }}
      />
    </div>
  );
};
