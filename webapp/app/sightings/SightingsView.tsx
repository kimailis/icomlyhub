'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Map as MapIcon, Plus, Minus, MousePointer2, Loader2, MapPin, Users, X, Activity, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { backend } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface SightingItem {
    celebName: string;
    celebId: string;
    celebImage: string;
    confidence: number;
    activity: 'High' | 'Medium';
    snippet: string;
}

interface LocationGroup {
    location: string;
    items: SightingItem[];
}

interface MapCluster {
  id: string;
  lat: number;
  lng: number;
  groups: LocationGroup[];
  totalCount: number;
  hasHighActivity: boolean;
}

interface SightingsViewProps {
    initialSightings: any[];
}

export default function SightingsView({ initialSightings }: SightingsViewProps) {
  const router = useRouter();
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false); 
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null); 
  
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  
  const [clusters, setClusters] = useState<MapCluster[]>([]);
  const [allSightingsFromApi, setAllSightingsFromApi] = useState<any[]>(initialSightings);
  const [loading, setLoading] = useState(initialSightings.length === 0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomControlRef = useRef<HTMLDivElement>(null);

  const onSelectCeleb = (id: string) => {
    if (!id || id === 'undefined') {
        console.error("Attempted to navigate to celebrity with invalid ID from Map:", id);
        return;
    }
    router.push(`/celebrity/${id}`);
  };

  const processSightings = (sightingsData: any[]) => {
      // Deduplicate: keep only the latest sighting per celebrity for the MAP pins
      const seenCelebrityIds = new Set<string>();
      const filtered = sightingsData.filter((s: any) => {
          if (seenCelebrityIds.has(s.celebrity?.id)) {
              return false;
          }
          if (s.celebrity?.id) {
              seenCelebrityIds.add(s.celebrity.id);
          }
          return true;
      });
      
      const rawSightings: { lat: number; lng: number; city: string; item: SightingItem }[] = [];
      
      filtered.forEach((s: any) => {
          if (s.lat && s.lng) {
              rawSightings.push({
                  lat: s.lat,
                  lng: s.lng,
                  city: s.location,
                  item: {
                      celebName: s.celebrity.name,
                      celebId: s.celebrity.id,
                      celebImage: s.celebrity.imageUrl,
                      confidence: s.confidence,
                      activity: s.celebrity.noiseRating > 70 ? 'High' : 'Medium',
                      snippet: s.snippet
                  }
              });
          }
      });

      const CLUSTER_THRESHOLD = 0.5; 
      const newClusters: MapCluster[] = [];

      rawSightings.forEach(s => {
          let foundCluster = newClusters.find(c => {
              const dLat = Math.abs(c.lat - s.lat);
              const dLng = Math.abs(c.lng - s.lng);
              return dLat < CLUSTER_THRESHOLD && dLng < CLUSTER_THRESHOLD;
          });

          if (foundCluster) {
              foundCluster.totalCount++;
              if (s.item.activity === 'High') foundCluster.hasHighActivity = true;
              
              let group = foundCluster.groups.find(g => g.location === s.city);
              if (group) {
                  group.items.push(s.item);
              } else {
                  foundCluster.groups.push({ location: s.city, items: [s.item] });
              }
          } else {
              newClusters.push({
                  id: `c-${s.lat}-${s.lng}-${Math.random()}`,
                  lat: s.lat,
                  lng: s.lng,
                  groups: [{ location: s.city, items: [s.item] }],
                  totalCount: 1,
                  hasHighActivity: s.item.activity === 'High'
              });
          }
      });
      setClusters(newClusters);
  };

  useEffect(() => {
    if (initialSightings.length > 0) {
        processSightings(initialSightings);
        setLoading(false);
    } else {
        const loadData = async () => {
            try {
                const data = await backend.getMapData();
                setAllSightingsFromApi(data);
                processSightings(data);
            } catch (e) {
                console.error("Failed to load map data", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }
  }, [initialSightings]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const updateSize = () => {
        if (viewportRef.current) {
            const { width, height } = viewportRef.current.getBoundingClientRect();
            if (width > 0 && height > 0) {
                setContainerSize({ width, height });
            }
        }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle Non-Passive Wheel Event for Zoom Control
  useEffect(() => {
      const el = zoomControlRef.current;
      if (!el) return;
      const handleSliderWheel = (e: WheelEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const delta = -e.deltaY * 0.005;
          setZoom(prev => Math.min(Math.max(1, prev + delta), 8));
      };
      el.addEventListener('wheel', handleSliderWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleSliderWheel);
  }, []);

  // Clamping and Auto-Center Logic
  useEffect(() => {
    if (zoom <= 1.05) {
        setPan({ x: 0, y: 0 });
        if (zoom < 1) setZoom(1);
    } else {
        const maxX = (containerSize.width * (zoom - 1)) / 2;
        const maxY = (containerSize.height * (zoom - 1)) / 2;
        setPan(prev => ({
            x: Math.max(-maxX, Math.min(maxX, prev.x)),
            y: Math.max(-maxY, Math.min(maxY, prev.y))
        }));
    }
  }, [zoom, containerSize]);

  // --- Derived Data ---
  const activeCluster = useMemo(() => {
      return clusters.find(c => c.id === activeClusterId) || null;
  }, [clusters, activeClusterId]);

  // --- Map Helper Functions ---
  const getMapCoordinates = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
  };

  const getScreenCoordinates = (lat: number, lng: number) => {
    if (containerSize.width === 0) return { x: 0, y: 0 };
    const u = (lng + 180) / 360; 
    const v = (90 - lat) / 180;
    const cx = containerSize.width / 2;
    const cy = containerSize.height / 2;
    const screenX = cx + pan.x + (u - 0.5) * containerSize.width * zoom;
    const screenY = cy + pan.y + (v - 0.5) * containerSize.height * zoom;
    return { x: screenX, y: screenY };
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(1, prev + delta), 8));
  };

  const handleZoomTo = (level: number) => {
      setZoom(Math.min(Math.max(1, level), 8));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        setZoom(prev => Math.min(Math.max(1, prev + delta), 8));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        setHasMoved(true);
    }
    const maxX = (containerSize.width * (zoom - 1)) / 2;
    const maxY = (containerSize.height * (zoom - 1)) / 2;
    setPan(prev => ({ 
        x: Math.max(-maxX, Math.min(maxX, prev.x + dx)), 
        y: Math.max(-maxY, Math.min(maxY, prev.y + dy)) 
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers
  const getTouchDistance = (touches: React.TouchList) => {
      return Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
      );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
          setIsDragging(true);
          setHasMoved(false);
          setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else if (e.touches.length === 2) {
          setLastTouchDistance(getTouchDistance(e.touches));
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          e.preventDefault();
          const newDistance = getTouchDistance(e.touches);
          if (lastTouchDistance) {
              const delta = newDistance - lastTouchDistance;
              const zoomFactor = delta * 0.005;
              setZoom(prev => Math.min(Math.max(1, prev + zoomFactor), 8));
              setLastTouchDistance(newDistance);
          }
          return;
      }

      if (!isDragging || e.touches.length !== 1) return;
      
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          setHasMoved(true);
      }
      
      const maxX = (containerSize.width * (zoom - 1)) / 2;
      const maxY = (containerSize.height * (zoom - 1)) / 2;

      setPan(prev => ({ 
          x: Math.max(-maxX, Math.min(maxX, prev.x + dx)), 
          y: Math.max(-maxY, Math.min(maxY, prev.y + dy)) 
      }));
      
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      setLastTouchDistance(null);
  };

  const handleMapClick = () => {
      if (!hasMoved) {
          setActiveClusterId(null);
      }
  };

  const handlePinClick = (e: React.MouseEvent | React.TouchEvent, clusterId: string) => {
      e.stopPropagation();
      if (!hasMoved) {
          setActiveClusterId(prev => prev === clusterId ? null : clusterId);
      }
  };

  const resetView = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  };

  const renderTooltipContent = (cluster: MapCluster, isMobile: boolean) => (
      <div 
        onWheel={(e) => e.stopPropagation()} 
        onPointerDown={(e) => e.stopPropagation()}
        className="h-full flex flex-col min-h-0"
        style={{ touchAction: 'auto' }}
      >
        <div 
            className="overflow-y-auto flex-1"
            style={{ touchAction: 'auto' }}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {cluster.groups.map((group, gIdx) => (
                <div key={gIdx} className={`${gIdx > 0 ? 'border-t border-white/10' : ''}`}>
                    <div className="bg-white/10 p-2.5 border-b border-white/5 flex justify-between items-center">
                        <h4 className="text-white font-bold text-[10px] uppercase tracking-wider truncate flex items-center gap-1.5">
                            <MapPin size={10} className="text-primary"/> {group.location}
                        </h4>
                    </div>
                    
                    <div className="p-1">
                        {group.items.map((item, idx) => (
                            <button 
                                key={idx} 
                                className="w-full text-left flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group/item focus:bg-white/10 focus:outline-none"
                                onClick={() => onSelectCeleb(item.celebId)}
                            >
                                <img src={item.celebImage} className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover/item:border-primary/50 transition-colors brightness-[1.05] contrast-[1.02]" alt="" referrerPolicy="no-referrer" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-white truncate group-hover/item:text-primary transition-colors">{item.celebName}</div>
                                    <div className="text-[10px] text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                                        <span className={`px-1 rounded ${item.activity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{item.activity}</span>
                                        <span>{(item.confidence * 100).toFixed(0)}% Match</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
        
        {isMobile && (
            <div className="p-1 border-t border-white/10 bg-black/40 text-center">
                <button 
                    className="text-[8px] text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1 w-full py-0.5"
                    onClick={() => setActiveClusterId(null)}
                >
                    <X size={8}/> Close
                </button>
            </div>
        )}
      </div>
  );

  return (
    <div className="animate-fade-in flex flex-col items-center select-none w-full">
       <header className="mb-6 w-full flex justify-between items-end">
         <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 flex items-center gap-3">
            <MapIcon className="text-accent" />
            Map
            </h1>
            <p className="text-gray-400">Live sightings tracker. Drag to pan, click pins to view details.</p>
         </div>
      </header>

      {/* Map Viewport */}
      <div 
        ref={viewportRef}
        className="relative w-full aspect-[2/1] bg-[#050505] rounded-3xl border border-white/10 overflow-hidden shadow-2xl mb-8 group/map isolate"
      >
         {/* Zoom Slider Control Container */}
         <div className="absolute right-2 top-1/2 -translate-y-1/2 z-[150] flex flex-col gap-2">
            <div 
                ref={zoomControlRef}
                className="flex flex-col items-center bg-black/80 backdrop-blur border border-white/20 rounded-full py-1.5 shadow-xl scale-90 md:scale-100 origin-right"
            >
                <button 
                    onClick={() => handleZoom(1)} 
                    className="p-1.5 md:p-2 text-white hover:text-primary transition-colors focus:outline-none"
                    aria-label="Zoom In"
                >
                    <Plus size={16} />
                </button>
                
                <div className="h-16 md:h-32 w-1.5 bg-white/10 rounded-full my-1.5 relative group cursor-pointer">
                    <div 
                        className="absolute bottom-0 w-full bg-primary rounded-full transition-all duration-150"
                        style={{ height: `${((zoom - 1) / 7) * 100}%` }}
                    />
                    <div 
                        className="absolute w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-lg -left-[3px] md:-left-[5px] transition-all duration-150"
                        style={{ bottom: `calc(${((zoom - 1) / 7) * 100}% - 6px)` }}
                    />
                    <input 
                        type="range" 
                        min="1" 
                        max="8" 
                        step="0.1" 
                        value={zoom} 
                        onChange={(e) => handleZoomTo(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                </div>

                <button 
                    onClick={() => handleZoom(-1)} 
                    className="p-1.5 md:p-2 text-white hover:text-primary transition-colors focus:outline-none"
                    aria-label="Zoom Out"
                >
                    <Minus size={16} />
                </button>

                <div className="w-4 h-px bg-white/20 my-0.5" />

                <button 
                    onClick={resetView}
                    className="p-1.5 md:p-2 text-white hover:text-primary transition-colors focus:outline-none group"
                    aria-label="Reset View"
                >
                    <RotateCcw size={16} className="group-active:rotate-[-180deg] transition-transform duration-300" />
                </button>
            </div>
         </div>

         {/* Map Layer */}
         <div 
            className="absolute inset-0 transition-transform duration-75 ease-linear origin-center z-0 cursor-grab active:cursor-grabbing outline-none"
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                willChange: 'transform',
                touchAction: 'none'
            }}
            role="application"
            aria-label="Interactive world map"
            tabIndex={0}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleMapClick}
            onWheel={handleWheel}
         >
             <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/2000px-Blue_Marble_2002.png" 
                alt="World Map" 
                className="w-full h-full object-cover pointer-events-none select-none sepia hue-rotate-[190deg] saturate-[1.5] brightness-60 contrast-125"
                draggable={false}
             />
             
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ 
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', 
                    backgroundSize: '10% 20%' 
                  }}>
             </div>

             {/* Pins Layer */}
             {clusters.map((cluster) => {
                 const coords = getMapCoordinates(cluster.lat, cluster.lng);
                 const isActive = activeClusterId === cluster.id;
                 
                 return (
                     <div 
                        key={cluster.id}
                        className={`absolute origin-center transition-z duration-0 ${isActive ? 'z-[100]' : 'z-10'}`}
                        style={{ 
                            left: `${coords.x}%`, 
                            top: `${coords.y}%`,
                            transform: `translate(-50%, -50%) scale(${1/zoom})`
                        }}
                     >
                        <button
                            onClick={(e) => handlePinClick(e, cluster.id)}
                            className="relative transition-transform duration-200 focus:outline-none focus:scale-125"
                            style={{ 
                                transform: `${isActive ? 'scale(1.25)' : 'scale(1)'}`,
                            }}
                            aria-expanded={isActive}
                        >
                            <div className={`w-4 h-4 rounded-full animate-ping absolute inset-0 opacity-75 ${cluster.hasHighActivity ? 'bg-primary' : 'bg-accent'}`}></div>
                            <div className={`w-4 h-4 rounded-full relative z-10 shadow-[0_0_10px_rgba(255,255,255,0.8)] border-2 border-white flex items-center justify-center ${cluster.hasHighActivity ? 'bg-primary' : 'bg-accent'}`}>
                                {cluster.totalCount > 1 && (
                                    <span className="text-[8px] font-bold text-white">{cluster.totalCount}</span>
                                )}
                            </div>
                        </button>
                     </div>
                 );
             })}
         </div>

         {/* ACTIVE TOOLTIP LAYER */}
         {activeCluster && (
             <>
                <div 
                    className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] md:hidden"
                    onClick={() => setActiveClusterId(null)}
                >
                    <div 
                        className="w-auto min-w-[240px] max-w-[300px] max-h-[90%] bg-[#18181b] border border-white/20 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                        style={{ touchAction: 'auto' }}
                    >
                        {renderTooltipContent(activeCluster, true)}
                    </div>
                </div>

                {(() => {
                    const screenPos = getScreenCoordinates(activeCluster.lat, activeCluster.lng);
                    const isRightSide = screenPos.x > (containerSize.width / 2);
                    const isBottomSide = screenPos.y > (containerSize.height / 2);
                    
                    let posStyle: React.CSSProperties = {};
                    let availableHeight = 0;

                    if (isRightSide) {
                        posStyle.right = containerSize.width - screenPos.x + 15;
                    } else {
                        posStyle.left = screenPos.x + 15;
                    }

                    if (isBottomSide) {
                        posStyle.bottom = containerSize.height - screenPos.y;
                        availableHeight = screenPos.y - 20;
                    } else {
                        posStyle.top = screenPos.y;
                        availableHeight = containerSize.height - screenPos.y - 20;
                    }

                    const maxTooltipHeight = Math.max(150, Math.min(containerSize.height * 0.6, availableHeight));

                    return (
                        <div 
                            className={`hidden md:flex absolute w-56 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex-col animate-in fade-in zoom-in-95 duration-200 z-[200]`}
                            style={{ 
                                ...posStyle,
                                maxHeight: `${maxTooltipHeight}px`,
                                touchAction: 'auto'
                            }}
                            onClick={(e) => e.stopPropagation()} 
                            role="dialog"
                        >
                             {renderTooltipContent(activeCluster, false)}
                        </div>
                    );
                })()}
             </>
         )}

         {/* HUD Overlay */}
         <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-2">
             <div className="px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] font-mono text-primary flex items-center gap-2">
                 <MousePointer2 size={10} /> {zoom.toFixed(1)}x ZOOM
             </div>
             {loading && (
                 <div className="px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] font-mono text-yellow-400 flex items-center gap-2 animate-pulse">
                    <Loader2 size={10} className="animate-spin" /> LOADING...
                 </div>
             )}
         </div>
      </div>

      {/* DETAILED LIST BELOW MAP */}
      <div className="w-full">
         <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-primary" size={20} />
                Recent Sightings 
                <span className="text-sm font-normal text-gray-400 ml-1">({allSightingsFromApi.length})</span>
            </h2>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {allSightingsFromApi.length > 0 ? (
                 allSightingsFromApi.map((sighting, idx) => (
                    <div 
                      key={`${sighting.id}-${idx}`}
                      className="group bg-surface/40 border border-white/5 rounded-2xl p-5 hover:bg-surface/60 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div 
                          className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 cursor-pointer"
                          onClick={() => onSelectCeleb(sighting.celebrity.id)}
                        >
                          <img 
                            src={sighting.celebrity.imageUrl} 
                            alt={sighting.celebrity.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 brightness-[1.05] contrast-[1.02]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-bold text-white truncate hover:text-primary cursor-pointer transition-colors"
                            onClick={() => onSelectCeleb(sighting.celebrity.id)}
                          >
                            {sighting.celebrity.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                            <span className="text-primary font-bold">{sighting.celebrity.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Activity size={10} /> Buzz: {sighting.celebrity.noiseRating}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                          <MapPin className="text-accent mt-0.5 flex-shrink-0" size={16} />
                          <div>
                            <div className="text-xs font-bold text-white">{sighting.location}</div>
                            <div className="text-[10px] text-gray-500">{sighting.country}</div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed italic">
                          "{sighting.snippet}"
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <span className="font-mono">{new Date(sighting.date).toLocaleDateString()}</span>
                          </div>
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sighting.confidence > 0.8 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {Math.round(sighting.confidence * 100)}% MATCH
                          </div>
                        </div>
                      </div>
                    </div>
                 ))
             ) : (
                 <div className="col-span-full py-12 text-center text-gray-500 bg-surface/30 rounded-xl border border-white/5 border-dashed">
                     No sightings found.
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}
