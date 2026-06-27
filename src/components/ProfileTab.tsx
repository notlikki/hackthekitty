import type { UserProfile, Cat } from '../services/firebase';
import { checkIsFirebaseLive } from '../services/firebase';
import { Sparkles, Trophy, Award, Flame, Calendar, LogOut } from 'lucide-react';
import { CatCard } from './CatCard';
import { Leaderboard } from './Leaderboard';

interface ProfileTabProps {
  currentUser: UserProfile | null;
  cats: Cat[];
  onSelectCat: (cat: Cat) => void;
  onLogout?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  cats,
  onSelectCat,
  onLogout,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isFirebaseLive = checkIsFirebaseLive();

  if (!currentUser) return null;

  // Level Progression Math
  const level = currentUser.level;
  const xpStartCurrentLevel = 50 * level * level;
  const xpNeededNextLevel = 50 * (level + 1) * (level + 1);
  const currentLevelRange = xpNeededNextLevel - xpStartCurrentLevel;
  const progressWithinLevel = currentUser.totalXP - xpStartCurrentLevel;
  const progressPercentage = Math.min(100, Math.max(0, (progressWithinLevel / currentLevelRange) * 100));
  const remainingXP = xpNeededNextLevel - currentUser.totalXP;

  // Find rarest caught cat
  const getRarestCat = (): Cat | null => {
    if (cats.length === 0) return null;
    const rarityWeights: Record<string, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
    };
    return [...cats].sort((a, b) => {
      const weightA = rarityWeights[a.rarity] || 0;
      const weightB = rarityWeights[b.rarity] || 0;
      return weightB - weightA;
    })[0];
  };

  const rarestCat = getRarestCat();

  return (
    <div className="flex-1 flex flex-col space-y-6 overflow-y-auto no-scrollbar animate-fade-in max-h-[75vh] pb-10 p-1">
      
      {/* Profile Dashboard Card */}
      <div className="bg-[#1E1B18] rounded-3xl p-5 border border-white/5 text-[#FFFDF9] shadow-xl relative overflow-hidden flex flex-col select-none text-left">
        
        {/* Glow halo */}
        <div className="absolute -top-14 -left-14 w-32 h-32 bg-[#D97706]/15 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#3882B8]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/10 flex items-center justify-center text-3xl shadow-lg relative overflow-hidden shrink-0">
            {currentUser.role === 'ngo' ? '🏢' : '🧢'}
          </div>
          
          <div>
            <h2 className="font-display font-black text-lg tracking-wide text-[#FFFDF9]">
              {currentUser.displayName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {currentUser.role === 'ngo' ? (
                <span className="bg-[#0F766E]/20 border border-[#0F766E]/30 text-teal-300 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  NGO partner: {currentUser.orgName || 'Shelter'}
                </span>
              ) : (
                <span className="bg-[#3882B8]/20 border border-[#3882B8]/30 text-blue-300 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  Trainer account
                </span>
              )}
              
              {!isFirebaseLive && (
                <span className="bg-[#9A938C]/20 border border-[#9A938C]/30 text-slate-300 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  Sandbox profile
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Level & XP Progress Indicator (using legendary gold role) */}
        <div className="mt-5 space-y-1.5 font-mono">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span>LEVEL {level} TRAINER</span>
            <span>{currentUser.totalXP} / {xpNeededNextLevel} XP</span>
          </div>
          
          {/* Progress bar track */}
          <div className="w-full h-3 bg-black/40 rounded-full border border-white/5 overflow-hidden shadow-inner relative">
            <div 
              style={{ width: `${progressPercentage}%` }}
              className="h-full bg-gradient-to-r from-[#D97706] to-amber-400 rounded-full transition-all duration-500 shadow-md"
            >
              <div className="absolute top-0 right-0 w-2 h-full bg-white/10 rotate-12"></div>
            </div>
          </div>

          <p className="text-[10px] text-ink-soft text-right font-bold">
            Collect {remainingXP} more XP to reach Level {level + 1}!
          </p>
        </div>
      </div>

      {/* STATS MATRIX */}
      <div className="grid grid-cols-3 gap-3 shrink-0 font-mono text-left">
        <div className="bg-[#FFFDF9] rounded-2xl border border-slate-200/50 p-4 text-center shadow-xs">
          <span className="text-[9px] text-[#6E665F] font-bold uppercase block tracking-wider">Spotted</span>
          <div className="flex items-center justify-center gap-1 mt-1 text-ink font-black text-base">
            <Award className="w-4.5 h-4.5 text-[#B91C1C]" />
            <span>{currentUser.totalCatches}</span>
          </div>
        </div>

        <div className="bg-[#FFFDF9] rounded-2xl border border-slate-200/50 p-4 text-center shadow-xs">
          <span className="text-[9px] text-[#6E665F] font-bold uppercase block tracking-wider">Fed</span>
          <div className="flex items-center justify-center gap-1 mt-1 text-ink font-black text-base">
            <Flame className="w-4.5 h-4.5 text-[#D97706] fill-[#D97706]" />
            <span>{currentUser.totalFeeds}</span>
          </div>
        </div>

        <div className="bg-[#FFFDF9] rounded-2xl border border-slate-200/50 p-4 text-center shadow-xs">
          <span className="text-[9px] text-[#6E665F] font-bold uppercase block tracking-wider">Joined</span>
          <div className="flex items-center justify-center gap-1 mt-1 text-ink font-black text-[9px] leading-tight pt-1">
            <Calendar className="w-4 h-4 text-rarity-rare shrink-0" />
            <span>{formatDate(new Date())}</span>
          </div>
        </div>
      </div>

      {/* COMPANION SHOWCASE SECTION */}
      {rarestCat && (
        <div className="space-y-2.5 text-left">
          <h3 className="font-display font-black text-xs text-[#6E665F] uppercase tracking-widest flex items-center gap-1.5 pl-1">
            <Sparkles className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
            Signature Companion Sighted
          </h3>
          
          <div className="flex justify-center p-4 bg-gradient-to-tr from-slate-200/10 to-slate-200/40 rounded-3xl border border-slate-200/60 shadow-inner">
            <div className="w-[180px] h-[252px]">
              <CatCard cat={rarestCat} onSelect={onSelectCat} />
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL LEADERBOARD SECTION */}
      <div className="space-y-2.5 text-left border-t border-slate-100 pt-4">
        <h3 className="font-display font-black text-xs text-[#6E665F] uppercase tracking-widest flex items-center gap-1.5 pl-1">
          <Trophy className="w-4 h-4 text-[#B91C1C]" />
          Leaderboard Standing
        </h3>
        <Leaderboard currentUser={currentUser} />
      </div>

      {/* Log out option positioned at bottom with low priority */}
      {onLogout && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-[#FAF6EE] text-ink-soft hover:text-danger rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      )}

    </div>
  );
};
