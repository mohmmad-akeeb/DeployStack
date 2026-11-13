import React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export type AlertType = "error" | "warning" | "success" | "info";

export interface AlertProps {
  type?: AlertType;
  title?: string;
  message?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig = {
  error: {
    container: "bg-rose-50 border-rose-200 text-rose-800",
    icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    closeBtn: "text-rose-600 hover:bg-rose-100",
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0" />,
    closeBtn: "text-amber-600 hover:bg-amber-100",
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    closeBtn: "text-emerald-600 hover:bg-emerald-100",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    closeBtn: "text-blue-600 hover:bg-blue-100",
  },
};

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  message,
  onDismiss,
  className = "",
}) => {
  const config = alertConfig[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all ${config.container} ${className}`}
    >
      {config.icon}
      <div className="flex-1">
        {title && <h5 className="font-semibold text-sm leading-tight mb-0.5">{title}</h5>}
        {message && <div className="text-xs leading-relaxed opacity-90">{message}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 rounded-md transition-colors ${config.closeBtn}`}
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
