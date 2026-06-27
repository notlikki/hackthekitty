import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star, Flame } from 'lucide-react';
import { getLeaderboard, checkIsFirebaseLive } from '../services/firebase';
import type { UserProfile } from '../services/firebase';

interface LeaderboardProps {
  currentUser: UserProfile | null;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser }) => {
  const [board, setBoard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFirebaseLive, setIsFirebaseLive] = useState(checkIsFirebaseLive());

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      try {
        const lb = await getLeaderboard();
        setBoard(lb);
      } catch (e) {
        console.error('Failed to load leaderboard', e);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
    setIsFirebaseLive(checkIsFirebaseLive());
  }, [currentUser?.totalXP]);

  const renderRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-[#D97706]/10 border border-[#D97706]/35 flex items-center justify-center relative overflow-hidden animate-float shrink-0">
            <Trophy className="w-4.5 h-4.5 text-[#D97706] fill-[#D97706]" />
            <div className="absolute top-0 right-0 w-1.5 h-8 bg-white/20 rotate-12"></div>
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center relative overflow-hidden shrink-0">
            <Medal className="w-4.5 h-4.5 text-[#6E665F]" />
            <div className="absolute top-0 right-0 w-1.5 h-8 bg-white/20 rotate-12"></div>
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-[#D97706]/5 border border-[#D97706]/20 flex items-center justify-center relative overflow-hidden shrink-0">
            <Medal className="w-4.5 h-4.5 text-[#D97706]" />
            <div className="absolute top-0 right-0 w-1.5 h-8 bg-white/20 rotate-12"></div>
          </div>
        );
      default:
        return <span className="w-8 text-center text-[#6E665F]/60 font-mono font-black text-xs shrink-0">#{rank}</span>;
    }
  };

  // Find user's actual position in full list
  const userRankIndex = board.findIndex(u => currentUser && u.uid === currentUser.uid);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;

  return (
    <div className="max-w-md mx-auto py-2 space-y-4">
      
      {/* Visual Podium Podium for top 3 */}
      {!loading && board.length >= 3 && (
        <div className="bg-[#1E1B18] rounded-3xl p-5 border border-white/5 shadow-lg relative overflow-hidden text-center flex flex-col items-center">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#D97706]/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <span className="font-mono text-[8px] text-slate-400 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            {isFirebaseLive ? '🏆 database synchronization' : '🏆 Local Trainer ranks'}
          </span>

          <div className="flex items-end justify-center gap-4 w-full mt-6 text-slate-800 font-sans font-bold select-none">
            {/* Rank 2 */}
            <div className="flex flex-col items-center w-20 shrink-0">
              <span className="text-[10px] text-slate-300 font-bold truncate max-w-full leading-tight">{board[1].displayName}</span>
              <span className="text-[10px] text-slate-400 font-mono font-extrabold mt-0.5 shrink-0">{board[1].totalXP} XP</span>
              <div className="w-full h-12 bg-slate-200 border-2 border-slate-300/60 rounded-t-xl flex items-center justify-center mt-2.5 shadow-md">
                <span className="text-xs text-[#6E665F] font-black">2nd</span>
              </div>
            </div>
            
            {/* Rank 1 */}
            <div className="flex flex-col items-center w-24 shrink-0">
              <Star className="w-4.5 h-4.5 text-[#D97706] fill-[#D97706] mb-1 animate-pulse" />
              <span className="text-xs text-white font-black truncate max-w-full leading-none">{board[0].displayName}</span>
              <span className="text-[10px] text-[#D97706] bg-[#D97706]/10 border border-[#D97706]/20 px-2 py-0.5 rounded-full font-mono font-black mt-1 shrink-0">{board[0].totalXP} XP</span>
              <div className="w-full h-16 bg-gradient-to-t from-[#D97706] to-amber-400 border-2 border-[#D97706]/50 rounded-t-xl flex items-center justify-center mt-2.5 shadow-xl">
                <span className="text-sm text-white font-display font-black">1st</span>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center w-20 shrink-0">
              <span className="text-[10px] text-slate-300 font-bold truncate max-w-full leading-tight">{board[2].displayName}</span>
              <span className="text-[10px] text-slate-400 font-mono font-extrabold mt-0.5 shrink-0">{board[2].totalXP} XP</span>
              <div className="w-full h-9 bg-[#FAF6EE] border-2 border-slate-200/50 rounded-t-xl flex items-center justify-center mt-2.5 shadow-md">
                <span className="text-xs text-ink-soft font-black">3rd</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main rankings list */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-slate-200/50 p-4 shadow-sm space-y-2">
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#D97706] animate-spin"></div>
            <p className="text-[10px] text-[#6E665F] font-bold uppercase tracking-wider font-mono">Syncing scores...</p>
          </div>
        ) : board.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#6E665F]/60">
            No active profiles. Capture a stray cat to establish ranking!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 font-sans">
            {board.map((user, index) => {
              const rank = index + 1;
              const isMe = currentUser && user.uid === currentUser.uid;
              
              return (
                <div
                  key={user.uid}
                  className={`py-3.5 px-2.5 flex items-center justify-between transition-colors rounded-2xl ${
                    isMe 
                      ? 'bg-[#D97706]/5 border-2 border-[#D97706]/20 my-1 shadow-xs' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Indicator */}
                    {renderRankBadge(rank)}

                    {/* Trainer name & ID */}
                    <div className="flex flex-col text-left">
                      <span className={`text-xs font-bold flex items-center ${isMe ? 'text-[#D97706] font-black' : 'text-ink'}`}>
                        {user.displayName} 
                        {isMe && (
                          <span className="text-[8px] bg-[#D97706] text-white font-mono font-black px-1.5 py-0.5 rounded-full ml-1.5 select-none tracking-wider">
                            YOU
                          </span>
                        )}
                      </span>
                      <span className="text-[8px] text-[#6E665F] font-mono mt-0.5">ID: {user.uid.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Trainer Score */}
                  <div className="flex items-center gap-1 bg-[#FAF6EE] border border-slate-200/40 px-3 py-1 rounded-xl transition hover:bg-slate-100">
                    <Flame className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706] shrink-0" />
                    <span className="text-xs font-mono font-black text-ink">{user.totalXP} XP</span>
                  </div>
                </div>
              );
            })}

            {/* If user exists but is not in top list (outside top 10) show floating standings tag */}
            {userRank && userRank > 10 && (
              <div className="pt-3.5 mt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-xs font-mono bg-[#D97706]/5 p-3 rounded-2xl border border-[#D97706]/20">
                <span className="font-bold text-ink-soft">Your Current Position:</span>
                <span className="font-black text-[#D97706]">Rank #{userRank} ({currentUser?.totalXP} XP)</span>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};
