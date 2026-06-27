import React from 'react';

interface RarityChipProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

export const RarityChip: React.FC<RarityChipProps> = ({ rarity, className = '' }) => {
  const styles = {
    common: 'bg-[#9A938C]/10 text-rarity-common border-[#9A938C]/20',
    uncommon: 'bg-[#4E8C5D]/10 text-rarity-uncommon border-[#4E8C5D]/20',
    rare: 'bg-[#3882B8]/10 text-rarity-rare border-[#3882B8]/20',
    epic: 'bg-[#844C9C]/10 text-rarity-epic border-[#844C9C]/20',
    legendary: 'bg-[#D97706]/10 text-rarity-legendary border-[#D97706]/20 font-black shadow-xs',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-widest font-sans ${styles[rarity]} ${className}`}>
      {rarity}
    </span>
  );
};
