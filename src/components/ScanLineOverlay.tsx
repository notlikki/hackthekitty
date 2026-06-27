import React from 'react';
import { Loader2 } from 'lucide-react';

interface ScanLineOverlayProps {
  mode: 'spot' | 'feed';
  message?: string;
}

export const ScanLineOverlay: React.FC<ScanLineOverlayProps> = ({ mode, message }) => {
  const isFeed = mode === 'feed';
  const laserColor = isFeed ? 'bg-rarity-legendary shadow-[0_0_20px_#D97706]' : 'bg-rarity-rare shadow-[0_0_20px_#3882B8]';
  const borderColor = isFeed ? 'border-rarity-legendary/40' : 'border-rarity-rare/40';
  const textColor = isFeed ? 'text-rarity-legendary' : 'text-rarity-rare';
  const defaultMsg = isFeed ? 'Analyzing Food Context...' : 'Verifying biological signs...';

  return (
    <div className="absolute inset-0 z-20 bg-slate-950/70 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-xs">
      {/* Holographic Laser Scanner sweep line */}
      <div className={`absolute inset-x-0 h-1.5 ${laserColor} animate-scan`}></div>
      
      {/* Central HUD Panel */}
      <div className={`p-6 rounded-3xl dark-glass-panel border ${borderColor} flex flex-col items-center space-y-4 max-w-xs shadow-2xl relative overflow-hidden`}>
        {/* Animated target focus box */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-white/30"></div>
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-white/30"></div>
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-white/30"></div>
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-white/30"></div>

        <Loader2 className={`w-9 h-9 animate-spin ${textColor}`} />
        
        <div className="space-y-1">
          <p className={`font-mono text-xs font-black tracking-widest uppercase ${textColor}`}>
            {isFeed ? 'FEED_ANALYZER_ACTIVE' : 'BIO_SPECTRUM_SCAN'}
          </p>
          <p className="font-display font-bold text-sm text-[#FFFDF9] mt-1">
            {message || defaultMsg}
          </p>
          <p className="text-[10px] text-ink-soft leading-normal max-w-[200px] mt-1 pt-1 border-t border-white/10">
            Verifying environment telemetry & live-capture protocols.
          </p>
        </div>
      </div>
    </div>
  );
};
