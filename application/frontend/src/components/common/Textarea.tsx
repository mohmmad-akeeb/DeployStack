import React, { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = "", id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`block w-full text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 p-3 ${
            error
              ? "border-rose-300 text-rose-900 placeholder-rose-300 focus:ring-rose-500 bg-rose-50/20"
              : "border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          } ${className}`}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-rose-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
