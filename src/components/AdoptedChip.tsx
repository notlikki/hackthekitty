import React from 'react';
import { Home } from 'lucide-react';

interface AdoptedChipProps {
  orgName?: string;
  className?: string;
}

export const AdoptedChip: React.FC<AdoptedChipProps> = ({ orgName = 'Adopted', className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border border-teal-200/50 bg-[#F0FDFD] text-adopted uppercase tracking-wider font-sans ${className}`}>
      <Home className="w-2.5 h-2.5 fill-adopted text-adopted shrink-0" />
      <span className="truncate max-w-[100px]">{orgName}</span>
    </span>
  );
};
