import type { Card as CardType } from '@cards/types';
import { Card } from './Card';

interface CardHandProps {
  cards: CardType[];
  faceDown?: boolean;
  selectedCards?: CardType[];
  disabledCards?: CardType[];
  onCardClick?: (card: CardType, index: number) => void;
  size?: 'sm' | 'md' | 'lg';
  /** Overlap cards to save space — useful for large hands */
  overlap?: boolean;
  className?: string;
}

export function CardHand({
  cards,
  faceDown = false,
  selectedCards = [],
  disabledCards = [],
  onCardClick,
  size = 'md',
  overlap = false,
  className = '',
}: CardHandProps) {
  return (
    <div
      className={className}
      style={{
        display:        'flex',
        flexWrap:       'nowrap',
        gap:            overlap ? '0' : '6px',
        alignItems:     'flex-end',
        justifyContent: 'flex-start',
        overflowX:      'auto',
      }}
    >
      {cards.map((card, i) => {
        const isSelected = selectedCards.includes(card);
        const isDisabled = disabledCards.includes(card);
        return (
          <div
            key={`${card}-${i}`}
            style={overlap ? { marginLeft: i === 0 ? 0 : '-16px' } : undefined}
          >
            <Card
              card={card}
              faceDown={faceDown}
              selected={isSelected}
              disabled={isDisabled}
              size={size}
              onClick={onCardClick ? () => onCardClick(card, i) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
