"use client";

import React from "react";

/** Supported button style variants */
type ButtonVariant = "primary" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Full-width button */
  fullWidth?: boolean;
}

/** Tailwind class sets per variant — sourced from CSS theme tokens */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary hover:bg-primary-dark text-white font-semibold",
  outline:
    "border border-border text-foreground hover:bg-surface font-semibold",
};

/**
 * Reusable button primitive.
 *
 * Accepts a `variant` prop to switch between visual styles.
 * All styles reference CSS theme tokens — no hardcoded values.
 *
 * @example
 * <Button variant="primary" onClick={handlePlay}>Play Now</Button>
 */
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
