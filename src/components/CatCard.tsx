import React from 'react';
import { Calendar, Utensils } from 'lucide-react';
import type { Cat } from '../services/firebase';
import { TiltCard } from './TiltCard';
import { RarityGlowCard } from './RarityGlowCard';
import { RarityChip } from './RarityChip';
import { AdoptedChip } from './AdoptedChip';

interface CatCardProps {
  cat: Cat;
  onSelect: (cat: Cat) => void;
}

export const CatCard: React.FC<CatCardProps> = ({ cat, onSelect }) => {
  const isAdopted = cat.adoptionStatus && cat.adoptionStatus.isAdopted;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Determine card variant (rarity or adopted)
  const cardVariant = isAdopted ? 'adopted' : cat.rarity;

  return (
    <div className="w-full aspect-[3/4.2] select-none">
      <TiltCard onClick={() => onSelect(cat)} className="h-full">
        <RarityGlowCard
          rarity={cardVariant}
          className="w-full h-full p-3 flex flex-col justify-between"
        >
          {/* Top Badge overlay */}
          <div className="flex justify-between items-start relative z-10">
            {isAdopted ? (
              <AdoptedChip orgName={cat.adoptionStatus.orgName || 'Adopted'} />
            ) : (
              <RarityChip rarity={cat.rarity} />
            )}
          </div>

          {/* Sighting Photo Crop */}
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200/50 mt-2 shrink-0">
            <img
              src={cat.photoURL}
              alt={cat.nickname}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              loading="lazy"
            />
          </div>

          {/* Sighting Details */}
          <div className="flex-1 mt-3 flex flex-col justify-between">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-sm text-ink truncate leading-tight">
                {cat.nickname}
              </h3>
              <p className="text-[9px] text-[#6E665F] font-mono tracking-widest uppercase leading-none">
                {cat.breedGuess}
              </p>
              <p className="text-[10px] text-[#6E665F] leading-normal line-clamp-2 mt-1.5">
                {cat.distinguishingFeatures}
              </p>
            </div>

            {/* Bottom Sighting Log Row */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-[#6E665F] font-bold">
              <div className="flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-[#6E665F]/60" />
                <span>{formatDate(cat.caughtAt)}</span>
              </div>

              {cat.timesFed > 0 && (
                <div className="flex items-center gap-1 bg-[#D97706]/10 text-[#D97706] px-2 py-0.5 rounded-full font-mono font-black shrink-0 tracking-wider">
                  <Utensils className="w-2.5 h-2.5 fill-[#D97706] text-[#D97706]" />
                  <span>FED ×{cat.timesFed}</span>
                </div>
              )}
            </div>
          </div>
        </RarityGlowCard>
      </TiltCard>
    </div>
  );
};
