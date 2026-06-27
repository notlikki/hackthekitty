import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  // Lock scroll on background when active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0.05 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1E1B18]/65 backdrop-blur-xs cursor-pointer"
          />

          {/* Sliding Drawer Body */}
          <motion.div
            initial={prefersReduced ? { opacity: 0, y: 0 } : { y: '100%' }}
            animate={prefersReduced ? { opacity: 1, y: 0 } : { y: 0 }}
            exit={prefersReduced ? { opacity: 0, y: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md bg-[#FFFDF9] rounded-t-[2.5rem] border-t-2 border-slate-200/50 shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden pb-4"
          >
            {/* Grab Bar Handle */}
            <div className="mx-auto mt-3.5 mb-2.5 w-14 h-1.5 rounded-full bg-[#6E665F]/20 shrink-0" />

            {/* Title / Close Header Row */}
            {title && (
              <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
                <h3 className="font-display font-bold text-base text-ink uppercase tracking-wider">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-ink-soft transition active:scale-95"
                  aria-label="Close sheet"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Scrollable sheet content */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
