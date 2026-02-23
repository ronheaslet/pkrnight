import type { Card } from '../../lib/holdem/engine';

interface PlayingCardProps {
  card: Card | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SIZE_MAP = {
  sm: { w: 32, h: 44, text: 'text-[10px]', suit: 'text-sm' },
  md: { w: 48, h: 66, text: 'text-xs', suit: 'text-lg' },
  lg: { w: 64, h: 88, text: 'text-sm', suit: 'text-2xl' },
};

export default function PlayingCard({ card, faceDown, size = 'md', highlight }: PlayingCardProps) {
  const dims = SIZE_MAP[size];

  if (faceDown || !card) {
    return (
      <div
        className={`relative rounded-md overflow-hidden flex-shrink-0 ${highlight ? 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]' : ''}`}
        style={{ width: dims.w, height: dims.h }}
      >
        <div
          className="absolute inset-0 bg-[#1e3a5f]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 4px)',
          }}
        />
        <div className="absolute inset-[3px] rounded-sm border border-white/10" />
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed ? 'text-red-600' : 'text-gray-800';
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={`relative bg-white rounded-md flex flex-col justify-between p-[3px] flex-shrink-0 ${
        highlight ? 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]' : 'shadow-md'
      }`}
      style={{ width: dims.w, height: dims.h }}
    >
      {/* Top-left */}
      <div className={`${color} ${dims.text} font-bold leading-none`}>
        <div>{card.rank}</div>
        <div className="leading-none">{symbol}</div>
      </div>

      {/* Center suit */}
      <div className={`${color} ${dims.suit} absolute inset-0 flex items-center justify-center`}>
        {symbol}
      </div>

      {/* Bottom-right (rotated) */}
      <div className={`${color} ${dims.text} font-bold leading-none self-end rotate-180`}>
        <div>{card.rank}</div>
        <div className="leading-none">{symbol}</div>
      </div>
    </div>
  );
}
