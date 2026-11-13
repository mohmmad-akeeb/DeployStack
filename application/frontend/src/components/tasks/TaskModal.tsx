import React, { useState, useEffect } from "react";
import {
  Task,
  TaskCreatePayload,
  TaskPriority,
  TaskStatus,
  ProjectMember,
  TaskUpdatePayload,
} from "../../api/types";
import { tasksApi, formatApiError } from "../../api";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Textarea } from "../common/Textarea";
import { Select } from "../common/Select";
import { Alert } from "../common/Alert";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { FileAttachment } from "./FileAttachment";
import { TaskAssignment } from "./TaskAssignment";
import { Calendar, Trash2, CheckCircle2, Clock } from "lucide-react";

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  task?: Task | null; // null if creating, populated if editing/viewing
  defaultStatus?: TaskStatus;
  projectMembers?: ProjectMember[];
  onTaskSaved: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projectId,
  task,
  defaultStatus = "todo",
  projectMembers = [],
  onTaskSaved,
  onTaskDeleted,
}) => {
  const isEditing = !!task;
  const [activeTab, setActiveTab] = useState<"details" | "assignees" | "attachments">("details");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(task || null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setCurrentTask(task);
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
    } else {
      setCurrentTask(null);
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("medium");
      setDueDate("");
      setActiveTab("details");
    }
    setError(null);
  }, [task, defaultStatus, isOpen]);

  const reloadTask = async () => {
    if (!task?.id) return;
    try {
      const refreshed = await tasksApi.get(task.id);
      setCurrentTask(refreshed);
      onTaskSaved(refreshed);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (isEditing && currentTask) {
        const updatePayload: TaskUpdatePayload = {
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        };
        const updated = await tasksApi.update(currentTask.id, updatePayload);
        setCurrentTask(updated);
        onTaskSaved(updated);
        onClose();
      } else {
        const createPayload: TaskCreatePayload = {
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        };
        const created = await tasksApi.create(createPayload);
        onTaskSaved(created);
        onClose();
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to save task."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask) return;
    setIsDeleting(true);
    setError(null);
    try {
      await tasksApi.delete(currentTask.id);
      setShowDeleteConfirm(false);
      if (onTaskDeleted) onTaskDeleted(currentTask.id);
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Failed to delete task."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? "Task Details" : "Create New Task"}
        size="lg"
        footer={
          activeTab === "details" ? (
            <div className="flex items-center justify-between w-full">
              {isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete Task
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {isEditing ? "Save Changes" : "Create Task"}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

          {/* Navigation Tabs (only when viewing an existing task) */}
          {isEditing && (
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition -mb-px ${
                  activeTab === "details"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Task Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("assignees")}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 ${
                  activeTab === "assignees"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Assignees
                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
                  {currentTask?.assignees?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("attachments")}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 ${
                  activeTab === "attachments"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Attachments
                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
                  {currentTask?.attachments?.length || 0}
                </span>
              </button>
            </div>
          )}

          {/* Tab 1: Task Form */}
          {activeTab === "details" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Task Title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement AWS DynamoDB Terraform module"
                maxLength={200}
              />

              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add contextual details, acceptance criteria, or engineering notes..."
                rows={4}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  options={[
                    { value: "todo", label: "To Do" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                  ]}
                />

                <Select
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "urgent", label: "Urgent" },
                  ]}
                />

                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
                />
              </div>

              {isEditing && currentTask && (
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Created by {currentTask.created_by.full_name}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated: {new Date(currentTask.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </form>
          )}

          {/* Tab 2: Assignees */}
          {activeTab === "assignees" && currentTask && (
            <TaskAssignment
              taskId={currentTask.id}
              assignees={currentTask.assignees || []}
              projectMembers={projectMembers}
              onAssignmentChange={reloadTask}
            />
          )}

          {/* Tab 3: Attachments */}
          {activeTab === "attachments" && currentTask && (
            <FileAttachment
              taskId={currentTask.id}
              attachments={
                (currentTask.attachments || []).map((att) => ({
                  ...att,
                  task_id: currentTask.id,
                  uploader: currentTask.created_by,
                }))
              }
              onAttachmentChange={reloadTask}
            />
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task? All attached files and assignment links will be removed."
        confirmLabel="Delete Task"
        isDangerous
        isLoading={isDeleting}
      />
    </>
  );
};
