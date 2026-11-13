import React from "react";
import { Loader2 } from "lucide-react";

export const Spinner: React.FC<{
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}> = ({ size = "md", className = "", label }) => {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status">
      <Loader2 className={`animate-spin text-indigo-600 ${sizeMap[size]}`} />
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200 rounded ${className}`}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-3 border-t border-slate-100 flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
};
