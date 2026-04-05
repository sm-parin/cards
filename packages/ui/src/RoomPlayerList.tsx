import type { RoomPlayer } from '@cards/types';
import { colors, radii } from '@cards/theme';

interface RoomPlayerListProps {
  players: RoomPlayer[];
  currentUserId: string;
  maxPlayers: number;
  className?: string;
}

export function RoomPlayerList({
  players,
  currentUserId,
  maxPlayers,
  className = '',
}: RoomPlayerListProps) {
  const slots = Array.from({ length: maxPlayers });

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {slots.map((_, i) => {
        const player = players[i];
        const isYou = player?.id === currentUserId;

        return (
          <div key={i} style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '10px',
            padding:      '10px 14px',
            borderRadius: radii.lg,
            background:   player ? colors.bgSurface : colors.bgSubtle,
            border:       `1px solid ${player ? colors.bgBorder : 'transparent'}`,
            opacity:      player?.isConnected === false ? 0.5 : 1,
          }}>
            {/* Avatar */}
            <div style={{
              width:          '32px',
              height:         '32px',
              borderRadius:   '50%',
              background:     player ? colors.bgElevated : colors.bgBorder,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '14px',
              fontWeight:     700,
              color:          colors.textPrimary,
              flexShrink:     0,
            }}>
              {player ? player.username.charAt(0).toUpperCase() : ''}
            </div>

            {/* Name */}
            <span style={{
              flex:       1,
              fontSize:   '14px',
              color:      player ? colors.textPrimary : colors.textMuted,
              fontWeight: isYou ? 600 : 400,
            }}>
              {player
                ? `${player.username}${isYou ? ' (you)' : ''}`
                : 'Waiting for player...'}
            </span>

            {/* Connection status */}
            {player && !player.isConnected && (
              <span style={{ fontSize: '11px', color: colors.disconnected }}>
                reconnecting
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
