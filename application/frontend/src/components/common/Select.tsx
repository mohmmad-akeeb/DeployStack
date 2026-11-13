import React, { forwardRef } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = "", id, ...props }, ref) => {
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
        <select
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`block w-full text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 px-3 py-2 bg-white ${
            error
              ? "border-rose-300 text-rose-900 focus:ring-rose-500 bg-rose-50/20"
              : "border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
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

Select.displayName = "Select";
