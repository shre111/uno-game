'use client';

import { motion } from 'framer-motion';
import type { CardColor } from '../../types';

const COLORS: { color: CardColor; bg: string; label: string }[] = [
  { color: 'red', bg: '#E74C3C', label: 'Red' },
  { color: 'blue', bg: '#3498DB', label: 'Blue' },
  { color: 'green', bg: '#27AE60', label: 'Green' },
  { color: 'yellow', bg: '#F39C12', label: 'Yellow' },
];

interface ColorPickerProps {
  onColorChosen: (color: CardColor) => void;
  onClose?: () => void;
}

export function ColorPicker({ onColorChosen }: ColorPickerProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
      >
        <h2 className="text-white text-xl font-bold">Choose a color</h2>
        <div className="flex gap-4">
          {COLORS.map(({ color, bg, label }) => (
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
