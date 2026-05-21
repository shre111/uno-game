'use client';

import { motion } from 'framer-motion';
import type { Card as CardType } from '../../types';

const COLOR_BG: Record<string, string> = {
  // Light side
  red: '#E8362A',
  blue: '#1A6BB5',
  green: '#2BA350',
  yellow: '#F7C300',
  // Dark side
  pink: '#D81B60',
  orange: '#E65100',
  teal: '#00695C',
  purple: '#6A1B9A',
};

const COLOR_DARK: Record<string, string> = {
  red: '#B52218',
  blue: '#0E4A8A',
  green: '#1A7038',
  yellow: '#C89B00',
  pink: '#AD1457',
  orange: '#BF360C',
  teal: '#004D40',
  purple: '#4A148C',
};

function getLabel(value: string): string {
  if (value === 'skip') return '⊘';
  if (value === 'skipAll') return '⊘⊘';
  if (value === 'reverse') return '↺';
  if (value === 'draw1') return '+1';
  if (value === 'draw2') return '+2';
  if (value === 'draw4') return '+4';
  if (value === 'draw5') return '+5';
  if (value === 'draw6') return '+6';
  if (value === 'draw10') return '+10';
  if (value === 'wild') return 'W';
  if (value === 'wild4') return '+4';
  if (value === 'wildDraw2') return 'W+2';
  if (value === 'wildDrawColor') return 'W🎨';
  if (value === 'flip') return '↕';
  if (value === 'discardAll') return '🗑';
  return value;
}

function getLabelFontSize(value: string, large: boolean): number {
  const base = large ? 28 : 13;
  if (['reverse', 'skip', 'flip', 'discardAll'].includes(value)) return large ? 24 : 12;
  if (['skipAll'].includes(value)) return large ? 18 : 9;
  if (['draw2', 'draw1', 'draw5', 'draw4', 'draw6'].includes(value)) return large ? 22 : 11;
  if (['wild4', 'wildDraw2', 'draw10', 'wildDrawColor'].includes(value)) return large ? 16 : 8;
  return base;
}

// 4-quadrant wild oval matching real UNO card
function WildCenter({ value, w, h, darkSide }: { value: string; w: number; h: number; darkSide?: boolean }) {
  const label = getLabel(value);
  const fontSize = w > 40 ? (label.length > 2 ? 12 : 18) : (label.length > 2 ? 6 : 9);
  const q = darkSide
    ? ['#D81B60', '#E65100', '#00695C', '#6A1B9A']
    : ['#E8362A', '#F7C300', '#1A6BB5', '#2BA350'];
  return (
    <div style={{
      width: w, height: h,
      borderRadius: '50%',
      transform: 'rotate(-25deg)',
      overflow: 'hidden',
      position: 'relative',
      border: '2px solid rgba(255,255,255,0.6)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '50%', background: q[0] }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', background: q[1] }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: '50%', background: q[2] }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '50%', height: '50%', background: q[3] }} />
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
  isDarkSide?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export function Card({ card, isPlayable = false, isSelected = false, isBack = false, isDarkSide = false, onClick, small = false }: CardProps) {
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
          ? (isDarkSide ? '#1a1a3a' : '#E8362A')
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

      {/* Card back */}
      {isBack && (
        <>
          <div style={{
            position: 'absolute', inset: 4,
            border: `2px solid ${isDarkSide ? '#3a3a6a' : darkBg}`,
            borderRadius: BR - 2,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: isDarkSide ? '#6A1B9A' : '#F7C300',
              borderRadius: '50%',
              width: small ? 26 : 48,
              height: small ? 36 : 64,
              transform: 'rotate(-25deg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '2px solid rgba(0,0,0,0.3)',
            }}>
              <span style={{
                color: isDarkSide ? '#D81B60' : '#E8362A', fontWeight: 900,
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
          <div style={{
            position: 'absolute', inset: 4,
            borderRadius: BR - 2,
            border: `2px solid ${darkBg}`,
            pointerEvents: 'none',
          }} />

          {isWild ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WildCenter value={card.value} w={ovalW} h={ovalH} darkSide={isDarkSide} />
            </div>
          ) : (
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

          {/* Top-left corner */}
          <div style={{ position: 'absolute', top: 3, left: 5, lineHeight: 1 }}>
            <span style={{
              color: 'white', fontWeight: 900, fontSize: cornerSize,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              display: 'block',
            }}>{isWild ? label : label}</span>
          </div>

          {/* Bottom-right corner (rotated) */}
          <div style={{ position: 'absolute', bottom: 3, right: 5, lineHeight: 1, transform: 'rotate(180deg)' }}>
            <span style={{
              color: 'white', fontWeight: 900, fontSize: cornerSize,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              display: 'block',
            }}>{isWild ? label : label}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
