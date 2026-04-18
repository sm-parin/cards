'use client';
import { useState, type CSSProperties } from 'react';

// ─── Avatar helpers ───────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PlatformHeaderProps {
  userId?: string | null;
  displayName?: string | null;
  coins?: number;
  shellUrl: string;
  onLogout: () => void;
  onAvatarClick?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

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

// ─── Avatar helpers ───────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PlatformHeaderProps {
  /** User ID — used for avatar colour. Null/empty = guest mode (show Login). */
  userId?: string | null;
  /** Pre-computed display name: nickname ?? email.split('@')[0] ?? username */
  displayName?: string | null;
  coins?: number;
  /** URL of the shell app — used for the logo link and Login redirect. */
  shellUrl: string;
  /** Called when Logout is clicked. */
  onLogout: () => void;
  /** Called when the avatar circle is clicked (e.g. open profile). */
  onAvatarClick?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlatformHeader({
  userId,
  displayName,
  coins,
  shellUrl,
  onLogout,
  onAvatarClick,
}: PlatformHeaderProps) {
  const isGuest = !userId || userId === '';
  const name = displayName || 'Guest';

  const headerStyle: CSSProperties = {
    borderBottom: '1px solid #1f2937',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0a0a0a',
    flexShrink: 0,
  };

  const rightStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  return (
    <header style={headerStyle}>
      <a
        href={shellUrl}
        style={{ fontWeight: 600, color: '#fff', textDecoration: 'none', fontSize: '16px' }}
      >
        Cards
      </a>

      <div style={rightStyle}>
        {isGuest ? (
          <a
            href={`${shellUrl}/login`}
            style={{ fontSize: '14px', color: '#d1d5db', textDecoration: 'none' }}
          >
            Login
          </a>
        ) : (
          <>
            {/* COIN SYSTEM DISABLED
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {coins ?? 0} coins
            </span>
            */}
            <div
              onClick={onAvatarClick}
              title={name}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: avatarColor(userId!),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: 12,
                userSelect: 'none',
                flexShrink: 0,
                cursor: onAvatarClick ? 'pointer' : 'default',
              }}
            >
              {initials(name)}
            </div>
            <span style={{ fontSize: '14px', color: '#fff' }}>{name}</span>
            <button
              onClick={onLogout}
              style={{
                fontSize: '14px',
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
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
