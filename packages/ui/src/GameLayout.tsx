import React from 'react';

interface GameLayoutProps {
  header: React.ReactNode;
  opponents: React.ReactNode;
  table: React.ReactNode;
  gameInfo: React.ReactNode;
  hand: React.ReactNode;
}

/**
 * GameLayout — universal game table shell.
 *
 * Slot layout (top → bottom):
 *   header    — GameHeader (full width)
 *   opponents — single horizontal row of opponent seats (scrollable)
 *   table     — played cards / phase content (flex-1 center)
 *   bottom    — [ gameInfo (left, fixed width) | hand (right, flex-1) ]
 *
 * Pure layout — no game logic. All game content passed as slots.
 * Inline CSS only (no Tailwind — shared package).
 */
export function GameLayout({ header, opponents, table, gameInfo, hand }: GameLayoutProps) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100dvh',
      overflow:      'hidden',
      background:    '#0a0a0a',
      color:         '#ffffff',
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        {header}
      </div>

      {/* ── Opponents strip ────────────────────────────────────────────────── */}
      <div style={{
        flexShrink:  0,
        display:     'flex',
        gap:         12,
        overflowX:   'auto',
        padding:     '12px 16px',
        borderBottom: '1px solid #1f2937',
        // hide scrollbar but keep scrollable
        scrollbarWidth: 'none',
        msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
      }}>
        {opponents}
      </div>

      {/* ── Table (center play area) ────────────────────────────────────────── */}
      <div style={{
        flex:           1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '16px',
        overflowY:      'auto',
      }}>
        {table}
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink:  0,
        display:     'flex',
        borderTop:   '1px solid #1f2937',
        minHeight:   148,
      }}>
        {/* Game info + timer — left panel */}
        <div style={{
          width:       220,
          flexShrink:  0,
          padding:     '12px 16px',
          borderRight: '1px solid #1f2937',
          overflowY:   'auto',
          display:     'flex',
          flexDirection: 'column',
          gap:         8,
        }}>
          {gameInfo}
        </div>

        {/* Player hand — right area */}
        <div style={{
          flex:        1,
          display:     'flex',
          alignItems:  'center',
          overflowX:   'auto',
          padding:     '8px 16px',
          scrollbarWidth: 'thin',
        }}>
          {hand}
        </div>
      </div>
    </div>
  );
}
