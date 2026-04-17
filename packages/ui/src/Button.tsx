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

// Use CSS custom properties so each app's theme tokens are picked up automatically.
const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--color-brand)',         color: 'var(--color-bg, #000)',  border: 'none' },
  secondary: { background: 'var(--color-surface)',       color: 'var(--color-fg)',
               border: '1px solid var(--color-border)' },
  ghost:     { background: 'transparent',                color: 'var(--color-fg-muted)',
               border: '1px solid transparent' },
  danger:    { background: 'var(--color-danger-muted)',  color: 'var(--color-danger)',
               border: '1px solid var(--color-danger)' },
};

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '4px 12px',  fontSize: '12px', borderRadius: radii.md },
  md: { padding: '8px 20px',  fontSize: '14px', borderRadius: radii.md },
  lg: { padding: '12px 28px', fontSize: '16px', borderRadius: radii.lg },
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
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        width:          fullWidth ? '100%' : 'auto',
        fontWeight:     600,
        cursor:         isDisabled ? 'not-allowed' : 'pointer',
        opacity:        isDisabled ? 0.5 : 1,
        transition:     'opacity 150ms, transform 100ms',
        outline:        'none',
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '6px',
      }}
    >
      {loading ? '...' : children}
    </button>
  );
}
