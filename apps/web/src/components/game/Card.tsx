'use client';

import { motion } from 'framer-motion';
import type { Card as CardType } from '../../types';

const COLOR_BG: Record<string, string> = {
  red: '#E8362A',
  blue: '#1A6BB5',
  green: '#2BA350',
  yellow: '#F7C300',
};

const COLOR_DARK: Record<string, string> = {
  red: '#B52218',
  blue: '#0E4A8A',
  green: '#1A7038',
  yellow: '#C89B00',
};

function getLabel(value: string): string {
  if (value === 'skip') return '⊘';
  if (value === 'reverse') return '↺';
  if (value === 'draw2') return '+2';
  if (value === 'wild') return 'W';
  if (value === 'wild4') return '+4';
  return value;
}

function getLabelFontSize(value: string, large: boolean): number {
  const base = large ? 28 : 13;
  if (value === 'reverse' || value === 'skip') return large ? 24 : 12;
  if (value === 'draw2') return large ? 22 : 11;
  if (value === 'wild4') return large ? 18 : 10;
  return base;
}

// 4-quadrant wild oval matching real UNO card
function WildCenter({ value, w, h }: { value: string; w: number; h: number }) {
  const label = value === 'wild4' ? '+4' : 'W';
  const fontSize = w > 40 ? 18 : 9;
  return (
    <div style={{
      width: w, height: h,
      borderRadius: '50%',
      transform: 'rotate(-25deg)',
      overflow: 'hidden',
      position: 'relative',
      border: '2px solid rgba(255,255,255,0.6)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '50%', background: '#E8362A' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', background: '#F7C300' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', background: '#1A6BB5' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '50%', height: '50%', background: '#2BA350' }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'rotate(25deg)',
      }}>
        <span style={{
          color: 'white', fontWeight: 900, fontSize,
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          letterSpacing: '-0.5px',
        }}>{label}</span>
      </div>
    </div>
  );
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
  const isWild = card.color === 'wild';
  const bg = isWild ? '#1C1C1C' : (COLOR_BG[card.color] ?? '#555');
  const darkBg = isWild ? '#000' : (COLOR_DARK[card.color] ?? '#333');
  const label = getLabel(card.value);

  const W = small ? 46 : 86;
  const H = small ? 66 : 120;
  const BR = small ? 6 : 10;
  const BW = small ? 2 : 3;
  const cornerSize = small ? 9 : 13;
  const ovalW = small ? 28 : 54;
  const ovalH = small ? 40 : 76;
  const centerFontSize = getLabelFontSize(card.value, !small);

  return (
    <motion.div
      onTap={onClick}
      style={{
        width: W, height: H,
        borderRadius: BR,
        border: `${BW}px solid white`,
        background: isBack
          ? '#E8362A'
          : bg,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        boxShadow: isSelected
          ? `0 0 0 3px #fff, 0 12px 32px rgba(0,0,0,0.6)`
          : isPlayable
            ? `0 0 14px 3px ${bg}cc, 0 4px 12px rgba(0,0,0,0.4)`
            : `0 4px 12px rgba(0,0,0,0.4)`,
        flexShrink: 0,
      }}
      animate={isSelected ? { y: -22, scale: 1.1 } : { y: 0, scale: 1 }}
      whileHover={isPlayable ? { y: -14, scale: 1.06 } : {}}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
    >
      {/* Pulsing ring for playable cards */}
      {isPlayable && !isSelected && (
        <motion.div
          style={{ position: 'absolute', inset: -BW, borderRadius: BR + BW, border: '3px solid #fff' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {/* Card back - physical UNO style */}
      {isBack && (
        <>
          {/* Dark border inset */}
          <div style={{
            position: 'absolute', inset: 4,
            border: `2px solid ${darkBg}`,
            borderRadius: BR - 2,
          }} />
          {/* UNO oval */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: '#F7C300',
              borderRadius: '50%',
              width: small ? 26 : 48,
              height: small ? 36 : 64,
              transform: 'rotate(-25deg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '2px solid rgba(0,0,0,0.3)',
            }}>
              <span style={{
                color: '#E8362A', fontWeight: 900,
                fontSize: small ? 7 : 13,
                transform: 'rotate(25deg)',
                letterSpacing: '-0.5px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}>UNO</span>
            </div>
          </div>
        </>
      )}

      {/* Card face */}
      {!isBack && (
        <>
          {/* Background inner border (darker shade) */}
          <div style={{
            position: 'absolute', inset: 4,
            borderRadius: BR - 2,
            border: `2px solid ${darkBg}`,
            pointerEvents: 'none',
          }} />

          {isWild ? (
            /* Wild card center */
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WildCenter value={card.value} w={ovalW} h={ovalH} />
            </div>
          ) : (
            /* Colored card — white oval with value */
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: ovalW, height: ovalH,
                background: 'white',
                borderRadius: '50%',
                transform: 'rotate(-25deg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                <span style={{
                  color: bg,
                  fontWeight: 900,
                  fontSize: centerFontSize,
                  lineHeight: 1,
                  transform: 'rotate(25deg)',
                  display: 'block',
                  textShadow: 'none',
                }}>
                  {label}
                </span>
              </div>
            </div>
          )}

          {/* Top-left corner value */}
          <div style={{ position: 'absolute', top: 3, left: 5, lineHeight: 1 }}>
            <span style={{
              color: 'white', fontWeight: 900, fontSize: cornerSize,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              display: 'block',
            }}>{isWild ? (card.value === 'wild4' ? '+4' : 'W') : label}</span>
          </div>

          {/* Bottom-right corner value (rotated) */}
          <div style={{ position: 'absolute', bottom: 3, right: 5, lineHeight: 1, transform: 'rotate(180deg)' }}>
            <span style={{
              color: 'white', fontWeight: 900, fontSize: cornerSize,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              display: 'block',
            }}>{isWild ? (card.value === 'wild4' ? '+4' : 'W') : label}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
