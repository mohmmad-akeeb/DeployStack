import React, { useState, useEffect, useCallback } from "react";
import { Project, ProjectStatus } from "../api/types";
import { projectsApi, formatApiError } from "../api";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ProjectModal } from "../components/projects/ProjectModal";
import { Button } from "../components/common/Button";
import { Alert } from "../components/common/Alert";
import { SkeletonCard } from "../components/common/Spinner";
import { EmptyState } from "../components/common/EmptyState";
import { Plus, Search, FolderKanban, Filter, ChevronLeft, ChevronRight } from "lucide-react";

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await projectsApi.list({
        status: statusFilter === "all" ? undefined : (statusFilter as ProjectStatus),
        search: debouncedSearch.trim() || undefined,
        page,
        page_size: 12,
      });
      setProjects(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      setError(formatApiError(err, "Failed to load projects."));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Workspaces</h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize team architecture tasks, track progress, and manage multi-cloud deployments
          </p>
        </div>

        <Button
          type="button"
          size="md"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Project
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 py-1.5 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-8 h-8 text-indigo-500" />}
          title="No projects found"
          description={
            searchQuery || statusFilter !== "all"
              ? "Try adjusting your search criteria or clear status filters."
              : "Get started by creating your first workspace project to organize your team's tasks."
          }
          actionLabel="Create Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{projects.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{total}</span> projects
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Project Create Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectSaved={() => {
          fetchProjects();
        }}
      />
    </div>
  );
};
