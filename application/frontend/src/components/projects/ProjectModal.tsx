import React, { useState, useEffect } from "react";
import { Project, ProjectCreatePayload, ProjectStatus, ProjectUpdatePayload } from "../../api/types";
import { projectsApi, formatApiError } from "../../api";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import { Select } from "../common/Select";
import { Alert } from "../common/Alert";

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onProjectSaved: (project: Project) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onProjectSaved,
}) => {
  const isEditing = !!project;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setStatus(project.status);
    } else {
      setName("");
      setDescription("");
      setStatus("active");
    }
    setError(null);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (isEditing && project) {
        const payload: ProjectUpdatePayload = {
          name: name.trim(),
          description: description.trim() || null,
          status,
        };
        const updated = await projectsApi.update(project.id, payload);
        onProjectSaved(updated);
        onClose();
      } else {
        const payload: ProjectCreatePayload = {
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        };
        const created = await projectsApi.create(payload);
        onProjectSaved(created);
        onClose();
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to save project."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Project Workspace" : "Create New Project"}
      description={
        isEditing
          ? "Update workspace metadata and lifecycle status."
          : "Create a new project workspace to organize tasks and collaborate with team members."
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {isEditing ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

        <Input
          label="Project Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. AWS Core Infrastructure"
          maxLength={150}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the scope, objectives, or infrastructure architecture..."
          rows={3}
        />

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          options={[
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
          ]}
        />
      </form>
    </Modal>
  );
};
