import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getAllCatches } from '../services/firebase';
import type { Cat } from '../services/firebase';
import { Navigation, Eye, Utensils, HelpCircle, Clock } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { RarityChip } from './RarityChip';
import { AdoptedChip } from './AdoptedChip';

interface MapTabProps {
  onSelectCat: (cat: Cat) => void;
}

export const MapTab: React.FC<MapTabProps> = ({ onSelectCat }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [catches, setCatches] = useState<Cat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<[number, number]>([40.7128, -74.0060]); // Default New York
  const [zoomLevel, setZoomLevel] = useState<number>(14);

  // Popup state
  const [selectedPopupCat, setSelectedPopupCat] = useState<Cat | null>(null);

  // Legend visibility state
  const [showLegend, setShowLegend] = useState<boolean>(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => console.warn('Could not read GPS, utilizing fallback center.')
      );
    }
    loadCatches();
  }, []);

  const loadCatches = async () => {
    setLoading(true);
    try {
      const data = await getAllCatches();
      setCatches(data);
    } catch (e) {
      console.error('Error loading catches for map:', e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (L && mapContainerRef.current && userLocation[0] !== 0) {
      try {
        const container = mapContainerRef.current;
        const mapInstance = (container as any)._leaflet_map;
        if (mapInstance) {
          mapInstance.remove();
        }

        const map = L.map(container, {
          zoomControl: false,
          scrollWheelZoom: true,
        }).setView(userLocation, zoomLevel);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);

        // Add markers
        catches.forEach((cat) => {
          const isAdopted = cat.adoptionStatus && cat.adoptionStatus.isAdopted;

          let markerIcon;
          if (isAdopted) {
            markerIcon = L.divIcon({
              html: `
                <div class="w-8 h-8 bg-[#0F766E] border-2 border-white rounded-xl shadow-lg flex items-center justify-center text-sm transform -translate-y-1 hover:scale-110 transition-transform">
                  🏠
                </div>
              `,
              className: 'custom-map-marker-adopted',
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
          } else {
            const colors: Record<string, string> = {
              common: 'bg-[#9A938C]',
              uncommon: 'bg-[#4E8C5D]',
              rare: 'bg-[#3882B8]',
              epic: 'bg-[#844C9C] animate-pulse',
              legendary: 'bg-[#D97706] animate-pulse border-amber-300',
            };
            const bgClass = colors[cat.rarity] || colors.common;

            markerIcon = L.divIcon({
              html: `
                <div class="w-6.5 h-6.5 rounded-full border-2 border-white ${bgClass} shadow-md flex items-center justify-center text-[10px] hover:scale-115 transition-transform">
                  🐱
                </div>
              `,
              className: 'custom-map-marker-rarity',
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            });
          }

          const marker = L.marker([cat.lat, cat.lng], { icon: markerIcon }).addTo(map);
          marker.on('click', () => {
            setSelectedPopupCat(cat);
          });
        });

        // Sync local zoomLevel state on manual zoom controls
        map.on('zoomend', () => {
          setZoomLevel(map.getZoom());
        });

        // Invalidate size to ensure it renders correctly even in hidden/animating containers
        setTimeout(() => {
          map.invalidateSize();
        }, 200);

        // Store map reference on container
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
  }, [userLocation, catches, loading]);

  const handleRecenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setZoomLevel(15);
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 animate-fade-in h-[70vh] min-h-[500px] w-full max-w-md mx-auto relative rounded-3xl border-4 border-slate-900 overflow-hidden shadow-2xl bg-slate-900 select-none">
      
      {/* Recenter Navigation button */}
      <button
        onClick={handleRecenter}
        className="absolute top-4 right-4 z-20 p-3 bg-slate-950/90 text-white rounded-full border border-white/10 shadow-lg hover:bg-slate-900 transition active:scale-90 flex items-center justify-center cursor-pointer"
        title="Recenter Radar"
      >
        <Navigation className="w-4 h-4 fill-white" />
      </button>

      {/* Floating collapsible legend button */}
      <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="p-3 bg-slate-950/90 text-white rounded-full border border-white/10 shadow-lg hover:bg-slate-900 transition flex items-center justify-center cursor-pointer"
          title="Radar Legend"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {showLegend && (
          <div className="bg-[#FFFDF9] text-ink rounded-2xl p-3 border border-slate-200 shadow-xl max-w-[180px] text-[10px] space-y-2 animate-fade-in font-sans text-left font-semibold">
            <p className="font-display font-black text-[9px] uppercase tracking-wider text-[#6E665F] border-b border-slate-100 pb-1">
              Radar Markings
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#9A938C] border border-white shrink-0" />
                <span>Common Sighting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#4E8C5D] border border-white shrink-0" />
                <span>Uncommon Sighting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#3882B8] border border-white shrink-0" />
                <span>Rare Sighting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#844C9C] border border-white shrink-0" />
                <span>Epic Sighting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#D97706] border border-amber-300 shrink-0" />
                <span>Legendary Discovery</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                <span className="w-4.5 h-4.5 bg-[#0F766E] border border-white rounded-lg flex items-center justify-center text-[9px] text-white shrink-0 font-bold">🏠</span>
                <span className="text-adopted">Adopted & Safe</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map loading spinner */}
      {loading && catches.length === 0 && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 flex flex-col items-center justify-center text-white space-y-3">
          <div className="w-8 h-8 rounded-full border-4 border-slate-700 border-t-[#D97706] animate-spin"></div>
          <p className="text-xs text-slate-400 font-bold uppercase font-mono tracking-widest">Generating Sighting Radar...</p>
        </div>
      )}
      {/* Map View Viewport */}
      <div className="flex-1 w-full relative z-10 flex flex-col">
        <div ref={mapContainerRef} className="flex-1 w-full" />
      </div>
      {/* MOBILE FRIENDLY DRAWER: Slides up on pin click */}
      <BottomSheet
        isOpen={selectedPopupCat !== null}
        onClose={() => setSelectedPopupCat(null)}
        title="Radar Sighting Scanned"
      >
        {selectedPopupCat && (
          <div className="text-left font-sans space-y-4">
            
            {/* Image & Header */}
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img 
                  src={selectedPopupCat.photoURL} 
                  alt={selectedPopupCat.nickname} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1">
                <h3 className="font-display font-bold text-base text-ink line-clamp-1 leading-tight">
                  {selectedPopupCat.nickname}
                </h3>
                <p className="text-[10px] text-[#6E665F] font-mono tracking-widest uppercase mt-0.5">
                  {selectedPopupCat.breedGuess}
                </p>
                <div className="mt-1.5">
                  {selectedPopupCat.adoptionStatus && selectedPopupCat.adoptionStatus.isAdopted ? (
                    <AdoptedChip orgName={selectedPopupCat.adoptionStatus.orgName || 'Adopted'} />
                  ) : (
                    <RarityChip rarity={selectedPopupCat.rarity} />
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-ink-soft">
                <Utensils className="w-4 h-4 text-[#D97706] shrink-0" />
                <span>Fed: <span className="font-black text-ink">{selectedPopupCat.timesFed}x</span></span>
              </div>
              
              <div className="flex items-center gap-1.5 text-ink-soft">
                <Clock className="w-4 h-4 text-rarity-rare shrink-0" />
                <span>Last: <span className="font-black text-ink">{formatDate(new Date(selectedPopupCat.lastSeenAt))}</span></span>
              </div>
            </div>

            {/* Redirect Button */}
            <button
              onClick={() => {
                const target = selectedPopupCat;
                setSelectedPopupCat(null);
                onSelectCat(target);
              }}
              className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-[#FFFDF9] font-black rounded-2xl transition uppercase text-xs tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Eye className="w-4 h-4 text-[#FFFDF9]" />
              <span>Analyze Full Profile</span>
            </button>
          </div>
        )}
      </BottomSheet>

    </div>
  );
};
