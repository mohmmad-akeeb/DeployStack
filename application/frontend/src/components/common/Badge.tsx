import React from "react";
import { TaskPriority, TaskStatus, ProjectRole, ProjectStatus } from "../../api/types";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "slate" | "indigo" | "emerald" | "amber" | "rose" | "purple" | "blue";
  size?: "xs" | "sm" | "md";
  className?: string;
}

const colorMap = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
};

const sizeMap = {
  xs: "px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
  sm: "px-2 py-0.5 text-xs font-medium",
  md: "px-2.5 py-1 text-xs font-semibold",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "slate",
  size = "sm",
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase ${colorMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus | string; size?: "xs" | "sm" | "md" }> = ({
  status,
  size = "sm",
}) => {
  switch (status) {
    case "todo":
      return (
        <Badge variant="slate" size={size}>
          To Do
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="amber" size={size}>
          In Progress
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="emerald" size={size}>
          Completed
        </Badge>
      );
    default:
      return (
        <Badge variant="slate" size={size}>
          {status}
        </Badge>
      );
  }
};

export const TaskPriorityBadge: React.FC<{
  priority: TaskPriority | string;
  size?: "xs" | "sm" | "md";
}> = ({ priority, size = "xs" }) => {
  switch (priority) {
    case "urgent":
      return (
        <Badge variant="rose" size={size}>
          Urgent
        </Badge>
      );
    case "high":
      return (
        <Badge variant="rose" size={size}>
          High
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="indigo" size={size}>
          Medium
        </Badge>
      );
    case "low":
    default:
      return (
        <Badge variant="slate" size={size}>
          Low
        </Badge>
      );
  }
};

export const ProjectStatusBadge: React.FC<{
  status: ProjectStatus | string;
  size?: "xs" | "sm" | "md";
}> = ({ status, size = "xs" }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="emerald" size={size}>
          Active
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="blue" size={size}>
          Completed
        </Badge>
      );
    case "archived":
      return (
        <Badge variant="slate" size={size}>
          Archived
        </Badge>
      );
    default:
      return (
        <Badge variant="slate" size={size}>
          {status}
        </Badge>
      );
  }
};

export const ProjectRoleBadge: React.FC<{ role: ProjectRole | string; size?: "xs" | "sm" }> = ({
  role,
  size = "xs",
}) => {
  switch (role) {
    case "owner":
      return (
        <Badge variant="purple" size={size}>
          Owner
        </Badge>
      );
    case "admin":
      return (
        <Badge variant="indigo" size={size}>
          Admin
        </Badge>
      );
    case "member":
      return (
        <Badge variant="blue" size={size}>
          Member
        </Badge>
      );
    case "viewer":
    default:
      return (
        <Badge variant="slate" size={size}>
          Viewer
        </Badge>
      );
  }
};
