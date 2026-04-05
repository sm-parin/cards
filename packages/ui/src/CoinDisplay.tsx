'use client';

import { useState, useEffect, useRef } from 'react';
import { colors } from '@cards/theme';

interface CoinDisplayProps {
  amount: number;
  showDelta?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { fontSize: '12px', iconSize: '14px' },
  md: { fontSize: '14px', iconSize: '16px' },
  lg: { fontSize: '18px', iconSize: '20px' },
};

export function CoinDisplay({
  amount,
  showDelta = true,
  size = 'md',
  className = '',
}: CoinDisplayProps) {
  const dim = SIZE_MAP[size];
  const prevAmount = useRef(amount);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const diff = amount - prevAmount.current;
    if (showDelta && diff !== 0) {
      setDelta(diff);
      const timer = setTimeout(() => setDelta(null), 2000);
      prevAmount.current = amount;
      return () => clearTimeout(timer);
    }
    prevAmount.current = amount;
  }, [amount, showDelta]);

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}
    >
      <span style={{ fontSize: dim.iconSize }}>🪙</span>
      <span style={{ fontSize: dim.fontSize, fontWeight: 600, color: colors.accent }}>
        {amount.toLocaleString()}
      </span>

      {delta !== null && (
        <span style={{
          position:     'absolute',
          top:          '-20px',
          left:         '50%',
          transform:    'translateX(-50%)',
          fontSize:     dim.fontSize,
          fontWeight:   700,
          color:        delta > 0 ? colors.success : colors.danger,
          whiteSpace:   'nowrap',
          pointerEvents:'none',
        }}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
}
