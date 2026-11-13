import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500 shadow-sm border border-transparent",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-400 border border-slate-200",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-sm border border-transparent",
  outline: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 focus-visible:ring-indigo-500 shadow-sm",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400 border border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2 py-1 text-xs rounded",
  sm: "px-3 py-1.5 text-xs font-medium rounded-md",
  md: "px-4 py-2 text-sm font-medium rounded-lg",
  lg: "px-5 py-2.5 text-base font-semibold rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          leftIcon && <span className="mr-2 inline-flex items-center">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 inline-flex items-center">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
