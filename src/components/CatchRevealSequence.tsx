import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RarityChip } from './RarityChip';
import { RarityGlowCard } from './RarityGlowCard';
import { TiltCard } from './TiltCard';
import { Check, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CatchRevealSequenceProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  nickname: string;
  breedGuess: string;
  xpGained: number;
  photoURL: string;
  onConfirm: () => void;
  onCatchAnother: () => void;
}

type RevealStage = 'scan' | 'pulse' | 'card' | 'actions';

export const CatchRevealSequence: React.FC<CatchRevealSequenceProps> = ({
  rarity,
  nickname,
  breedGuess,
  xpGained,
  photoURL,
  onConfirm,
  onCatchAnother,
}) => {
  const [stage, setStage] = useState<RevealStage>('scan');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colorMap = {
    common: { rgb: '154, 147, 140', glow: 'rgba(154, 147, 140, 0.35)', border: 'border-[#9A938C]' },
    uncommon: { rgb: '78, 140, 93', glow: 'rgba(78, 140, 93, 0.45)', border: 'border-[#4E8C5D]' },
    rare: { rgb: '56, 130, 184', glow: 'rgba(56, 130, 184, 0.55)', border: 'border-[#3882B8]' },
    epic: { rgb: '132, 76, 156', glow: 'rgba(132, 76, 156, 0.65)', border: 'border-[#844C9C]' },
    legendary: { rgb: '217, 119, 6', glow: 'rgba(217, 119, 6, 0.85)', border: 'border-[#D97706]' },
  };

  useEffect(() => {
    if (prefersReduced) {
      setStage('actions');
      triggerConfetti();
      return;
    }

    // Step 1: Scan line sweeps
    const pulseTimer = setTimeout(() => {
      setStage('pulse');
    }, 1200);

    // Step 2: Full screen radial pulse
    const cardTimer = setTimeout(() => {
      setStage('card');
      triggerConfetti();
    }, 1600);

    // Step 3: Render actions and stagger text
    const actionsTimer = setTimeout(() => {
      setStage('actions');
    }, 2800);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(cardTimer);
      clearTimeout(actionsTimer);
    };
  }, [rarity, prefersReduced]);

  const triggerConfetti = () => {
    if (rarity === 'legendary') {
      // Golden jackpot burst
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    } else if (rarity === 'epic' || rarity === 'rare') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.75 }
      });
    } else {
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 }
      });
    }
  };

  // Skip animations entirely for prefers-reduced-motion
  if (prefersReduced) {
    return (
      <div className="absolute inset-0 z-40 bg-[#FAF6EE] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <h3 className="font-display font-black text-2xl text-ink tracking-wide mb-2 uppercase">
          New Catch Discovered!
        </h3>
        <div className="w-[260px] h-[340px] mb-6">
          <RarityGlowCard rarity={rarity} className="w-full h-full p-4 flex flex-col justify-between text-left">
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-200">
              <img src={photoURL} alt="Cat" className="w-full h-full object-cover" />
            </div>
            <div className="mt-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-display font-bold text-base text-ink">{nickname}</span>
                  <RarityChip rarity={rarity} />
                </div>
                <p className="text-xs text-ink-soft italic font-medium mt-1">{breedGuess}</p>
              </div>
              <p className="text-xs text-ink-soft bg-black/5 p-2 rounded-lg font-mono">+{xpGained} XP</p>
            </div>
          </RarityGlowCard>
        </div>
        <div className="w-full max-w-xs space-y-3.5">
          <button onClick={onConfirm} className="w-full py-3.5 bg-ink text-[#FFFDF9] rounded-2xl font-bold uppercase text-sm">
            Add to CatchDex
          </button>
          <button onClick={onCatchAnother} className="w-full py-3 bg-slate-200 text-ink rounded-2xl font-bold uppercase text-xs">
            Catch Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      
      {/* STAGE 1: Sweeping Scan line before radial flash */}
      {stage === 'scan' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-50">
          <div className="absolute inset-x-0 h-2 bg-white shadow-[0_0_25px_#fff] animate-scan"></div>
          <div className="p-6 rounded-3xl bg-[#1E1B18]/90 border border-white/10 flex flex-col items-center space-y-3 text-center max-w-[280px]">
            <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-white animate-spin"></div>
            <h4 className="font-mono text-[10px] text-white/50 tracking-widest">ENCRYPTING_BIO_SIGN</h4>
            <p className="font-display font-bold text-sm text-[#FFFDF9]">Formulating stray profile...</p>
          </div>
        </div>
      )}

      {/* STAGE 2: Radial flash glow pulse */}
      <AnimatePresence>
        {stage === 'pulse' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              background: `radial-gradient(circle, rgba(${colorMap[rarity].rgb}, 0.95) 0%, rgba(0,0,0,1) 75%)`,
            }}
            className="absolute inset-0 z-45"
          />
        )}
      </AnimatePresence>

      {/* STAGE 3: Card settles, glow breathes, text stagger reveals */}
      {(stage === 'card' || stage === 'actions') && (
        <div className="w-full h-full flex flex-col items-center justify-between p-6 z-40 relative max-w-sm mx-auto">
          
          {/* Sparkles backdrop animation */}
          {rarity === 'legendary' && (
            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_center,rgba(219,122,6,0.15)_0%,transparent_60%)] animate-pulse-glow" />
          )}

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-center pt-8 shrink-0"
          >
            <span className="text-[10px] font-mono tracking-widest text-[#6E665F] uppercase bg-[#1E1B18] px-3 py-1 rounded-full border border-white/5">
              Discovery Entry Sourced
            </span>
            <h2 className="font-display font-black text-2xl text-[#FFFDF9] tracking-wide mt-3.5 uppercase leading-none">
              {rarity === 'legendary' ? '✨ LEGENDARY ACQUISITION ✨' : 'NEW CAT DISCOVERED'}
            </h2>
          </motion.div>

          {/* 3D figurines Tilt card wrapper */}
          <div className="flex-1 flex items-center justify-center my-4">
            <motion.div
              initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
              animate={{ scale: 1, rotateY: 0, opacity: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 85, 
                damping: 14,
                delay: 0.3
              }}
              className="w-[260px] h-[340px]"
            >
              <TiltCard className="w-full h-full">
                <RarityGlowCard 
                  rarity={rarity} 
                  className="w-full h-full p-4 flex flex-col justify-between text-left relative"
                >
                  {/* Sheen Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-10"></div>
                  
                  {/* Crop picture */}
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-black/10 shrink-0 relative bg-slate-900">
                    <img 
                      src={photoURL} 
                      alt={nickname} 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* Corner Reticles */}
                    <div className="absolute inset-2 border border-white/20 rounded pointer-events-none"></div>
                  </div>

                  {/* Staggered Text Details inside Card */}
                  <div className="flex-1 flex flex-col justify-between mt-3.5">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-1">
                        <motion.h4 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 }}
                          className="font-display font-bold text-base text-ink line-clamp-1 truncate"
                        >
                          {nickname}
                        </motion.h4>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9 }}
                          className="shrink-0"
                        >
                          <RarityChip rarity={rarity} />
                        </motion.div>
                      </div>

                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.0 }}
                        className="text-[11px] text-ink-soft font-bold uppercase tracking-wider leading-none"
                      >
                        {breedGuess}
                      </motion.p>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                      className="bg-black/5 p-2 rounded-xl border border-black/5 text-[10px] text-ink-soft leading-normal font-mono flex items-center justify-between"
                    >
                      <span className="font-bold">TRAINER PROGRESS XP:</span>
                      <span className="text-rarity-legendary font-black animate-pulse">+{xpGained} XP</span>
                    </motion.div>
                  </div>
                </RarityGlowCard>
              </TiltCard>
            </motion.div>
          </div>

          {/* Action Row buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={stage === 'actions' ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="w-full space-y-3 pb-4 shrink-0"
          >
            <button
              onClick={onConfirm}
              className="w-full py-4 bg-[#FFFDF9] text-slate-950 font-black border-2 border-slate-950 hover:bg-[#FAF6EE] rounded-2xl shadow-[4px_4px_0px_#1E1B18] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1E1B18] transition-all duration-150 uppercase text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Add to CatchDex</span>
            </button>
            <button
              onClick={onCatchAnother}
              className="w-full py-3.5 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white rounded-2xl transition font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Locate More Strays</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>

        </div>
      )}

    </div>
  );
};
