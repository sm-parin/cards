'use client';
import { useState, type CSSProperties } from 'react';

// â”€â”€â”€ Avatar helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f43f5e', '#a855f7',
];

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function avatarColor(userId: string): string {
  return PALETTE[djb2Hash(userId) % PALETTE.length];
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface PlatformHeaderProps {
  userId?: string | null;
  displayName?: string | null;
  coins?: number;
  shellUrl: string;
  onLogout: () => void;
  onAvatarClick?: () => void;
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function PlatformHeader({
  userId,
  displayName,
  shellUrl,
  onLogout,
  onAvatarClick,
}: PlatformHeaderProps) {
  const [logoutHovered, setLogoutHovered] = useState(false);
  const isGuest = !userId || userId === '';
  const name = displayName || 'Guest';

  const headerStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--color-bg, #0a0a0f) 85%, transparent)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--color-border, #2a2a3a)',
    padding: '0 24px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  return (
    <header style={headerStyle}>
      <a
        href={shellUrl}
        style={{
          fontWeight: 700,
          color: 'var(--color-fg, #fff)',
          textDecoration: 'none',
          fontSize: '15px',
          letterSpacing: '-0.01em',
        }}
      >
        Cards
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isGuest ? (
          <a
            href={`${shellUrl}/login`}
            style={{
              fontSize: '13px',
              color: 'var(--color-fg-muted, #9898b0)',
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--color-border, #2a2a3a)',
              transition: 'all 150ms ease',
            }}
          >
            Sign in
          </a>
        ) : (
          <>
            <button
              onClick={onAvatarClick}
              title={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                cursor: onAvatarClick ? 'pointer' : 'default',
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  backgroundColor: avatarColor(userId!),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 11,
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {initials(name)}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--color-fg, #fff)', fontWeight: 500 }}>{name}</span>
            </button>

            <button
              onClick={onLogout}
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              style={{
                fontSize: '13px',
                color: logoutHovered ? 'var(--color-danger, #f87171)' : 'var(--color-fg-subtle, #4a4a60)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                transition: 'color 150ms ease',
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
