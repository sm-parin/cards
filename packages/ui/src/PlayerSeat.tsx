import { colors } from '@cards/theme';

interface PlayerSeatProps {
  username: string;
  coins?: number;
  isConnected?: boolean;
  isMyTurn?: boolean;
  isYou?: boolean;
  /** Card count shown as badge */
  cardCount?: number;
  className?: string;
}

export function PlayerSeat({
  username,
  coins,
  isConnected = true,
  isMyTurn = false,
  isYou = false,
  cardCount,
  className = '',
}: PlayerSeatProps) {
  return (
    <div
      className={className}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '4px',
        opacity:       isConnected ? 1 : 0.5,
      }}
    >
      {/* Avatar ring */}
      <div style={{
        width:          '48px',
        height:         '48px',
        borderRadius:   '50%',
        border:         `2px solid ${isMyTurn ? colors.myTurn : isYou ? colors.info : colors.bgBorder}`,
        background:     colors.bgElevated,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '18px',
        fontWeight:     700,
        color:          colors.textPrimary,
        boxShadow:      isMyTurn ? `0 0 12px ${colors.myTurn}66` : 'none',
        transition:     'border-color 200ms, box-shadow 200ms',
        position:       'relative',
      }}>
        {username.charAt(0).toUpperCase()}

        {/* Connection dot */}
        <div style={{
          position:     'absolute',
          bottom:       '1px',
          right:        '1px',
          width:        '10px',
          height:       '10px',
          borderRadius: '50%',
          background:   isConnected ? colors.connected : colors.disconnected,
          border:       `2px solid ${colors.bgPrimary}`,
        }} />
      </div>

      {/* Username */}
      <span style={{
        fontSize:     '12px',
        fontWeight:   isYou ? 600 : 400,
        color:        isYou ? colors.textPrimary : colors.textSecondary,
        maxWidth:     '72px',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {username}{isYou ? ' (you)' : ''}
      </span>

      {/* Card count badge */}
      {cardCount !== undefined && (
        <span style={{
          fontSize:     '11px',
          color:        colors.textMuted,
          background:   colors.bgSubtle,
          padding:      '1px 6px',
          borderRadius: '9999px',
        }}>
          {cardCount}
        </span>
      )}

      {/* Coins */}
      {coins !== undefined && (
        <span style={{ fontSize: '11px', color: colors.accent }}>
          {coins}
        </span>
      )}
    </div>
  );
}
