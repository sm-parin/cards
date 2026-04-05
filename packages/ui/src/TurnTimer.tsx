import { colors } from '@cards/theme';

interface TurnTimerProps {
  /** 0 = expired, 1 = full */
  progress: number;
  /** Remaining seconds to display */
  remainingSeconds?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function TurnTimer({
  progress,
  remainingSeconds,
  size = 48,
  strokeWidth = 4,
  className = '',
}: TurnTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clampedProgress);

  const ringColor = progress > 0.5
    ? colors.myTurn
    : progress > 0.25
    ? colors.warning
    : colors.danger;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.bgBorder}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 100ms linear, stroke 200ms' }}
        />
      </svg>
      {remainingSeconds !== undefined && (
        <div style={{
          position:       'absolute',
          inset:          0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       `${size * 0.28}px`,
          fontWeight:     700,
          color:          ringColor,
        }}>
          {Math.ceil(remainingSeconds)}
        </div>
      )}
    </div>
  );
}
