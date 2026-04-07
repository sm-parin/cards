import { useState, useEffect, type CSSProperties } from 'react';
import type { Card as CardType } from '@cards/types';
import { colors, radii } from '@cards/theme';

interface CardProps {
  /** Card string e.g. "Q♠", "10♥", "A♦", "J♣". Omit to render face-down. */
  card?: CardType;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Slide-in animation on mount (default true) */
  animate?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  sm: { width: 48,  height: 68,  rankSize: 11, suitSize: 20, faceSize: 22 },
  md: { width: 64,  height: 90,  rankSize: 13, suitSize: 26, faceSize: 30 },
  lg: { width: 80,  height: 112, rankSize: 16, suitSize: 34, faceSize: 38 },
};

const FACE_BADGE: Record<string, string> = { K: '♔', Q: '♕', J: '♖' };

function parseCard(cardStr: CardType) {
  const suit = cardStr.slice(-1) as '♠' | '♥' | '♦' | '♣';
  const rank = cardStr.slice(0, -1);
  const isRed  = suit === '♥' || suit === '♦';
  const isFace = rank === 'K' || rank === 'Q' || rank === 'J';
  const isAce  = rank === 'A';
  return { rank, suit, isRed, isFace, isAce };
}

export function Card({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  size = 'md',
  animate = true,
  onClick,
  className = '',
}: CardProps) {
  const [visible, setVisible] = useState(!animate);
  const dim = SIZE_MAP[size];
  const canClick = !!onClick && !disabled;

  useEffect(() => {
    if (!animate) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const baseStyle: CSSProperties = {
    width:         dim.width,
    height:        dim.height,
    borderRadius:  radii.card,
    border:        '1.5px solid',
    display:       'flex',
    flexDirection: 'column',
    position:      'relative',
    padding:       '4px',
    cursor:        canClick ? 'pointer' : 'default',
    userSelect:    'none',
    flexShrink:    0,
    opacity:       disabled ? 0.4 : visible ? 1 : 0,
    transform:     selected
      ? 'translateY(-8px)'
      : visible ? 'translateY(0)' : 'translateY(-12px)',
    transition:    animate
      ? 'opacity 250ms ease, transform 250ms ease, box-shadow 150ms ease'
      : 'transform 150ms ease, box-shadow 150ms ease',
  };

  // ── Face-down ──────────────────────────────────────────────────────────────
  if (faceDown || !card) {
    return (
      <div
        style={{
          ...baseStyle,
          background:   '#1e3a5f',
          borderColor:  '#2a4a7f',
          backgroundImage:
            'repeating-linear-gradient(45deg, #1a3356 0px, #1a3356 4px, #1e3a5f 4px, #1e3a5f 8px)',
        }}
        className={className}
        onClick={canClick ? onClick : undefined}
      />
    );
  }

  const { rank, suit, isRed, isFace, isAce } = parseCard(card);
  const suitColor  = isRed ? colors.suitRed : colors.suitBlack;
  const borderColor = selected ? colors.accent : '#1e293b';
  const boxShadow   = selected
    ? `0 0 0 2px ${colors.accent}, 0 4px 12px rgba(0,0,0,0.6)`
    : disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.5)';

  return (
    <div
      style={{
        ...baseStyle,
        background:  '#0f172a',
        borderColor,
        boxShadow,
      }}
      className={className}
      onClick={canClick ? onClick : undefined}
    >
      {/* ── Rank top-left ──────────────────────────────────────────────── */}
      {!isAce && (
        <div style={{
          position:      'absolute',
          top:           4,
          left:          5,
          fontSize:      dim.rankSize,
          fontWeight:    800,
          color:         suitColor,
          lineHeight:    1,
          letterSpacing: '-0.5px',
        }}>
          {rank}
        </div>
      )}

      {/* ── Small suit corner (face cards only) ─────────────────────── */}
      {isFace && (
        <div style={{
          position:   'absolute',
          top:        dim.rankSize + 6,
          left:       5,
          fontSize:   dim.rankSize - 2,
          color:      suitColor,
          lineHeight: 1,
          opacity:    0.8,
        }}>
          {suit}
        </div>
      )}

      {/* ── Center content ──────────────────────────────────────────── */}
      <div style={{
        flex:           1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexDirection:  'column',
        gap:            2,
      }}>
        {isAce ? (
          <div style={{ fontSize: dim.faceSize + 10, color: suitColor, lineHeight: 1 }}>
            {suit}
          </div>
        ) : isFace ? (
          <>
            <div style={{ fontSize: dim.faceSize, fontWeight: 900, color: suitColor, lineHeight: 1 }}>
              {rank}
            </div>
            <div style={{ fontSize: dim.rankSize, color: suitColor, opacity: 0.7 }}>
              {FACE_BADGE[rank]}
            </div>
          </>
        ) : (
          <div style={{ fontSize: dim.suitSize, color: suitColor, lineHeight: 1 }}>
            {suit}
          </div>
        )}
      </div>

      {/* ── Rank bottom-right rotated ────────────────────────────────── */}
      {!isAce && (
        <div style={{
          position:      'absolute',
          bottom:        4,
          right:         5,
          fontSize:      dim.rankSize,
          fontWeight:    800,
          color:         suitColor,
          lineHeight:    1,
          transform:     'rotate(180deg)',
          letterSpacing: '-0.5px',
        }}>
          {rank}
        </div>
      )}
    </div>
  );
}
