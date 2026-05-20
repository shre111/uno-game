'use client';

import { motion } from 'framer-motion';
import type { Card as CardType } from '../../types';

const COLOR_MAP: Record<string, string> = {
  red: '#E74C3C',
  blue: '#3498DB',
  green: '#27AE60',
  yellow: '#F39C12',
};

const WILD_GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

function cardBackground(color: string): string {
  if (color === 'wild') return WILD_GRADIENT;
  return COLOR_MAP[color] ?? '#555';
}

function formatValue(value: string): string {
  if (value === 'skip') return '⊘';
  if (value === 'reverse') return '↻';
  if (value === 'draw2') return '+2';
  if (value === 'wild') return 'W';
  if (value === 'wild4') return '+4';
  return value;
}

interface CardProps {
  card: CardType;
  isPlayable?: boolean;
  isSelected?: boolean;
  isBack?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export function Card({ card, isPlayable = false, isSelected = false, isBack = false, onClick, small = false }: CardProps) {
  const bg = isBack ? 'linear-gradient(135deg, #1a1a2e, #e74c3c)' : cardBackground(card.color);
  const label = isBack ? '' : formatValue(card.value);
  const w = small ? 'w-10' : 'w-16';
  const h = small ? 'h-14' : 'h-24';
  const textSize = small ? 'text-xs' : 'text-lg';
  const cornerSize = small ? 'text-[8px]' : 'text-[10px]';

  return (
    <motion.div
      onClick={isPlayable || isBack ? undefined : undefined}
      onTap={onClick}
      className={`relative ${w} ${h} rounded-lg cursor-pointer select-none flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-md`}
      style={{ background: bg }}
      animate={isSelected ? { y: -20, scale: 1.08 } : { y: 0, scale: 1 }}
      whileHover={isPlayable ? { y: -12, scale: 1.05 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {isPlayable && !isSelected && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ boxShadow: `0 0 12px 4px ${COLOR_MAP[card.color] ?? '#fff'}` }}
        />
      )}

      {!isBack && (
        <>
          {/* corners */}
          <span className={`absolute top-1 left-1 ${cornerSize} font-bold text-white leading-none`}>{label}</span>
          <span className={`absolute bottom-1 right-1 ${cornerSize} font-bold text-white leading-none rotate-180`}>{label}</span>

          {/* center oval */}
          <div className="w-10 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <span className={`${textSize} font-black text-white drop-shadow`}>{label}</span>
          </div>
        </>
      )}

      {isBack && (
        <div className="w-10 h-14 rounded-lg border-2 border-white/40 flex items-center justify-center">
          <span className="text-white/60 text-xs font-bold">UNO</span>
        </div>
      )}
    </motion.div>
  );
}
