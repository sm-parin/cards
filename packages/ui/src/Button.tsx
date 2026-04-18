'use client';
import { useState } from 'react';
import { radii } from '@cards/theme';
import type { ReactNode, CSSProperties } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const BASE: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--color-brand)',        color: '#fff',                   border: '1px solid transparent' },
  secondary: { background: 'transparent',               color: 'var(--color-fg)',         border: '1px solid var(--color-border)' },
  ghost:     { background: 'transparent',               color: 'var(--color-fg-muted)',   border: '1px solid transparent' },
  danger:    { background: 'var(--color-danger-muted)', color: 'var(--color-danger)',     border: '1px solid color-mix(in srgb, var(--color-danger) 40%, transparent)' },
};

const HOVER: Record<ButtonVariant, Partial<CSSProperties>> = {
  primary:   { background: 'var(--color-brand-hover)', transform: 'translateY(-1px)', boxShadow: '0 6px 20px -4px color-mix(in srgb, var(--color-brand) 50%, transparent)' },
  secondary: { background: 'var(--color-surface-raised)', borderColor: 'var(--color-fg-subtle)' },
  ghost:     { background: 'var(--color-surface)', color: 'var(--color-fg)', borderColor: 'var(--color-border)' },
  danger:    { background: 'color-mix(in srgb, var(--color-danger-muted) 120%, transparent)', transform: 'translateY(-1px)' },
};

const SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '5px 14px',  fontSize: '12px', borderRadius: radii.md },
  md: { padding: '9px 22px',  fontSize: '14px', borderRadius: radii.md },
  lg: { padding: '12px 32px', fontSize: '15px', borderRadius: radii.lg },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...BASE[variant],
        ...SIZES[size],
        ...(hovered && !isDisabled ? HOVER[variant] : {}),
        width:          fullWidth ? '100%' : 'auto',
        fontWeight:     600,
        letterSpacing:  '0.01em',
        whiteSpace:     'nowrap',
        cursor:         isDisabled ? 'not-allowed' : 'pointer',
        opacity:        isDisabled ? 0.45 : 1,
        transition:     'all 150ms ease',
        outline:        'none',
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '6px',
      }}
    >
      {loading
        ? <span className="animate-spin inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent" />
        : children}
    </button>
  );
}
