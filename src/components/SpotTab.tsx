import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Sparkles, AlertCircle, Eye, Camera, Flashlight } from 'lucide-react';
import { addCatchRecord } from '../services/firebase';
import type { Cat } from '../services/firebase';
import { CatchRevealSequence } from './CatchRevealSequence';
import { ScanLineOverlay } from './ScanLineOverlay';

interface SpotTabProps {
  currentUser: any;
  existingCats: Cat[];
  onActionComplete: (points: number, msg: string) => void;
  onSelectCat?: (cat: Cat) => void;
}

type ScanState = 'idle' | 'streaming' | 'captured' | 'analyzing' | 'success' | 'rejected' | 'resight';

const MOCK_CAT_IMAGES = {
  common: [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600'
  ],
  uncommon: [
    'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&q=80&w=600'
  ],
  rare: [
    'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1513360309081-36f5e878fc9e?auto=format&fit=crop&q=80&w=600'
  ],
  epic: [
    'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&q=80&w=600'
  ],
  legendary: [
    'https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&q=80&w=600'
  ]
};

export const MOCK_NAMES = {
  common: ['Barnaby', 'Whiskers', 'Smokey', 'Shadow'],
  uncommon: ['Leafy', 'Fern', 'Sage', 'Hunter'],
  rare: ['Nimbus', 'Zephyr', 'Bluebie', 'Skye'],
  epic: ['Lotus', 'Orion', 'Sasha', 'Cleopatra'],
  legendary: ['Midas', 'Solaria', 'Aurelia', 'Raja'],
};

export const MOCK_BREEDS = {
  common: 'Domestic Shorthair',
  uncommon: 'American Bobtail',
  rare: 'Russian Blue',
  epic: 'Siamese Cat',
  legendary: 'Majestic Persian Longhair',
};

export const SpotTab: React.FC<SpotTabProps> = ({
  currentUser,
  existingCats,
  onActionComplete,
  onSelectCat,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isCameraLive, setIsCameraLive] = useState<boolean>(false);
  const [flashOverlay, setFlashOverlay] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);

  // AI Cat Detector States
  const [catDetected, setCatDetected] = useState<boolean>(false);
  const [detectedRarity, setDetectedRarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('common');

  const [resolvedCatch, setResolvedCatch] = useState<{
    id?: string;
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

  // Simulated AI Cat Detector loop (simulates scanner search and target lock)
  useEffect(() => {
    if (scanState !== 'streaming') {
      setCatDetected(false);
      return;
    }

    const interval = setInterval(() => {
      setCatDetected((prev) => {
        const next = !prev;
        if (next) {
          // Roll rarity weights: Common (45%), Uncommon (28%), Rare (15%), Epic (10%), Legendary (2%)
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
    }, 3500); // toggles detection state every 3.5s

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
          // Default mock coordinates for sandbox locking
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
      console.warn('Could not load hardware video feed, fallback to simulated viewfinder:', err);
      setIsCameraLive(false);
      setScanState('streaming'); // treat simulated view as streaming
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  const [triggerShake, setTriggerShake] = useState<boolean>(false);

  const handleCapture = () => {
    if (scanState !== 'streaming') return;

    if (!catDetected) {
      // Trigger visual warning shake
      setTriggerShake(true);
      setTimeout(() => setTriggerShake(false), 350);
      return;
    }

    // Trigger visual snap flash
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
      // Desktop fallback: Select a random mock image from the list based on detected rarity
      const list = MOCK_CAT_IMAGES[detectedRarity];
      const randomImage = list[Math.floor(Math.random() * list.length)];
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

    // 1.5s Mock Analysis Delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const lat = geolocation ? geolocation.latitude : 40.7128;
    const lng = geolocation ? geolocation.longitude : -74.0060;

    // Check for re-sight (25% chance if catches exist)
    const isReSight = Math.random() < 0.25 && existingCats.length > 0;

    if (isReSight) {
      // Pick a random cat from current list
      const matchedCat = existingCats[Math.floor(Math.random() * existingCats.length)];
      
      setResolvedCatch({
        id: matchedCat.id,
        rarity: matchedCat.rarity,
        nickname: matchedCat.nickname,
        breedGuess: matchedCat.breedGuess,
        xpGained: 5,
        distinguishingFeatures: matchedCat.distinguishingFeatures,
      });

      // Write re-sight event to mock DB
      await addCatchRecord(
        currentUser.uid,
        currentUser.displayName,
        {
          nickname: matchedCat.nickname,
          photoURL: capturedPhoto,
          breedGuess: matchedCat.breedGuess,
          distinguishingFeatures: matchedCat.distinguishingFeatures,
          rarity: matchedCat.rarity,
          lat,
          lng,
        },
        5,
        false
      );

      setScanState('resight');
      return;
    }

    // Default to New Catch
    const rolledRarity = detectedRarity;
    const xpWeights = { common: 10, uncommon: 25, rare: 60, epic: 150, legendary: 400 };
    const xp = xpWeights[rolledRarity];
    const nameList = MOCK_NAMES[rolledRarity];
    const nickname = nameList[Math.floor(Math.random() * nameList.length)];
    const breed = MOCK_BREEDS[rolledRarity];
    const features = `Beautiful ${rolledRarity} cat spotted around geographic coordinates. Features sleek fur patches and attentive posture.`;

    // Save Catch Record to DB
    const result = await addCatchRecord(
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
      xp,
      false
    );

    setResolvedCatch({
      id: result.catchId,
      rarity: rolledRarity,
      nickname,
      breedGuess: breed,
      xpGained: xp,
      distinguishingFeatures: features,
    });

    setScanState('success');
  };

  const handleDone = () => {
    if (resolvedCatch) {
      onActionComplete(resolvedCatch.xpGained, `Added ${resolvedCatch.nickname} to CatchDex!`);
    }
    setCapturedPhoto(null);
    setResolvedCatch(null);
    startCamera();
  };

  return (
    <div className={`flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto relative overflow-hidden bg-slate-950 text-white rounded-3xl border-4 shadow-2xl h-[70vh] min-h-[500px] transition-all duration-300 ${
      triggerShake ? 'animate-shake border-danger' : 'border-slate-900'
    }`}>
      
      {/* Top camera overlay bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center select-none">
        
        {/* Geolocation Chip */}
        <div className="bg-[#1E1B18]/80 backdrop-blur-md text-[10px] text-[#FFFDF9] border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5 font-sans font-bold shadow-sm">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>LOCATION LOCK</span>
          {geolocation && (
            <span className="font-mono text-[9px] opacity-70">
              ({geolocation.latitude.toFixed(4)}, {geolocation.longitude.toFixed(4)})
            </span>
          )}
        </div>

        {/* Flash Cosmetic Toggle */}
        <button
          onClick={() => setFlashOn(!flashOn)}
          className={`p-2 rounded-full backdrop-blur-md border border-white/10 transition-colors cursor-pointer ${
            flashOn ? 'bg-amber-400 text-slate-950' : 'bg-[#1E1B18]/70 text-[#FFFDF9]'
          }`}
          aria-label="Flash Toggle"
        >
          <Flashlight className="w-4 h-4" />
        </button>
      </div>

      {/* Snap Flash Visual Overlay */}
      {flashOverlay && (
        <div className="absolute inset-0 bg-white z-40 animate-flash pointer-events-none" />
      )}

      {/* Center viewfinder zone */}
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

        {/* Desktop Viewfinder Mock Display */}
        {scanState === 'streaming' && !isCameraLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950/80 to-slate-950 p-6 text-center select-none">
            {/* Viewfinder brackets */}
            <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-white/40"></div>
            <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-white/40"></div>
            <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-white/40"></div>
            <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-white/40"></div>
            
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center animate-spin-slow mb-4">
              <Camera className="w-8 h-8 text-white/20" />
            </div>
            
            <h4 className="font-display font-bold text-sm text-[#FFFDF9] tracking-wide">Desktop Viewfinder Mode</h4>
            <p className="text-[10px] text-ink-soft max-w-[220px] mt-1 leading-normal">
              Camera simulated for demo review. Click the shutter below to generate a stray catch.
            </p>
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
                  CONFIDENCE: 98.7%
                </span>
              </div>
            )}

            {/* Bottom help indicator */}
            <div className={`text-[8px] font-mono px-3 py-1 rounded-full border transition-colors select-none ${
              catDetected 
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/50' 
                : 'text-rose-400 bg-rose-950/60 border-rose-900/50'
            }`}>
              {catDetected ? 'SHUTTER ACTIVE — SCAN DETECT COMPLETED' : 'SEARCHING FOR HEAT SIGS... HOLD STEADY'}
            </div>
          </div>
        )}

        {/* Ambient Full-screen Green Glow Overlay when Cat is detected */}
        {scanState === 'streaming' && catDetected && (
          <div className="absolute inset-0 border-[8px] border-emerald-500/20 shadow-[inset_0_0_60px_rgba(16,185,129,0.35)] pointer-events-none z-15 animate-pulse" />
        )}

        {/* Frozen Frame View */}
        {capturedPhoto && (scanState === 'captured' || scanState === 'analyzing' || scanState === 'rejected' || scanState === 'resight') && (
          <div className={`w-full h-full relative ${scanState === 'rejected' ? 'animate-shake border-4 border-danger' : ''}`}>
            <img
              src={capturedPhoto}
              alt="Viewfinder snap"
              className="w-full h-full object-cover"
            />
            {scanState === 'rejected' && (
              <div className="absolute inset-0 bg-[#B91C1C]/10 transition-colors pointer-events-none" />
            )}
          </div>
        )}

        {/* Laser Sweep Scan overlay */}
        {scanState === 'analyzing' && (
          <ScanLineOverlay mode="spot" message="Identifying stray cat species..." />
        )}

        {/* Outcome 1: REJECTED Frame */}
        {scanState === 'rejected' && (
          <div className="absolute inset-0 z-30 bg-[#1E1B18]/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-full flex items-center justify-center text-danger mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="font-display font-black text-lg text-danger tracking-wider uppercase">Capture Disapproved</h3>
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

        {/* Outcome 2: RE-SIGHT Frame */}
        {scanState === 'resight' && resolvedCatch && (
          <div className="absolute inset-0 z-30 bg-[#1E1B18]/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-4 animate-float">
              <Eye className="w-7 h-7" />
            </div>
            <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-900">
              RE-SIGHT ENCRYPTED
            </span>
            <h3 className="font-display font-black text-xl text-[#FFFDF9] tracking-wide mt-4 uppercase">
              Seen {resolvedCatch.nickname} Before!
            </h3>
            <p className="text-xs text-ink-soft max-w-[240px] mt-2.5 leading-normal">
              Logged another sighting update at these coordinates. You earned a small finder bonus.
            </p>
            
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs px-3.5 py-1.5 rounded-xl my-4">
              +5 XP GRANTED
            </div>

            <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
              {onSelectCat && (
                <button
                  onClick={() => {
                    const c = existingCats.find((item) => item.id === resolvedCatch.id);
                    if (c) onSelectCat(c);
                  }}
                  className="py-3 bg-emerald-500 text-slate-950 rounded-xl font-extrabold uppercase text-[10px] tracking-wider transition hover:bg-emerald-400 active:scale-95 cursor-pointer"
                >
                  View Profile Card
                </button>
              )}
              <button
                onClick={handleDone}
                className="py-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-xl font-bold uppercase text-[9px] tracking-wider transition cursor-pointer"
              >
                Close Viewfinder
              </button>
            </div>
          </div>
        )}

        {/* Outcome 3: NEW CATCH Sequence Ceremony */}
        {scanState === 'success' && resolvedCatch && (
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

      {/* VIEWPORT BOTTOM: Viewfinder layout controls */}
      {scanState === 'streaming' && (
        <div className="w-full bg-[#1E1B18] p-4 shrink-0 flex justify-between items-center border-t border-slate-900 select-none rounded-b-2xl">
          {/* Flip camera */}
          <button
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="p-3 bg-slate-900/60 hover:bg-slate-900 rounded-full transition cursor-pointer active:scale-90"
            aria-label="Flip Camera"
          >
            <RefreshCw className="w-4 h-4 text-[#FFFDF9]" />
          </button>

          {/* Central Shutter ring */}
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white bg-danger hover:bg-red-500 active:scale-90 flex items-center justify-center transition-transform shadow-lg relative shrink-0 cursor-pointer group"
            aria-label="Shutter Snap"
          >
            <div className="w-11 h-11 rounded-full border border-white/20 bg-white/10 group-hover:scale-105 transition-transform" />
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
            className="flex-1 py-3 bg-[#D97706] hover:bg-[#D97706]/90 text-white font-extrabold rounded-xl transition text-[10px] uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white shrink-0" />
            <span>Verify Sighting</span>
          </button>
        </div>
      )}



    </div>
  );
};
