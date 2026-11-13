import React, { useState, useEffect, useCallback } from "react";
import { ProjectMember, ProjectRole } from "../../api/types";
import { projectsApi, formatApiError } from "../../api";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Alert } from "../common/Alert";
import { Spinner } from "../common/Spinner";
import { ProjectRoleBadge } from "../common/Badge";
import { UserPlus, Shield, Trash2, Mail } from "lucide-react";

export interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentUserRole?: ProjectRole;
  onMembersUpdated?: () => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentUserRole = "member",
  onMembersUpdated,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await projectsApi.getMembers(projectId, 1, 100);
      setMembers(response.items);
    } catch (err) {
      setError(formatApiError(err, "Failed to load project members."));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setEmail("");
      setRole("member");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setSuccess(null);
    setIsAdding(true);

    try {
      await projectsApi.addMember(projectId, {
        email: email.trim().toLowerCase(),
        role,
      });
      setEmail("");
      setSuccess("Member added successfully!");
      fetchMembers();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      setError(formatApiError(err, "Failed to add member to project."));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    setError(null);
    try {
      await projectsApi.updateMemberRole(projectId, userId, { role: newRole });
      fetchMembers();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      setError(formatApiError(err, "Failed to update member role."));
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return;
    }
    setError(null);
    try {
      await projectsApi.removeMember(projectId, userId);
      fetchMembers();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      setError(formatApiError(err, "Failed to remove member."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Members & Roles"
      description={`Manage team collaboration for "${projectName}"`}
      size="lg"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}
        {success && <Alert type="success" message={success} onDismiss={() => setSuccess(null)} />}

        {/* Add Member Form */}
        {canManage && (
          <form
            onSubmit={handleAddMember}
            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-2.5 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Member Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="w-full sm:w-32">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ProjectRole)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <Button
              type="submit"
              size="sm"
              isLoading={isAdding}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
            >
              Add Member
            </Button>
          </form>
        )}

        {/* Members List */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-slate-400" />
            Current Project Members ({members.length})
          </h4>

          {isLoading ? (
            <div className="py-8">
              <Spinner size="md" label="Loading members..." />
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No members found.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {members.map((member) => {
                const isOwner = member.role === "owner";
                return (
                  <div
                    key={member.user.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {member.user.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt={member.user.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          member.user.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {member.user.full_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <ProjectRoleBadge role="owner" />
                      ) : canManage ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.user.id, e.target.value as ProjectRole)
                          }
                          className="text-xs border border-slate-200 rounded-md py-1 px-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <ProjectRoleBadge role={member.role} />
                      )}

                      {canManage && !isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user.id, member.user.full_name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Remove from project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
