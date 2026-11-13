import React, { useState } from "react";
import { Attachment } from "../../api/types";
import { attachmentsApi, tasksApi, formatApiError } from "../../api";
import { Button } from "../common/Button";
import { Alert } from "../common/Alert";
import { Spinner } from "../common/Spinner";
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  FileCode,
  FileArchive,
  Image as ImageIcon,
} from "lucide-react";

export interface FileAttachmentProps {
  taskId: string;
  attachments: Attachment[];
  onAttachmentChange: () => void;
  canEdit?: boolean;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({
  taskId,
  attachments,
  onAttachmentChange,
  canEdit = true,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    if (contentType.includes("zip") || contentType.includes("tar") || contentType.includes("gzip"))
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    if (contentType.includes("json") || contentType.includes("javascript") || contentType.includes("python"))
      return <FileCode className="w-5 h-5 text-emerald-500" />;
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 25MB
    if (file.size > 25 * 1024 * 1024) {
      setError("File exceeds maximum allowed upload size of 25MB.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      await tasksApi.uploadAttachment(taskId, file);
      onAttachmentChange();
    } catch (err) {
      setError(formatApiError(err, "Failed to upload file."));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.id);
    setError(null);
    try {
      await attachmentsApi.downloadFile(attachment.id, attachment.file_name);
    } catch (err) {
      setError(formatApiError(err, "Failed to download file."));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await attachmentsApi.delete(id);
      onAttachmentChange();
    } catch (err) {
      setError(formatApiError(err, "Failed to delete attachment."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Upload Zone */}
      {canEdit && (
        <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-5 text-center transition bg-slate-50/50 hover:bg-indigo-50/20">
          <input
            type="file"
            id={`file-upload-${taskId}`}
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <label
            htmlFor={`file-upload-${taskId}`}
            className="cursor-pointer flex flex-col items-center justify-center space-y-1"
          >
            {isUploading ? (
              <Spinner size="md" label="Uploading to MinIO S3..." />
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-indigo-500 mb-1" />
                <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  Click to select file or drag & drop
                </span>
                <span className="text-[11px] text-slate-400">
                  PDF, DOCX, TXT, PNG, JPG, ZIP (up to 25MB)
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Attachments List */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Attachments ({attachments.length})
        </h5>
        {attachments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No files attached to this task yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                    {getFileIcon(file.content_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate" title={file.file_name}>
                      {file.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>By {file.uploader.full_name}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleDownload(file)}
                    isLoading={downloadingId === file.id}
                    title="Download file"
                  >
                    <Download className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
                  </Button>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDelete(file.id)}
                      isLoading={deletingId === file.id}
                      title="Delete attachment"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
