import React from "react";
import { Link } from "react-router-dom";
import { Project } from "../../api/types";
import { ProjectStatusBadge, ProjectRoleBadge } from "../common/Badge";
import { FolderKanban, Users, CheckSquare, ArrowRight, Calendar } from "lucide-react";

export interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all p-5 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <ProjectRoleBadge role={project.current_user_role} />
            </div>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        <Link to={`/projects/${project.id}`}>
          <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {project.name}
          </h3>
        </Link>

        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {project.description || "No description provided for this project."}
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5" title="Total Tasks">
            <CheckSquare className="w-4 h-4 text-slate-400" />
            <span>{project.task_count} tasks</span>
          </div>

          <div className="flex items-center gap-1.5" title="Team Members">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{project.member_count} members</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            to={`/projects/${project.id}`}
            className="flex-1 text-center py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg transition"
          >
            Overview
          </Link>
          <Link
            to={`/projects/${project.id}/kanban`}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition"
          >
            Kanban
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
