import React, { useState } from "react";
import { ProjectMember, TaskAssignee } from "../../api/types";
import { tasksApi, formatApiError } from "../../api";
import { Button } from "../common/Button";
import { Alert } from "../common/Alert";
import { UserCheck, UserPlus, X } from "lucide-react";

export interface TaskAssignmentProps {
  taskId: string;
  assignees: TaskAssignee[];
  projectMembers: ProjectMember[];
  onAssignmentChange: () => void;
  canEdit?: boolean;
}

export const TaskAssignment: React.FC<TaskAssignmentProps> = ({
  taskId,
  assignees,
  projectMembers,
  onAssignmentChange,
  canEdit = true,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("assignee");
  const [isLoading, setIsLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedUserIds = new Set(assignees.map((a) => a.user.id));
  const availableMembers = projectMembers.filter((m) => !assignedUserIds.has(m.user.id));

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setError(null);
    setIsLoading(true);
    try {
      await tasksApi.assign(taskId, {
        user_ids: [selectedUserId],
        role: selectedRole,
      });
      setSelectedUserId("");
      onAssignmentChange();
    } catch (err) {
      setError(formatApiError(err, "Failed to assign team member."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setError(null);
    setRemovingId(userId);
    try {
      await tasksApi.removeAssignment(taskId, userId);
      onAssignmentChange();
    } catch (err) {
      setError(formatApiError(err, "Failed to remove assignment."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Add Assignment Form */}
      {canEdit && availableMembers.length > 0 && (
        <form onSubmit={handleAssign} className="flex flex-col sm:flex-row gap-2 items-center">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select project member...</option>
            {availableMembers.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.full_name} ({m.user.email})
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full sm:w-36 text-xs rounded-lg border border-slate-300 py-2 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="assignee">Assignee</option>
            <option value="reviewer">Reviewer</option>
            <option value="watcher">Watcher</option>
          </select>

          <Button
            type="submit"
            size="sm"
            disabled={!selectedUserId}
            isLoading={isLoading}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto shrink-0"
          >
            Assign
          </Button>
        </form>
      )}

      {/* Current Assignees */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-slate-500" />
          Assigned Members ({assignees.length})
        </h5>

        {assignees.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">No members assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assignees.map((assignee) => (
              <div
                key={assignee.user.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
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
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {assignee.user.full_name}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">{assignee.role}</p>
                  </div>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemove(assignee.user.id)}
                    disabled={removingId === assignee.user.id}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Remove assignment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
