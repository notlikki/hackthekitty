import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPToastProps {
  message: string;
  xpEarned: number;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export const XPToast: React.FC<XPToastProps> = ({
  message,
  xpEarned,
  isOpen,
  onClose,
  duration = 3500,
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={prefersReduced ? { opacity: 0, y: -20, x: '-50%' } : { y: -80, x: '-50%', opacity: 0 }}
          animate={prefersReduced ? { opacity: 1, y: 0, x: '-50%' } : { y: 16, x: '-50%', opacity: 1 }}
          exit={prefersReduced ? { opacity: 0, y: -20, x: '-50%' } : { y: -80, x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none"
        >
          <div className="bg-[#1E1B18] text-[#FFFDF9] border border-white/10 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center text-sm shrink-0">
                🍖
              </div>
              <div className="text-left">
                <p className="text-xs font-bold font-sans text-[#FFFDF9] leading-tight">{message}</p>
                <p className="text-[9px] text-[#6E665F] uppercase tracking-wider font-mono mt-0.5">Meal Sighting Logged</p>
              </div>
            </div>
            
            <div className="bg-[#D97706]/20 border border-[#D97706]/30 text-[#D97706] font-mono font-black text-xs px-2.5 py-1 rounded-xl shrink-0 tracking-wider">
              +{xpEarned} XP
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
