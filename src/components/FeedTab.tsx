import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Sparkles, AlertCircle, Heart, X, Info, Home } from 'lucide-react';
import { addCatchRecord, addSightingEvent } from '../services/firebase';
import type { Cat } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { CatchRevealSequence } from './CatchRevealSequence';
import { ScanLineOverlay } from './ScanLineOverlay';
import { XPToast } from './XPToast';
import { MOCK_NAMES, MOCK_BREEDS } from './SpotTab';

interface FeedTabProps {
  currentUser: any;
  existingCats: Cat[];
  preSelectedCat: Cat | null;
  onClearPreSelected: () => void;
  onActionComplete: (points: number, msg: string) => void;
}

type ScanState = 'idle' | 'streaming' | 'captured' | 'analyzing' | 'success' | 'rejected' | 'nofood' | 'adopted_block' | 'catch_first';

const MOCK_CAT_IMAGES = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&q=80&w=600'
];

export const FeedTab: React.FC<FeedTabProps> = ({
  currentUser,
  existingCats,
  preSelectedCat,
  onClearPreSelected,
  onActionComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isCameraLive, setIsCameraLive] = useState<boolean>(false);
  const [flashOverlay, setFlashOverlay] = useState<boolean>(false);

  // AI Cat Detector States
  const [catDetected, setCatDetected] = useState<boolean>(false);
  const [detectedRarity, setDetectedRarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('common');
  const [triggerShake, setTriggerShake] = useState<boolean>(false);

  const [showHeartSuccess, setShowHeartSuccess] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastXPEarned, setToastXPEarned] = useState<number>(0);
  const [showXPToast, setShowXPToast] = useState<boolean>(false);

  // Catch details when auto-catching new cat on feed
  const [resolvedCatch, setResolvedCatch] = useState<{
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    nickname: string;
    breedGuess: string;
    xpGained: number;
    distinguishingFeatures: string;
  } | null>(null);

  useEffect(() => {
    startCamera();
    requestLocation();
    return () => stopCamera();
  }, [facingMode]);

  // Connect stream to video tag once it renders
  useEffect(() => {
    if (isCameraLive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraLive, scanState]);

  // Simulated AI Cat Detector loop
  useEffect(() => {
    if (scanState !== 'streaming') {
      setCatDetected(false);
      return;
    }

    const interval = setInterval(() => {
      setCatDetected((prev) => {
        const next = !prev;
        if (next) {
          const rand = Math.random();
          let rolled: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' = 'common';
          if (rand < 0.02) rolled = 'legendary';
          else if (rand < 0.12) rolled = 'epic';
          else if (rand < 0.27) rolled = 'rare';
          else if (rand < 0.55) rolled = 'uncommon';
          setDetectedRarity(rolled);
        }
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [scanState]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeolocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          setGeolocation({ latitude: 40.7128, longitude: -74.0060 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  async function startCamera() {
    stopCamera();
    setIsCameraLive(false);
    setScanState('idle');
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraLive(true);
      setScanState('streaming');
    } catch (err) {
      console.warn('Simulated feed mode triggered for Feed tab.');
      setIsCameraLive(false);
      setScanState('streaming');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  const handleCapture = () => {
    if (scanState !== 'streaming') return;

    if (!catDetected) {
      setTriggerShake(true);
      setTimeout(() => setTriggerShake(false), 350);
      return;
    }

    setFlashOverlay(true);
    setTimeout(() => setFlashOverlay(false), 250);

    if (isCameraLive && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        setScanState('captured');
        stopCamera();
      }
    } else {
      // Desktop fallback: get mock image
      const randomImage = MOCK_CAT_IMAGES[Math.floor(Math.random() * MOCK_CAT_IMAGES.length)];
      setCapturedPhoto(randomImage);
      setScanState('captured');
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setResolvedCatch(null);
    startCamera();
  };

  const handleAnalyze = async () => {
    if (!capturedPhoto) return;
    setScanState('analyzing');

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const lat = geolocation ? geolocation.latitude : 40.7128;
    const lng = geolocation ? geolocation.longitude : -74.0060;

    // Simulate outcomes randomly:
    // 15% validation failure ('reject')
    // 15% missing bowl / no food context ('nofood')
    // 10% adopted cat block ('adopted_block')
    // Else, feed the cat!
    const rand = Math.random();
    let outcome = 'feed';
    if (rand < 0.15) outcome = 'reject';
    else if (rand < 0.30) outcome = 'nofood';
    else if (preSelectedCat?.adoptionStatus?.isAdopted || (rand < 0.40 && existingCats.some(c => c.adoptionStatus?.isAdopted))) {
      outcome = 'adopted_block';
    }

    if (outcome === 'reject') {
      setScanState('rejected');
      return;
    }

    if (outcome === 'nofood') {
      setScanState('nofood');
      return;
    }

    if (outcome === 'adopted_block') {
      setScanState('adopted_block');
      return;
    }

    // Determine if we feed an existing cat or auto-catch a new one
    const shouldFeedExisting = preSelectedCat || (existingCats.length > 0 && Math.random() < 0.60);

    if (shouldFeedExisting) {
      const targetCat = preSelectedCat || existingCats[Math.floor(Math.random() * existingCats.length)];
      
      // Safety check for adopted
      if (targetCat.adoptionStatus?.isAdopted) {
        setScanState('adopted_block');
        return;
      }

      await addSightingEvent(
        currentUser.uid,
        targetCat.id,
        'feed',
        capturedPhoto,
        lat,
        lng,
        20
      );

      setToastMessage(`Fed ${targetCat.nickname}! Meal telemetry logged.`);
      setToastXPEarned(20);
      setScanState('success');
      
      setShowHeartSuccess(true);
      setTimeout(() => {
        setShowHeartSuccess(false);
        setShowXPToast(true);
      }, 1000);
      return;
    }

    // Auto-catch-then-feed (New discovery cat)
    const rolledRarity = detectedRarity;
    const xpWeights = { common: 10, uncommon: 25, rare: 60, epic: 150, legendary: 400 };
    const discoveryXP = xpWeights[rolledRarity];
    const nameList = MOCK_NAMES[rolledRarity] || ['Noodle', 'Sprout', 'Mac'];
    const nickname = nameList[Math.floor(Math.random() * nameList.length)];
    const breed = MOCK_BREEDS[rolledRarity] || 'Stray Mix';
    const features = 'Discovered feeding on street-side food bowl. Spunky visual properties.';

    await addCatchRecord(
      currentUser.uid,
      currentUser.displayName,
      {
        nickname,
        photoURL: capturedPhoto,
        breedGuess: breed,
        distinguishingFeatures: features,
        rarity: rolledRarity,
        lat,
        lng,
      },
      discoveryXP + 20,
      true
    );

    setResolvedCatch({
      rarity: rolledRarity,
      nickname,
      breedGuess: breed,
      xpGained: discoveryXP + 20,
      distinguishingFeatures: features,
    });
    setToastMessage(`Auto-Fed ${nickname}! Discovery logs updated.`);
    setToastXPEarned(20);
    setScanState('catch_first');
  };

  const handleDone = () => {
    // Chain discovery sequence into feeding confirmation toast
    onActionComplete(toastXPEarned, toastMessage);
    setShowXPToast(true);
    
    setCapturedPhoto(null);
    setResolvedCatch(null);
    if (preSelectedCat) onClearPreSelected();
    startCamera();
  };

  return (
    <div className={`flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto relative overflow-hidden bg-slate-950 text-white rounded-3xl border-4 shadow-2xl h-[70vh] min-h-[500px] transition-all duration-300 ${
      triggerShake ? 'animate-shake border-danger' : 'border-[#D97706]'
    }`}>
      
      {/* Persistent floating notification toast */}
      <XPToast
        isOpen={showXPToast}
        message={toastMessage}
        xpEarned={toastXPEarned}
        onClose={() => setShowXPToast(false)}
      />

      {/* Top watermark overlay bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center select-none">
        
        {preSelectedCat ? (
          <div className="bg-[#0F766E]/95 backdrop-blur-md text-[10px] text-white border border-[#0F766E]/30 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold shadow-md">
            <span>TARGET: {preSelectedCat.nickname.toUpperCase()}</span>
            <button 
              onClick={onClearPreSelected} 
              className="p-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="bg-[#D97706]/90 backdrop-blur-md text-[9px] text-[#FAF6EE] border border-[#D97706]/20 px-3 py-1.5 rounded-full flex items-center gap-1 font-mono uppercase tracking-widest font-black shadow-sm">
            <span>🥣 BOWL_FOCUS_MODE</span>
          </div>
        )}

        {geolocation && (
          <div className="bg-[#1E1B18]/70 backdrop-blur-md text-[9px] text-slate-300 px-2.5 py-1.5 rounded-full font-mono font-bold border border-white/5">
            GPS LOCK: {geolocation.latitude.toFixed(4)}
          </div>
        )}
      </div>

      {/* Snap flash */}
      {flashOverlay && (
        <div className="absolute inset-0 bg-white z-40 animate-flash pointer-events-none" />
      )}

      {/* Center Camera Area */}
      <div className="flex-1 w-full bg-slate-900 relative flex items-center justify-center overflow-hidden">
        
        {scanState === 'streaming' && isCameraLive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Viewfinder Mock Display */}
        {scanState === 'streaming' && !isCameraLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#D97706]/20 to-slate-950 p-6 text-center select-none">
            {/* Corner guidelines */}
            <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-[#D97706]/40"></div>
            <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-[#D97706]/40"></div>
            <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-[#D97706]/40"></div>
            <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-[#D97706]/40"></div>
            
            {/* Bowl placement marker */}
            <div className="w-48 h-32 rounded-2xl border border-dashed border-[#D97706]/35 flex flex-col items-center justify-center gap-1.5 animate-pulse bg-[#D97706]/5">
              <span className="text-xl">🍖</span>
              <span className="text-[9px] font-mono tracking-widest text-[#D97706] font-black uppercase">Center Food Bowl Here</span>
            </div>
          </div>
        )}

        {/* Simulated AI Target Bounding Box & HUD */}
        {scanState === 'streaming' && (
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between p-6">
            {/* Top scanning state display */}
            <div className={`mt-14 px-4 py-1.5 rounded-full border text-[9px] font-mono tracking-widest uppercase transition-all duration-300 backdrop-blur-sm select-none ${
              catDetected 
                ? 'bg-emerald-950/85 border-emerald-500 text-emerald-400 font-extrabold animate-pulse' 
                : 'bg-rose-950/85 border-rose-500 text-rose-400 font-bold'
            }`}>
              {catDetected ? `🟢 CAT DETECTED: ${detectedRarity.toUpperCase()}` : '🔴 NO CAT DETECTED'}
            </div>

            {/* Bounding box target */}
            {catDetected && (
              <div className="w-48 h-48 relative flex items-center justify-center">
                {/* Green corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                
                {/* Green pulsing target indicator */}
                <div className="w-12 h-12 rounded-full border-2 border-emerald-400/40 bg-emerald-500/20 flex items-center justify-center animate-ping"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>

                {/* Accuracy percentage */}
                <span className="absolute bottom-2 text-[8px] font-mono tracking-wider text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded font-black border border-emerald-900/40">
                  FEED LOCK: BOWL FOUND
                </span>
              </div>
            )}

            {/* Bottom help indicator */}
            <div className={`text-[8px] font-mono px-3 py-1 rounded-full border transition-colors select-none ${
              catDetected 
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/50' 
                : 'text-rose-400 bg-rose-950/60 border-rose-900/50'
            }`}>
              {catDetected ? 'FEED AUTHORIZED — PRESS BUTTON TO SERVE' : 'WAITING FOR CAT & BOWL ACQUISITION'}
            </div>
          </div>
        )}

        {/* Ambient Full-screen Green Glow Overlay when Cat is detected */}
        {scanState === 'streaming' && catDetected && (
          <div className="absolute inset-0 border-[8px] border-emerald-500/20 shadow-[inset_0_0_60px_rgba(16,185,129,0.35)] pointer-events-none z-15 animate-pulse" />
        )}

        {/* Captured Frozen Image */}
        {capturedPhoto && (scanState === 'captured' || scanState === 'analyzing' || scanState === 'rejected' || scanState === 'nofood' || scanState === 'adopted_block') && (
          <div className={`w-full h-full relative ${scanState === 'rejected' ? 'animate-shake border-4 border-danger' : ''}`}>
            <img
              src={capturedPhoto}
              alt="Feed snap"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Scan overlay */}
        {scanState === 'analyzing' && (
          <ScanLineOverlay mode="feed" message="Analyzing plate telemetry..." />
        )}

        {/* Heart Bounce Success pop-up */}
        <AnimatePresence>
          {showHeartSuccess && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.4, 1.2], opacity: 1 }}
              exit={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute z-40 text-[#B91C1C] drop-shadow-[0_0_20px_rgba(185,28,28,0.7)]"
            >
              <Heart className="w-24 h-24 fill-[#B91C1C]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Outcome 1: REJECTED View */}
        {scanState === 'rejected' && (
          <div className="absolute inset-0 z-30 bg-[#1E1B18]/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-full flex items-center justify-center text-danger mb-4">
              <AlertCircle className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="font-display font-black text-lg text-danger tracking-wider uppercase">Verification Failed</h3>
            <p className="text-xs text-ink-soft max-w-xs mt-2.5 leading-relaxed">
              That doesn't look like a real cat caught live — try again.
            </p>
            <button
              onClick={handleRetake}
              className="mt-6 w-full max-w-[200px] py-2.5 bg-danger text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition hover:bg-red-700 active:scale-95 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Outcome 2: NO FOOD CONTEXT View */}
        {scanState === 'nofood' && (
          <div className="absolute inset-0 z-30 bg-[#1E1B18]/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-[#D97706]/10 border border-[#D97706]/20 rounded-full flex items-center justify-center text-[#D97706] mb-4">
              <Info className="w-8 h-8" />
            </div>
            <h3 className="font-display font-black text-lg text-[#D97706] tracking-wider uppercase">No Food Context</h3>
            <p className="text-xs text-ink-soft max-w-[260px] mt-2.5 leading-normal">
              We need to see food or a bowl to confirm a feeding — try getting both in frame.
            </p>
            <button
              onClick={handleRetake}
              className="mt-6 w-full max-w-[200px] py-2.5 bg-[#D97706] text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition hover:bg-[#D97706]/80 active:scale-95 cursor-pointer"
            >
              Adjust Alignment
            </button>
          </div>
        )}

        {/* Outcome 3: ADOPTED-CAT BLOCK View */}
        {scanState === 'adopted_block' && (
          <div className="absolute inset-0 z-30 bg-[#FFFDF9]/98 flex flex-col items-center justify-center p-6 text-center select-none text-slate-800">
            <div className="w-16 h-16 bg-teal-50 border border-teal-200/50 rounded-full flex items-center justify-center text-adopted mb-4 shadow-sm animate-float">
              <Home className="w-8 h-8 fill-teal-50 text-adopted" />
            </div>
            
            <span className="font-mono text-[9px] text-adopted uppercase tracking-widest bg-[#F0FDFD] px-3.5 py-1 rounded-full border border-teal-200/50 font-black">
              Safe & Housed
            </span>

            <h3 className="font-display font-black text-xl text-adopted tracking-wide mt-4 uppercase">
              Adopted and Safe!
            </h3>
            
            <p className="text-xs text-ink-soft max-w-[280px] mt-2.5 leading-relaxed font-sans font-medium">
              <span className="font-extrabold text-ink">{preSelectedCat?.nickname || 'This cat'}</span> has been adopted by <span className="font-extrabold text-ink">{preSelectedCat?.adoptionStatus?.orgName || 'Whiskers Rescue Shelter'}</span> and is safe! No need to feed strays here anymore.
            </p>

            <button
              onClick={handleRetake}
              className="mt-8 w-full max-w-[220px] py-3.5 bg-adopted text-white rounded-2xl font-black uppercase text-[10px] tracking-wider transition hover:bg-teal-800 shadow-lg cursor-pointer"
            >
              Scan Another Sighting
            </button>
          </div>
        )}

        {/* Outcome 4: FEED CONFIRMED (existing cat success screen hold) */}
        {scanState === 'success' && (
          <div className="absolute inset-0 z-30 bg-[#1E1B18]/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
              <Heart className="w-8 h-8 fill-emerald-400" />
            </div>
            
            <h3 className="font-display font-black text-lg text-emerald-400 uppercase tracking-widest leading-none">
              Feeding Authenticated
            </h3>
            
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs px-4 py-2 rounded-xl my-4">
              +20 XP RECEIVED
            </div>

            <button
              onClick={handleDone}
              className="w-full max-w-[180px] py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl uppercase text-[10px] tracking-wider transition hover:bg-emerald-400 active:scale-95 cursor-pointer"
            >
              Verify & Complete
            </button>
          </div>
        )}

        {/* Outcome 5: AUTO-CATCH-THEN-FEED Reveal Ceremony */}
        {scanState === 'catch_first' && resolvedCatch && (
          <CatchRevealSequence
            rarity={resolvedCatch.rarity}
            nickname={resolvedCatch.nickname}
            breedGuess={resolvedCatch.breedGuess}
            xpGained={resolvedCatch.xpGained}
            photoURL={capturedPhoto || ''}
            onConfirm={handleDone}
            onCatchAnother={handleRetake}
          />
        )}

      </div>

      {/* VIEWPORT BOTTOM: viewfinder actions */}
      {scanState === 'streaming' && (
        <div className="w-full bg-[#1E1B18] p-4 shrink-0 flex justify-between items-center border-t border-slate-900 select-none rounded-b-2xl">
          <button
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="p-3 bg-slate-900/60 hover:bg-slate-900 rounded-full transition cursor-pointer active:scale-90"
            aria-label="Flip Camera"
          >
            <RefreshCw className="w-4 h-4 text-[#FFFDF9]" />
          </button>

          {/* Shutter ring */}
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white bg-[#D97706] hover:bg-[#D97706]/90 active:scale-90 flex items-center justify-center transition-transform shadow-lg relative shrink-0 cursor-pointer group"
            aria-label="Shutter Snap"
          >
            <div className="w-11 h-11 rounded-full border border-slate-950/20 bg-white/10 group-hover:scale-105 transition-transform" />
          </button>

          <div className="w-10"></div>
        </div>
      )}

      {scanState === 'captured' && (
        <div className="w-full bg-[#1E1B18] p-4 shrink-0 flex gap-3 border-t border-slate-900 select-none rounded-b-2xl">
          <button
            onClick={handleRetake}
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition text-[10px] uppercase tracking-wider cursor-pointer"
          >
            Retake
          </button>
          
          <button
            onClick={handleAnalyze}
            className="flex-1 py-3 bg-gradient-to-r from-[#D97706] to-orange-500 hover:from-[#D97706]/90 hover:to-orange-400 text-white font-extrabold rounded-xl transition text-[10px] uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white shrink-0" />
            <span>Verify Meal</span>
          </button>
        </div>
      )}



    </div>
  );
};
