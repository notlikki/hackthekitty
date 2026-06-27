import React from 'react';

interface RarityGlowCardProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'adopted';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const RarityGlowCard: React.FC<RarityGlowCardProps> = ({
  rarity,
  children,
  className = '',
  onClick,
}) => {
  const styles = {
    common: 'border-[#9A938C] bg-[#FFFDF9] shadow-[0_0_12px_rgba(154,147,140,0.15)] focus-within:ring-2 focus-within:ring-[#9A938C]/30',
    uncommon: 'border-[#4E8C5D] bg-[#FFFDF9] shadow-[0_0_15px_rgba(78,140,93,0.2)] focus-within:ring-2 focus-within:ring-[#4E8C5D]/30',
    rare: 'border-[#3882B8] bg-[#FFFDF9] shadow-[0_0_18px_rgba(56,130,184,0.25)] focus-within:ring-2 focus-within:ring-[#3882B8]/30',
    epic: 'border-[#844C9C] bg-[#FFFDF9] shadow-[0_0_22px_rgba(132,76,156,0.35)] focus-within:ring-2 focus-within:ring-[#844C9C]/30',
    legendary: 'border-[#D97706] bg-[#FFFDF9] shadow-[0_0_30px_rgba(217,119,6,0.5)] focus-within:ring-2 focus-within:ring-[#D97706]/30',
    adopted: 'border-[#0F766E] bg-[#F0FDFD] shadow-[0_0_18px_rgba(15,118,110,0.25)] focus-within:ring-2 focus-within:ring-[#0F766E]/30',
  };

  // Add the custom pulse glow animation unless legendary, which can have an even more amplified glow pulse
  const glowPulseClass = rarity === 'legendary' 
    ? 'animate-pulse-glow shadow-[0_0_35px_rgba(217,119,6,0.7)]'
    : rarity === 'epic'
    ? 'animate-pulse-glow shadow-[0_0_25px_rgba(132,76,156,0.5)]'
    : 'hover:shadow-lg transition-all duration-300';

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border-[3px] overflow-hidden ${styles[rarity]} ${glowPulseClass} ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {children}
    </div>
  );
};
