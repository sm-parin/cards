"use client";

import React from "react";

type ButtonVariant = "primary" | "outline" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary hover:bg-primary-dark text-white font-semibold",
  outline: "border border-border text-foreground hover:bg-surface font-semibold",
  danger:  "bg-danger hover:opacity-90 text-white font-semibold",
};

export default function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center",
        "px-6 py-3 rounded-lg",
        "text-base transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "cursor-pointer",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
