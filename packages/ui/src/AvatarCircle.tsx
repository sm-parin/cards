'use client';

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

function getColor(userId: string): string {
  return PALETTE[djb2Hash(userId) % PALETTE.length];
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export interface AvatarCircleProps {
  userId: string | undefined;
  displayName: string | undefined | null;
  size?: number;
}

export function AvatarCircle({ userId, displayName, size = 36 }: AvatarCircleProps) {
  const safeId = userId || 'default';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getColor(safeId),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 600,
        fontSize: Math.round(size * 0.38),
        userSelect: 'none',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      {getInitials(displayName)}
    </div>
  );
}
