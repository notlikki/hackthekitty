import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check prefers-reduced-motion media query on load and handle updates
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Motion values normalized between 0 and 1
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Soft spring config for responsive tilt and damped return
  const springConfig = { stiffness: 180, damping: 22 };
  
  // Subtle tilt limits (max 5 degrees) to keep it feeling premium, not gimmicky
  const rotateX = useSpring(useTransform(y, [0, 1], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(x, [0, 1], [-5, 5]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    x.set(mouseX / rect.width);
    y.set(mouseY / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  if (reducedMotion) {
    return (
      <div
        ref={cardRef}
        onClick={onClick}
        className={`w-full h-full ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={`w-full h-full perspective-800 ${className}`}
    >
      <div style={{ transform: 'translateZ(10px)', transformStyle: 'preserve-3d' }} className="w-full h-full">
        {children}
      </div>
    </motion.div>
  );
};
