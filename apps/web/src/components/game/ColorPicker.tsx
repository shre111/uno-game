'use client';

import { motion } from 'framer-motion';
import type { CardColor } from '../../types';

const LIGHT_COLORS: { color: CardColor; bg: string; label: string }[] = [
  { color: 'red', bg: '#E74C3C', label: 'Red' },
  { color: 'blue', bg: '#3498DB', label: 'Blue' },
  { color: 'green', bg: '#27AE60', label: 'Green' },
  { color: 'yellow', bg: '#F39C12', label: 'Yellow' },
];

const DARK_COLORS: { color: CardColor; bg: string; label: string }[] = [
  { color: 'pink', bg: '#D81B60', label: 'Pink' },
  { color: 'orange', bg: '#E65100', label: 'Orange' },
  { color: 'teal', bg: '#00695C', label: 'Teal' },
  { color: 'purple', bg: '#6A1B9A', label: 'Purple' },
];

interface ColorPickerProps {
  onColorChosen: (color: CardColor) => void;
  onClose?: () => void;
  isDarkSide?: boolean;
}

export function ColorPicker({ onColorChosen, isDarkSide = false }: ColorPickerProps) {
  const colors = isDarkSide ? DARK_COLORS : LIGHT_COLORS;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Mobile: slides up from bottom; Desktop: centered card */}
      <motion.div
        className="w-full sm:w-auto bg-gray-900 sm:rounded-2xl rounded-t-3xl p-8 flex flex-col items-center gap-6 shadow-2xl"
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {/* drag handle on mobile */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 -mt-3 mb-2" />
        <h2 className="text-white text-xl font-bold">Choose a color</h2>
        <div className="flex gap-4">
          {colors.map(({ color, bg, label }) => (
            <motion.button
              key={color}
              className="w-16 h-16 rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-white/50"
              style={{ backgroundColor: bg }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onColorChosen(color)}
              aria-label={label}
            />
          ))}
        </div>
        <p className="text-white/40 text-sm">You must pick a color to continue</p>
      </motion.div>
    </motion.div>
  );
}
