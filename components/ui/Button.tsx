"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: "var(--surface-elevated)",
    border: "2px solid var(--gold)",
    color: "var(--gold-light)",
    textShadow: "0 0 8px rgba(200,136,42,0.3)",
    boxShadow: "inset 0 1px 0 rgba(240,200,80,0.1)",
  },
  secondary: {
    background: "var(--surface-card)",
    border: "2px solid var(--border-default)",
    color: "var(--text-secondary)",
  },
  danger: {
    background: "var(--surface-elevated)",
    border: "2px solid var(--color-damage)",
    color: "var(--color-damage)",
    textShadow: "0 0 6px rgba(212,88,58,0.3)",
  },
  ghost: {
    background: "transparent",
    border: "2px solid transparent",
    color: "var(--text-secondary)",
  },
};

const sizes = {
  sm: "px-2 py-1 text-[7px]",
  md: "px-3 py-1.5 text-[8px]",
  lg: "px-5 py-2.5 text-[9px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        font-cinzel tracking-widest uppercase cursor-pointer
        transition-all duration-100
        ${sizes[size]}
        ${disabled ? "opacity-40 cursor-not-allowed" : "hover:brightness-125 active:scale-[0.97]"}
        ${className}
      `}
      style={{ borderRadius: 0, ...variantStyles[variant], ...style }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
