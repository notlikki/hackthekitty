import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { X, MapPin, Utensils, Clock, Building, Camera, Check, Compass, Navigation } from 'lucide-react';
import { getCatEvents, markCatAsAdopted, type Cat, type CatEvent, type UserProfile } from '../services/firebase';
import { RarityChip } from './RarityChip';
import { RarityGlowCard } from './RarityGlowCard';
import { BottomSheet } from './BottomSheet';

interface CatDetailProps {
  cat: Cat;
  currentUser: UserProfile | null;
  onClose: () => void;
  onFeedDirectly: (cat: Cat) => void;
  onAdoptionStatusChanged: () => void;
  onViewOnMap?: (cat: Cat) => void;
}

// Haversine formula to compute distance
function getDistanceText(lat1: number, lon1: number, lat2: number, lon2: number): string {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 'Unknown dist';
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }
  return `${(distance / 1000).toFixed(1)} km`;
}

export const CatDetail: React.FC<CatDetailProps> = ({
  cat,
  currentUser,
  onClose,
  onFeedDirectly,
  onAdoptionStatusChanged,
  onViewOnMap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [events, setEvents] = useState<CatEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // NGO adoption form states
  const [showAdoptForm, setShowAdoptForm] = useState<boolean>(false);
  const [adoptionNote, setAdoptionNote] = useState<string>('');
  const [adoptionPhoto, setAdoptionPhoto] = useState<string>('');
  const [submittingAdoption, setSubmittingAdoption] = useState<boolean>(false);

  // Get user's live location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => console.warn('Could not lock user coordinates for detail distance calc.')
      );
    }
  }, []);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const history = await getCatEvents(cat.id);
        setEvents(history);
      } catch (e) {
        console.error('Failed to load events', e);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [cat.id]);

  const isAdopted = cat.adoptionStatus && cat.adoptionStatus.isAdopted;
  const isUserNGO = currentUser?.role === 'ngo';

  // Centering GPS coordinate
  const latestGeo = { latitude: cat.lat, longitude: cat.lng };

  // Initialize Map
  useEffect(() => {
    if (!loading && L && mapContainerRef.current && latestGeo.latitude && latestGeo.longitude) {
      try {
        const container = mapContainerRef.current;
        const mapInstance = (container as any)._leaflet_map;
        if (mapInstance) {
          mapInstance.remove();
        }

        const map = L.map(container, {
          zoomControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          dragging: false,
        }).setView([latestGeo.latitude, latestGeo.longitude], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);

        const pinHTML = isAdopted
          ? `<div class="w-8 h-8 rounded-xl bg-teal-600 border-2 border-white flex items-center justify-center shadow-lg text-sm">🏠</div>`
          : `<div class="w-7 h-7 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center shadow-lg text-xs">🐱</div>`;

        const catIcon = L.divIcon({
          html: pinHTML,
          className: 'custom-cat-marker',
          iconSize: isAdopted ? [32, 32] : [28, 28],
          iconAnchor: isAdopted ? [16, 16] : [14, 14],
        });

        L.marker([latestGeo.latitude, latestGeo.longitude], { icon: catIcon }).addTo(map);

        // Invalidate size to guarantee rendering inside overlays/drawers
        setTimeout(() => {
          map.invalidateSize();
        }, 150);

        (container as any)._leaflet_map = map;
      } catch (err) {
        console.error('Leaflet map initialization failed:', err);
      }
    }

    return () => {
      if (mapContainerRef.current) {
        const mapInstance = (mapContainerRef.current as any)._leaflet_map;
        if (mapInstance) {
          mapInstance.remove();
          (mapContainerRef.current as any)._leaflet_map = null;
        }
      }
    };
  }, [loading, latestGeo.latitude, cat.id, isAdopted]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdoptionPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdoptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmittingAdoption(true);
    
    const org = currentUser.orgName || currentUser.displayName || 'Rescue Org';

    try {
      await markCatAsAdopted(currentUser.uid, cat.id, org, adoptionNote, adoptionPhoto);
      setShowAdoptForm(false);
      onAdoptionStatusChanged();
    } catch (err) {
      console.error(err);
      alert("Failed to mark cat as adopted.");
    } finally {
      setSubmittingAdoption(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const computedDistance = userLocation 
    ? getDistanceText(userLocation.lat, userLocation.lng, cat.lat, cat.lng)
    : 'Unknown dist';

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
      
      {/* Sliding Drawer Body */}
      <div className="w-full max-w-md h-full bg-[#FFFDF9] shadow-2xl flex flex-col relative overflow-hidden animate-slide-in">
        
        {/* Header toolbar */}
        <div className="bg-[#1E1B18] text-[#FFFDF9] p-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐱</span>
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-[#FFFDF9]">Stray Profile File</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
            aria-label="Close Profile"
          >
            <X className="w-5 h-5 text-[#FFFDF9]" />
          </button>
        </div>

        {/* Contents area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar pb-12">
          
          {/* Sighting Main Photo */}
          <div className="w-full relative shrink-0">
            <RarityGlowCard rarity={isAdopted ? 'adopted' : cat.rarity} className="p-1 w-full bg-[#FFFDF9]">
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200/50">
                <img 
                  src={cat.photoURL} 
                  alt={cat.nickname} 
                  className="w-full h-full object-cover"
                />
              </div>
            </RarityGlowCard>
          </div>

          {/* ADOPTION OR RARITY STATE BANNER */}
          {isAdopted ? (
            <div className="bg-gradient-to-r from-teal-500/10 to-teal-500/5 border-2 border-teal-500/30 p-4 rounded-3xl text-emerald-950 flex gap-3 shadow-xs">
              <span className="text-2xl animate-float">🏡</span>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase text-teal-700 tracking-widest block font-mono">ADOPTED_AND_SAFE</span>
                <h4 className="font-display font-bold text-sm mt-0.5 text-ink">In Foster Care at {cat.adoptionStatus.orgName}</h4>
                <p className="text-[11px] text-ink-soft mt-1 leading-normal italic">
                  "{cat.adoptionStatus.note || 'Doing great and getting healthy!'}"
                </p>
                {cat.adoptionStatus.markedAt && (
                  <span className="text-[9px] text-ink-soft font-mono mt-1.5 block opacity-70">
                    SIGHTING LOG DECRYPTED: {formatDate(new Date(cat.adoptionStatus.markedAt))}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#1E1B18] p-3 rounded-2xl border border-white/5 text-[#FFFDF9]">
              <div className="text-left">
                <span className="text-[8px] font-mono tracking-widest text-[#6E665F] uppercase font-black">Rarity Rank Badge</span>
                <h4 className="font-display font-bold text-sm text-[#FFFDF9] mt-0.5 capitalize">{cat.rarity} Sighting</h4>
              </div>
              <RarityChip rarity={cat.rarity} />
            </div>
          )}

          {/* Nickname / Breed segment */}
          <div className="bg-[#FFFDF9] rounded-3xl p-4 border border-slate-200/60 shadow-xs text-left">
            <h3 className="font-display font-black text-xl text-ink leading-none">{cat.nickname}</h3>
            <p className="text-xs text-[#6E665F] font-mono tracking-widest uppercase mt-1.5 border-b border-slate-100 pb-2.5">
              {cat.breedGuess}
            </p>
            
            <div className="mt-3.5 space-y-1.5">
              <span className="text-[9px] font-mono tracking-widest text-[#6E665F] uppercase font-black block">Identifying Scans</span>
              <p className="text-xs text-ink-soft leading-relaxed font-sans font-medium">
                {cat.distinguishingFeatures || 'No distinct features logged in viewfinder.'}
              </p>
            </div>
          </div>

          {/* TABULAR STATS MATRIX */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="bg-[#FFFDF9] rounded-2xl border border-slate-200/50 p-3 text-center">
              <span className="text-[9px] text-[#6E665F] uppercase tracking-wider block font-bold">Times Fed</span>
              <div className="flex items-center justify-center gap-1.5 mt-1 font-black text-sm text-ink">
                <Utensils className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
                <span>{cat.timesFed}</span>
              </div>
            </div>

            <div className="bg-[#FFFDF9] rounded-2xl border border-slate-200/50 p-3 text-center">
              <span className="text-[9px] text-[#6E665F] uppercase tracking-wider block font-bold">Coordinates Distance</span>
              <div className="flex items-center justify-center gap-1.5 mt-1 font-black text-sm text-ink">
                <Compass className="w-3.5 h-3.5 text-rarity-rare" />
                <span>{computedDistance}</span>
              </div>
            </div>
          </div>

          {/* Sighting Timeline Coordinates details */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-slate-200/50 p-3 text-xs space-y-2 text-left font-mono">
            <div className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1.5">
              <span className="text-[#6E665F] font-bold">First Spotted:</span>
              <span className="text-ink font-black">{formatDate(cat.caughtAt)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#6E665F] font-bold">Last Sighted:</span>
              <span className="text-ink font-black">{formatDate(cat.lastSeenAt)}</span>
            </div>
          </div>

          {/* STATIC MAP PREVIEW AREA */}
          {latestGeo.latitude && latestGeo.longitude && (
            <div className="space-y-1.5 text-left">
              <h4 className="text-[9px] font-mono tracking-widest text-[#6E665F] uppercase font-black pl-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#B91C1C]" />
                <span>Radar Pin Capture</span>
              </h4>
              
              <div 
                onClick={() => onViewOnMap?.(cat)}
                className="w-full h-36 bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden relative shadow-inner z-10 cursor-pointer group"
              >
                <div ref={mapContainerRef} className="w-full h-full" />
                
                {/* Click to open full map tooltip */}
                <div className="absolute inset-0 z-20 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                  <span className="bg-slate-950/90 text-white font-mono text-[9px] tracking-wider px-3.5 py-1.5 rounded-full border border-white/10 uppercase font-black flex items-center gap-1 shadow-md">
                    <Navigation className="w-3.5 h-3.5 fill-white" />
                    <span>Focus Radar Map</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACTION ROW: Feed vs Adopted */}
          {isAdopted ? (
            <div className="bg-[#F0FDFD] rounded-2xl p-4 border border-teal-200/50 text-center text-teal-800 font-bold text-xs uppercase tracking-wider select-none">
              🏡 Sighting cataloged in shelter records. Safe!
            </div>
          ) : (
            <button
              onClick={() => onFeedDirectly(cat)}
              className="w-full py-4 bg-gradient-to-r from-[#D97706] to-orange-500 hover:from-[#D97706]/90 hover:to-orange-400 text-white font-black rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 select-none text-xs uppercase tracking-wider cursor-pointer"
            >
              <Utensils className="w-4 h-4 fill-white shrink-0" />
              <span>Verify Feeding (+20 XP)</span>
            </button>
          )}

          {/* NGO MARK ADOPTED trigger button */}
          {isUserNGO && !isAdopted && (
            <button
              onClick={() => setShowAdoptForm(true)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-[#FFFDF9] rounded-2xl font-bold transition text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Building className="w-4 h-4 text-emerald-500" />
              <span>Mark Adopted / Safe</span>
            </button>
          )}

          {/* Sighting timeline event history logs */}
          <div className="space-y-3 pt-3 border-t border-slate-100 text-left">
            <h4 className="text-[9px] font-mono tracking-widest text-[#6E665F] uppercase font-black pl-1">
              Sighting event updates
            </h4>
            
            {loading ? (
              <div className="text-center py-6 text-xs text-[#6E665F]/60 font-mono animate-pulse">Scanning records...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#6E665F]/50">No sighting logs cataloged.</div>
            ) : (
              <div className="relative pl-4 border-l border-slate-200 space-y-3.5">
                {events.map(event => (
                  <div key={event.id} className="relative">
                    {/* Ring dot node */}
                    <span className={`absolute -left-[20.5px] top-1.5 w-2.5 h-2.5 rounded-full border border-[#FFFDF9] shadow-sm shrink-0 ${
                      event.type === 'catch' ? 'bg-[#B91C1C]' : 'bg-[#D97706]'
                    }`} />
                    
                    <div className="bg-[#FFFDF9] rounded-2xl border border-slate-200/50 p-3 shadow-xs flex gap-3 hover:border-slate-300 transition-colors">
                      {event.photoURL && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                          <img src={event.photoURL} alt="event" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-between text-[10px] font-mono">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-ink">
                            {event.type === 'catch' ? '🚨 DISCOVERED' : '🥫 MEAL LOG'}
                          </span>
                          {event.xpAwarded > 0 && (
                            <span className="text-[#D97706] font-black">+{event.xpAwarded} XP</span>
                          )}
                        </div>
                        <div className="text-[9px] text-[#6E665F] mt-1 flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3 text-[#6E665F]/60 shrink-0" />
                          <span>{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* NGO ADOPTION MARK DRAWER */}
      <BottomSheet
        isOpen={showAdoptForm}
        onClose={() => setShowAdoptForm(false)}
        title="Rescue Log Entry"
      >
        <form onSubmit={handleAdoptionSubmit} className="space-y-4 text-left text-xs text-ink font-sans">
          
          <div>
            <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Organization Name</label>
            <input 
              type="text" 
              disabled
              value={currentUser?.orgName || 'Rescue Org'} 
              className="w-full p-3 border border-slate-200 bg-slate-100 rounded-xl text-[#6E665F] font-bold font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Adoption Update Notes</label>
            <textarea
              required
              placeholder="Describe their status (e.g. adopted by a warm family, in foster care...)"
              value={adoptionNote}
              onChange={(e) => setAdoptionNote(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:outline-none bg-[#FAF6EE]/50 text-ink leading-relaxed"
              rows={3}
            />
          </div>

          <div>
            <label className="block font-bold text-[#6E665F] uppercase tracking-wider mb-1">Upload Adoption Photo (Optional)</label>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-[#FAF6EE] hover:bg-slate-100 rounded-xl cursor-pointer font-bold text-xs select-none shadow-sm active:scale-95 transition-transform">
                <Camera className="w-4 h-4 text-[#6E665F]" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {adoptionPhoto && (
                <span className="text-[10px] text-teal-600 font-bold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> Photo Loaded</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submittingAdoption}
            className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl transition uppercase tracking-wider text-xs shadow-md mt-4 cursor-pointer"
          >
            {submittingAdoption ? 'Saving updates...' : 'Submit Sighting Record'}
          </button>
        </form>
      </BottomSheet>

    </div>
  );
};
