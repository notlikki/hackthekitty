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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
                <div class="flex flex-col items-center select-none" style="transform: translateY(-8px);">
                  <div class="relative w-10 h-10 rounded-xl border-[3px] border-[#0F766E] bg-[#FAF6EE] shadow-[0_3px_8px_rgba(30,27,24,0.3)] flex items-center justify-center hover:scale-110 transition-transform">
                    <img src="${cat.photoURL}" class="w-full h-full rounded-lg object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                    <div class="w-full h-full rounded-lg bg-[#0F766E] flex items-center justify-center text-sm" style="display: none;">🏠</div>
                    <!-- small adopted badge at bottom-right corner -->
                    <span class="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded bg-[#0F766E] text-white border border-white text-[8px] flex items-center justify-center font-bold shadow-sm">🏠</span>
                  </div>
                  <!-- pointed pin tail pointing down -->
                  <div class="w-2.5 h-2.5 bg-[#0F766E] rotate-45 -mt-1.5 shadow-md z-[-1]"></div>
                </div>
              `,
              className: 'custom-map-marker-adopted',
              iconSize: [40, 48],
              iconAnchor: [20, 48],
            });
          } else {
            const colors: Record<string, string> = {
              common: '#9A938C',
              uncommon: '#4E8C5D',
              rare: '#3882B8',
              epic: '#844C9C',
              legendary: '#D97706',
            };
            const hexColor = colors[cat.rarity] || colors.common;
            const bgClass = cat.rarity === 'common' ? 'bg-[#9A938C]' :
                            cat.rarity === 'uncommon' ? 'bg-[#4E8C5D]' :
                            cat.rarity === 'rare' ? 'bg-[#3882B8]' :
                            cat.rarity === 'epic' ? 'bg-[#844C9C]' : 'bg-[#D97706]';

            markerIcon = L.divIcon({
              html: `
                <div class="flex flex-col items-center select-none animate-fade-in" style="transform: translateY(-8px);">
                  <div class="relative w-10 h-10 rounded-full border-[3px] border-[${hexColor}] bg-[#FAF6EE] shadow-[0_3px_8px_rgba(30,27,24,0.3)] flex items-center justify-center hover:scale-110 transition-transform">
                    <img src="${cat.photoURL}" class="w-full h-full rounded-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                    <div class="w-full h-full rounded-full ${bgClass} flex items-center justify-center text-sm" style="display: none;">🐱</div>
                    <!-- small rarity dot/badge at bottom-right corner -->
                    <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border border-white bg-[${hexColor}] shadow-sm"></span>
                  </div>
                  <!-- pointed pin tail pointing down -->
                  <div class="w-2.5 h-2.5 bg-[${hexColor}] rotate-45 -mt-1.5 shadow-md z-[-1]"></div>
                </div>
              `,
              className: 'custom-map-marker-rarity',
              iconSize: [40, 48],
              iconAnchor: [20, 48],
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
    <div className="flex-1 flex flex-col space-y-4 animate-fade-in h-[70vh] min-h-[500px] w-full max-w-md mx-auto relative rounded-3xl border-4 border-[#1E1B18] overflow-hidden shadow-2xl bg-[#FAF6EE] select-none">
      
      {/* Recenter Navigation button */}
      <button
        onClick={handleRecenter}
        className="absolute top-4 right-4 z-20 p-3 bg-[#FFFDF9]/95 text-[#1E1B18] rounded-full border border-slate-200/80 shadow-md hover:bg-slate-50 transition active:scale-90 flex items-center justify-center cursor-pointer"
        title="Recenter Radar"
      >
        <Navigation className="w-4 h-4 fill-current" />
      </button>

      {/* Floating collapsible legend button */}
      <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="p-3 bg-[#FFFDF9]/95 text-[#1E1B18] rounded-full border border-slate-200/80 shadow-md hover:bg-slate-50 transition flex items-center justify-center cursor-pointer"
          title="Radar Legend"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {showLegend && (
          <div className="bg-[#FFFDF9] text-ink rounded-2xl p-3 border border-slate-200 shadow-xl max-w-[280px] text-[10px] space-y-2 animate-fade-in font-sans text-left font-semibold z-30">
            <p className="font-display font-black text-[9px] uppercase tracking-wider text-[#6E665F] border-b border-slate-100 pb-1">
              Radar Markings
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#9A938C] bg-white flex items-center justify-center text-[7px] shrink-0">🐱</span>
                <span>Common</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#4E8C5D] bg-white flex items-center justify-center text-[7px] shrink-0">🐱</span>
                <span>Uncommon</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#3882B8] bg-white flex items-center justify-center text-[7px] shrink-0">🐱</span>
                <span>Rare</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#844C9C] bg-white flex items-center justify-center text-[7px] shrink-0">🐱</span>
                <span>Epic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#D97706] bg-white flex items-center justify-center text-[7px] shrink-0">🐱</span>
                <span>Legendary</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border-[1.5px] border-[#0F766E] bg-white flex items-center justify-center text-[8px] shrink-0">🏠</span>
                <span className="text-adopted">Adopted</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map loading spinner */}
      {loading && catches.length === 0 && (
        <div className="absolute inset-0 z-20 bg-[#FAF6EE]/90 flex flex-col items-center justify-center text-[#1E1B18] space-y-3">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#D97706] animate-spin"></div>
          <p className="text-xs text-[#6E665F] font-bold uppercase font-mono tracking-widest">Generating Sighting Radar...</p>
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
