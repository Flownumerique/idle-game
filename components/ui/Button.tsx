"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500",
  secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600",
  danger: "bg-red-700 hover:bg-red-600 text-white border border-red-600",
  ghost: "bg-transparent hover:bg-slate-700 text-slate-300 border border-transparent",
};

const sizes = {
  sm: "px-2 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        rounded font-medium transition-colors cursor-pointer
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
