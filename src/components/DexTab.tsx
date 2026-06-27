import React, { useState } from 'react';
import { Search, BookOpen, Camera } from 'lucide-react';
import { CatCard } from './CatCard';
import type { Cat } from '../services/firebase';

interface DexTabProps {
  cats: Cat[];
  loading: boolean;
  onSelect: (cat: Cat) => void;
  onOpenScanner: () => void;
}

type FilterType = 'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'adopted';

export const DexTab: React.FC<DexTabProps> = ({
  cats,
  loading,
  onSelect,
  onOpenScanner,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Filter logic
  const filteredCats = cats.filter(cat => {
    // 1. Text Search matching
    const matchesSearch = 
      cat.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.distinguishingFeatures?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.breedGuess.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Chip filter matching
    if (!matchesSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'adopted') return cat.adoptionStatus && cat.adoptionStatus.isAdopted;
    
    // Ignore adopted cats when sorting by rarity (per visual gating logic, adopted replaces rarity glow/color)
    const isAdopted = cat.adoptionStatus && cat.adoptionStatus.isAdopted;
    if (isAdopted) return false;

    return cat.rarity === selectedFilter;
  });

  const filterChips: { value: FilterType; label: string; bgClass: string; textClass: string; borderClass: string }[] = [
    { value: 'all', label: 'All Dex', bgClass: 'bg-slate-900', textClass: 'text-[#FFFDF9]', borderClass: 'border-slate-900' },
    { value: 'common', label: 'Common', bgClass: 'bg-[#9A938C]/10', textClass: 'text-rarity-common', borderClass: 'border-[#9A938C]/20' },
    { value: 'uncommon', label: 'Uncommon', bgClass: 'bg-[#4E8C5D]/10', textClass: 'text-rarity-uncommon', borderClass: 'border-[#4E8C5D]/20' },
    { value: 'rare', label: 'Rare', bgClass: 'bg-[#3882B8]/10', textClass: 'text-rarity-rare', borderClass: 'border-[#3882B8]/20' },
    { value: 'epic', label: 'Epic', bgClass: 'bg-[#844C9C]/10', textClass: 'text-rarity-epic', borderClass: 'border-[#844C9C]/20' },
    { value: 'legendary', label: 'Legendary', bgClass: 'bg-[#D97706]/10', textClass: 'text-rarity-legendary', borderClass: 'border-[#D97706]/20' },
    { value: 'adopted', label: '🏡 Adopted', bgClass: 'bg-[#F0FDFD]', textClass: 'text-adopted', borderClass: 'border-teal-200/50' },
  ];

  return (
    <div className="flex-1 flex flex-col space-y-5 animate-fade-in pb-6 select-none max-h-[75vh]">
      
      {/* Search & Filter Header Dashboard */}
      <div className="flex flex-col gap-4 bg-[#FFFDF9] p-4 rounded-3xl border border-slate-200/60 shadow-sm shrink-0">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#6E665F]/60" />
            <input
              type="text"
              placeholder="Search by nickname, features, breed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D97706]/35 focus:outline-none text-xs bg-[#FAF6EE]/50 text-ink"
            />
          </div>

          {/* Sighting Total counts badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#6E665F] font-bold shrink-0 bg-[#FAF6EE] border border-slate-200/40 px-4 py-2 rounded-2xl">
            <BookOpen className="w-4 h-4 text-[#D97706]" />
            <span>MY COLLECTION CARD COUNT: <span className="font-mono font-black text-ink">{cats.length}</span></span>
          </div>
        </div>

        {/* Dynamic Sort/Filter chips row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 border-t border-slate-100 mt-1">
          {filterChips.map(chip => {
            const isActive = selectedFilter === chip.value;
            const activeStyle = isActive 
              ? `${chip.bgClass} ${chip.textClass} border-transparent shadow-xs font-black` 
              : 'bg-[#FFFDF9] text-[#6E665F] hover:bg-[#FAF6EE] border-slate-200';
            
            return (
              <button
                key={chip.value}
                onClick={() => setSelectedFilter(chip.value)}
                className={`px-3 py-1.5 rounded-full border text-[9px] uppercase tracking-wider transition-all cursor-pointer font-bold shrink-0 ${activeStyle}`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Grid listing content */}
      {loading ? (
        <div className="flex-1 py-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#D97706] animate-spin"></div>
          <p className="text-xs text-[#6E665F] font-bold uppercase tracking-wider font-mono">Accessing Sighting DB...</p>
        </div>
      ) : filteredCats.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-[#6E665F]/20 rounded-3xl p-10 text-center flex flex-col items-center justify-center my-auto min-h-[350px] bg-[#FFFDF9]">
          
          {/* Illustrated Cat Outline Placeholder */}
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#6E665F]/15 flex items-center justify-center relative mb-4">
            <span className="text-4xl text-slate-300">🐱</span>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#D97706] rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">?</div>
          </div>

          <h3 className="font-display font-black text-[#1E1B18] text-base uppercase tracking-wider">Empty Dex Database</h3>
          <p className="text-xs text-[#6E665F] max-w-xs mt-2 leading-relaxed">
            {searchQuery 
              ? "None of your caught cats match your current query parameter." 
              : "No cats caught yet — open Spot and find your first one."}
          </p>

          {!searchQuery && (
            <button
              onClick={onOpenScanner}
              className="mt-6 px-6 py-3.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-[#FFFDF9] rounded-2xl font-black shadow-lg transition flex items-center gap-2 select-none text-xs uppercase tracking-wider cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#FFFDF9] shrink-0" />
              <span>Launch Spot Viewfinder</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto no-scrollbar p-1 pb-10">
          {filteredCats.map((cat) => (
            <CatCard
              key={cat.id}
              cat={cat}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
