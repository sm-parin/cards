import type { Card } from '@cards/types';
import { colors, radii } from '@cards/theme';

interface CardProps {
  /** Card string e.g. "Q♠", "10♥", "A♦", "J♣". Omit to render face-down. */
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  sm: { width: '48px',  height: '68px',  fontSize: '12px', rankSize: '11px' },
  md: { width: '64px',  height: '90px',  fontSize: '16px', rankSize: '14px' },
  lg: { width: '80px',  height: '112px', fontSize: '20px', rankSize: '18px' },
};

const SUIT_DISPLAY: Record<string, string> = {
  '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣',
};

function parseCard(cardStr: Card) {
  const suit = cardStr.slice(-1);
  const rank = cardStr.slice(0, -1);
  const isRed = suit === '♥' || suit === '♦';
  return { rank, suit: SUIT_DISPLAY[suit] ?? suit, isRed };
}

export function Card({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  size = 'md',
  onClick,
  className = '',
}: CardProps) {
  const dim = SIZE_MAP[size];
  const canClick = !!onClick && !disabled;

  const baseStyle: React.CSSProperties = {
    width:          dim.width,
    height:         dim.height,
    borderRadius:   radii.card,
    border:         '1px solid',
    display:        'flex',
    flexDirection:  'column',
    justifyContent: 'space-between',
    padding:        '4px',
    cursor:         canClick ? 'pointer' : 'default',
    userSelect:     'none',
    transition:     'transform 150ms ease, box-shadow 150ms ease',
    transform:      selected ? 'translateY(-8px)' : 'translateY(0)',
    flexShrink:     0,
  };

  if (faceDown || !card) {
    return (
      <div
        style={{
          ...baseStyle,
          background:  '#1e3a5f',
          borderColor: '#2a4a7f',
          backgroundImage:
            'repeating-linear-gradient(45deg, #1a3356 0px, #1a3356 4px, #1e3a5f 4px, #1e3a5f 8px)',
        }}
        className={className}
        onClick={canClick ? onClick : undefined}
      />
    );
  }

  const { rank, suit, isRed } = parseCard(card);
  const suitColor = isRed ? colors.suitRed : colors.suitBlack;

  return (
    <div
      style={{
        ...baseStyle,
        background:  colors.bgElevated,
        borderColor: selected ? colors.accent : colors.bgBorder,
        boxShadow:   selected
          ? `0 0 0 2px ${colors.accent}`
          : disabled
          ? 'none'
          : '0 2px 4px rgba(0,0,0,0.4)',
        opacity: disabled ? 0.5 : 1,
      }}
      className={className}
      onClick={canClick ? onClick : undefined}
    >
      <div style={{ fontSize: dim.rankSize, fontWeight: 700, color: suitColor, lineHeight: 1 }}>
        {rank}
      </div>
      <div style={{ fontSize: dim.fontSize, textAlign: 'center', color: suitColor }}>
        {suit}
      </div>
      <div style={{
        fontSize:   dim.rankSize,
        fontWeight: 700,
        color:      suitColor,
        lineHeight: 1,
        transform:  'rotate(180deg)',
        alignSelf:  'flex-end',
      }}>
        {rank}
      </div>
    </div>
  );
}
