import React from "react";
import { Task, TaskStatus } from "../../api/types";
import { TaskPriorityBadge } from "../common/Badge";
import {
  Paperclip,
  Calendar,
  GripVertical,
  CheckCircle2,
  Clock,
} from "lucide-react";

export interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  onStatusChange,
  onDragStart,
}) => {
  const isOverdue =
    task.due_date &&
    task.status !== "completed" &&
    new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    if (onDragStart) {
      onDragStart(e, task.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group bg-white rounded-xl p-4 shadow-xs border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative select-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {/* Top Header: Drag handle, priority badge, and status transition quick actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <TaskPriorityBadge priority={task.priority} />
        </div>

        {/* Quick status cycle button */}
        {onStatusChange && (
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {task.status !== "todo" && (
              <button
                type="button"
                onClick={() => onStatusChange(task.id, "todo")}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded text-[10px]"
                title="Move to To Do"
              >
                To Do
              </button>
            )}
            {task.status !== "in_progress" && (
              <button
                type="button"
                onClick={() => onStatusChange(task.id, "in_progress")}
                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded text-[10px]"
                title="Move to In Progress"
              >
                <Clock className="w-3 h-3" />
              </button>
            )}
            {task.status !== "completed" && (
              <button
                type="button"
                onClick={() => onStatusChange(task.id, "completed")}
                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded text-[10px]"
                title="Mark Completed"
              >
                <CheckCircle2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task Title */}
      <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
        {task.title}
      </h4>

      {/* Task Description Preview */}
      {task.description && (
        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-3">
          {task.description}
        </p>
      )}

      {/* Card Footer: Metadata (due date, attachments, assignees) */}
      <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span
              className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                isOverdue
                  ? "bg-rose-50 text-rose-600 font-semibold"
                  : "text-slate-500 bg-slate-50"
              }`}
              title={isOverdue ? "Overdue" : "Due date"}
            >
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <span
              className="flex items-center gap-0.5 text-[11px] text-slate-500"
              title={`${task.attachments.length} attachment(s)`}
            >
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
        </div>

        {/* Assignees avatars */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.slice(0, 3).map((assignee) => (
              <div
                key={assignee.user.id}
                title={`${assignee.user.full_name} (${assignee.role})`}
                className="w-6 h-6 rounded-full ring-2 ring-white bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold"
              >
                {assignee.user.avatar_url ? (
                  <img
                    src={assignee.user.avatar_url}
                    alt={assignee.user.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  assignee.user.full_name.charAt(0).toUpperCase()
                )}
              </div>
            ))
          ) : (
            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
          )}
          {task.assignees && task.assignees.length > 3 && (
            <span className="w-6 h-6 rounded-full ring-2 ring-white bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-semibold">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
