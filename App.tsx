import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { VOYAGE_DATA } from './constants';
import { Voyage, Waypoint, ShipPosition, IconTheme } from './types';

// --- MING DYNASTY ROYAL PALETTE ---
const PALETTE = {
    INK_BLACK: '#0F1014',  // 玄色 - Background Body
    RED_GOLD: '#D4AF37',   // 赤金 - Borders & Highlights
    INDIGO: '#183346',     // 靛青 - Trade/Navigation Base
    CINNABAR: '#681815',   // 朱砂 - Diplomacy/War Base
    IVORY: '#E8E8E8',      // 象牙白 - Text
    GHOST: 'rgba(255, 255, 255, 0.1)', 
};

// --- HELPER: Color Manipulation ---
const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// --- CSS TEXTURE GENERATORS ---
const getThemeStyle = (type: IconTheme): React.CSSProperties => {
    const isBlueTheme = ['TRADE', 'FLEET', 'MAP'].includes(type);
    const baseColor = isBlueTheme ? PALETTE.INDIGO : PALETTE.CINNABAR;
    
    return {
        backgroundColor: baseColor,
        backgroundImage: `
            repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 6px),
            linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))
        `,
        borderBottom: `2px solid ${PALETTE.RED_GOLD}`
    };
};

// --- Icons ---
const PlayIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>);
const PauseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);
const ResetIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>);

// --- 3D Ship Model ---
const createShipObject = (color: string) => {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 }); 
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xB71C1C, side: THREE.DoubleSide }); 

  // Hull
  const hullGeo = new THREE.BoxGeometry(1.5, 0.4, 4); 
  const pos = hullGeo.attributes.position;
  for(let i=0; i<pos.count; i++){
      if(pos.getZ(i) > 1.0) pos.setX(i, pos.getX(i) * 0.5);
      if(pos.getZ(i) < -1.5 && pos.getY(i) > 0) pos.setY(i, pos.getY(i) + 0.3);
  }
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, woodMat);
  group.add(hull);

  // Masts & Sails
  const mast1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), woodMat);
  mast1.position.set(0, 2, 0);
  group.add(mast1);
  
  const sail1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.5), sailMat);
  sail1.position.set(0, 2.2, 0);
  sail1.rotation.y = 0.3; 
  group.add(sail1);

  group.scale.set(1.8, 1.8, 1.8); 
  return group;
};

// --- Geodesic Math ---
function getGreatCirclePoint(lat1: number, lng1: number, lat2: number, lng2: number, t: number) {
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    const phi1 = (90 - lat1) * toRad; const theta1 = (lng1 + 180) * toRad;
    const phi2 = (90 - lat2) * toRad; const theta2 = (lng2 + 180) * toRad;
    const x1 = Math.sin(phi1) * Math.cos(theta1); const y1 = Math.cos(phi1); const z1 = Math.sin(phi1) * Math.sin(theta1);
    const x2 = Math.sin(phi2) * Math.cos(theta2); const y2 = Math.cos(phi2); const z2 = Math.sin(phi2) * Math.sin(theta2);
    const q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(x1, y1, z1));
    const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(x2, y2, z2));
    const qRes = new THREE.Quaternion().copy(q1).slerp(q2, t);
    const vRes = new THREE.Vector3(0,1,0).applyQuaternion(qRes);
    const phi = Math.acos(vRes.y); const theta = Math.atan2(vRes.z, vRes.x);
    return { lat: 90 - (phi * toDeg), lng: (theta * toDeg) - 180 };
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getBearing(startLat: number, startLng: number, endLat: number, endLng: number) {
  const y = Math.sin((endLng - startLng) * Math.PI / 180) * Math.cos(endLat * Math.PI / 180);
  const x = Math.cos(startLat * Math.PI / 180) * Math.sin(endLat * Math.PI / 180) - Math.sin(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) * Math.cos((endLng - startLng) * Math.PI / 180);
  return Math.atan2(y, x) * 180 / Math.PI;
}

// --- Types ---
interface LocationVisit {
    voyageId: number;
    voyageTitle: string;
    years: string;
    label: string;
    diplomacy: string;
    trade?: string;
    iconType: IconTheme;
}

interface AggregatedLocation {
    name: string;
    lat: number;
    lng: number;
    baseImage?: string;
    visits: LocationVisit[];
    isActiveInCurrentVoyage: boolean;
}

// New type for visual path segments
interface VisualPathSegment {
    voyageId: number;
    voyageTitle: string;
    baseColor: string;
    type: 'OUTBOUND' | 'INBOUND';
    path: any[];
}

type PlayMode = 'SINGLE' | 'ALL';

export default function App() {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [voyageId, setVoyageId] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>('ALL'); 
  const [isOverview, setIsOverview] = useState(true); // "Not Started" / Global View State
  const [shipPos, setShipPos] = useState<ShipPosition>({ lat: 32, lng: 118, altitude: 0.005, heading: 0 });
  
  const [selectedLocation, setSelectedLocation] = useState<AggregatedLocation | null>(null);
  const activeVisitRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);
  const frameRef = useRef<number>();
  
  const currentVoyage = VOYAGE_DATA[voyageId];

  // --- 1. DATA PROCESSING: DUAL LANE ROUND TRIP LOGIC ---
  const { shipSegments, totalDist, visualPathSegments } = useMemo(() => {
    // A. Generate Visual Paths (For Globe Lines)
    const segments: VisualPathSegment[] = [];
    
    Object.values(VOYAGE_DATA).forEach(v => {
        // Outbound Segment
        segments.push({
            voyageId: v.id,
            voyageTitle: v.title,
            baseColor: v.color,
            type: 'OUTBOUND',
            path: v.path.map(p => [p.lat, p.lng, 0.002])
        });
        
        // Inbound Segment (Reverse path)
        segments.push({
            voyageId: v.id,
            voyageTitle: v.title,
            baseColor: v.color,
            type: 'INBOUND',
            path: [...v.path].reverse().map(p => [p.lat, p.lng, 0.002])
        });
    });

    // B. Generate Ship Animation Segments (Specific to Current Voyage)
    // We recreate the full loop nodes for the ship to follow
    const currentV = VOYAGE_DATA[voyageId];
    const fullPathNodes = [...currentV.path, ...[...currentV.path].reverse().slice(1)];
    
    const sSegments = [];
    let sTotalDist = 0;
    for (let i = 0; i < fullPathNodes.length - 1; i++) {
        const dist = getDistanceFromLatLonInKm(fullPathNodes[i].lat, fullPathNodes[i].lng, fullPathNodes[i+1].lat, fullPathNodes[i+1].lng);
        sSegments.push({ start: fullPathNodes[i], end: fullPathNodes[i+1], dist, accumDist: sTotalDist });
        sTotalDist += dist;
    }

    return { 
        visualPathSegments: segments, 
        shipSegments: sSegments, 
        totalDist: sTotalDist 
    };
  }, [voyageId]);

  // --- 2. AGGREGATION LOGIC ---
  const aggregatedLocations = useMemo(() => {
    const locMap = new Map<string, AggregatedLocation>();
    Object.values(VOYAGE_DATA).forEach(voyage => {
        voyage.path.forEach(point => {
            if (point.type === 'TURN') return;
            if (!locMap.has(point.name)) {
                locMap.set(point.name, {
                    name: point.name,
                    lat: point.lat,
                    lng: point.lng,
                    baseImage: point.imageUrl,
                    visits: [],
                    isActiveInCurrentVoyage: false
                });
            }
            const loc = locMap.get(point.name)!;
            loc.visits.push({
                voyageId: voyage.id,
                voyageTitle: voyage.title,
                years: voyage.years,
                label: point.eventLabel || "Fleet Arrival",
                diplomacy: point.diplomacy || "Diplomatic Visit",
                trade: point.trade,
                iconType: point.iconType
            });
            if (point.imageUrl && !loc.baseImage) loc.baseImage = point.imageUrl;
        });
    });
    return Array.from(locMap.values()).map(loc => ({
        ...loc,
        visits: loc.visits.sort((a, b) => b.voyageId - a.voyageId),
        isActiveInCurrentVoyage: loc.visits.some(v => v.voyageId === voyageId)
    }));
  }, [voyageId]);

  // --- 3. ANIMATION LOOP ---
  const animate = useCallback(() => {
    if (!isPlaying) return;

    progressRef.current += 0.0008; 
    
    if (progressRef.current >= 1) {
      if (playMode === 'ALL' && voyageId < 7) {
          setVoyageId(prev => prev + 1);
          progressRef.current = 0;
      } else {
          progressRef.current = playMode === 'SINGLE' ? 0 : 1;
          if (playMode === 'SINGLE') {
             // Loop
          } else {
             setIsPlaying(false);
          }
      }
    }

    const currentDist = progressRef.current * totalDist;
    const segment = shipSegments.find(s => currentDist >= s.accumDist && currentDist <= s.accumDist + s.dist) || shipSegments[shipSegments.length - 1];
    
    if (segment) {
        const segmentProgress = (currentDist - segment.accumDist) / segment.dist;
        const { lat, lng } = getGreatCirclePoint(segment.start.lat, segment.start.lng, segment.end.lat, segment.end.lng, segmentProgress);
        const nextStep = getGreatCirclePoint(segment.start.lat, segment.start.lng, segment.end.lat, segment.end.lng, segmentProgress + 0.01);
        const heading = getBearing(lat, lng, nextStep.lat, nextStep.lng);
        setShipPos({ lat, lng, altitude: 0.005, heading });
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, shipSegments, totalDist, playMode, voyageId]);

  useEffect(() => {
    if (isPlaying) frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [isPlaying, animate]);

  // --- 4. VIEW & CONTROL ---
  useEffect(() => {
    if (globeEl.current) {
        globeEl.current.pointOfView({ lat: 15, lng: 85, altitude: 1.8 }, 1000);
    }
  }, []);

  useEffect(() => {
    if (selectedLocation && activeVisitRef.current) {
        activeVisitRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedLocation]);

  const handleVoyageChange = (id: number) => {
    setIsOverview(false); // Exit overview mode once interaction starts
    setVoyageId(id);
    setIsPlaying(false);
    progressRef.current = 0;
    setSelectedLocation(null);
    const start = VOYAGE_DATA[id].path[0];
    setShipPos({ lat: start.lat, lng: start.lng, altitude: 0.005, heading: 0 });
  };
  
  const handlePlayToggle = () => {
    if (isOverview) setIsOverview(false);
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
      setIsOverview(true);
      setIsPlaying(false);
      setVoyageId(1);
      setSelectedLocation(null);
      progressRef.current = 0;
      if (globeEl.current) {
          globeEl.current.pointOfView({ lat: 15, lng: 85, altitude: 1.8 }, 1000);
      }
  };

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden font-sans">
      
      {/* Background Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] z-0"></div>

      {/* --- RESET BUTTON (Top Right) --- */}
      {!isOverview && (
          <div className="absolute top-8 right-8 z-50 animate-[fadeIn_0.5s_ease]">
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-full border bg-black/50 backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105"
                style={{ borderColor: PALETTE.RED_GOLD, color: PALETTE.RED_GOLD }}
              >
                  <ResetIcon />
                  <span className="text-xs font-serif-sc tracking-widest">返回全览</span>
              </button>
          </div>
      )}

      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)" 
        atmosphereColor="#0ea5e9"
        atmosphereAltitude={0.15}
        
        // --- VISUALIZATION: LAYERED ROUTES ---
        pathsData={visualPathSegments}
        pathPoints={d => (d as VisualPathSegment).path}
        pathPointLat={p => p[0]}
        pathPointLng={p => p[1]}
        pathPointAlt={p => p[2]}
        
        // HOVER TOOLTIP
        pathLabel={(d: any) => {
            const seg = d as VisualPathSegment;
            const direction = seg.type === 'OUTBOUND' ? '去程' : '返程';
            return `<div style="padding: 4px 8px; background: rgba(0,0,0,0.8); border: 1px solid #D4AF37; color: #fff; border-radius: 4px; font-family: sans-serif;">
                <strong style="color: #D4AF37;">第${['一','二','三','四','五','六','七'][seg.voyageId-1]}次下西洋</strong>
                <br/>
                <span style="font-size: 0.9em; opacity: 0.8;">${direction} (${seg.voyageTitle})</span>
            </div>`;
        }}

        // COLOR LOGIC
        pathColor={(d: any) => {
            const seg = d as VisualPathSegment;
            if (isOverview) return hexToRgba(seg.baseColor, 0.6); // All visible in overview
            
            const isActive = seg.voyageId === voyageId;
            if (isActive) {
                return seg.type === 'OUTBOUND' ? PALETTE.RED_GOLD : hexToRgba(PALETTE.RED_GOLD, 0.6);
            }
            return hexToRgba(seg.baseColor, 0.3);
        }} 
        
        // STROKE WIDTH
        pathStroke={(d: any) => {
            const seg = d as VisualPathSegment;
            if (isOverview) return 1.5;
            return seg.voyageId === voyageId ? (seg.type === 'OUTBOUND' ? 3 : 2) : 1;
        }}
        
        // DASH LOGIC: Outbound = Solid, Inbound = Dashed
        pathDashLength={(d: any) => {
            const seg = d as VisualPathSegment;
            if (seg.type === 'INBOUND') return 0.2; // Dashed for return
            return 1; // Solid for outbound
        }} 
        pathDashGap={(d: any) => {
            const seg = d as VisualPathSegment;
            if (seg.type === 'INBOUND') return 0.1;
            return 0;
        }}
        
        // FLOW ANIMATION - MUCH FASTER NOW (10x)
        pathDashAnimateTime={(d: any) => {
            const seg = d as VisualPathSegment;
            // Overview: Fast global flow (6s)
            if (isOverview) return 6000;
            // Active: Very fast energetic flow (3s)
            if (seg.voyageId === voyageId) return 3000;
            // Inactive: FREEZE (0) to focus attention
            return 0;
        }}

        pathTransitionDuration={500}

        // --- NODES ---
        htmlElementsData={aggregatedLocations}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.005}
        htmlElement={(d: any) => {
            const loc = d as AggregatedLocation;
            const isActive = loc.isActiveInCurrentVoyage;
            const isSelected = selectedLocation?.name === loc.name;
            
            // Refined Opacity/Scale Logic
            let opacity = 0.6;
            let scale = 0.6;
            
            if (isSelected) {
                opacity = 1;
                scale = 1.0;
            } else if (!isOverview && isActive) {
                opacity = 1;
                scale = 0.8; 
            } else if (isOverview) {
                opacity = 0.5; // More transparent in overview
                scale = 0.5;   // Smaller in overview
            } else {
                opacity = 0.2; // Very faint if inactive
                scale = 0.3;
            }

            const borderColor = isActive || isOverview ? PALETTE.RED_GOLD : '#333';
            const shadowColor = isActive || isOverview ? PALETTE.RED_GOLD : 'transparent';
            const dotColor = isActive || isOverview ? PALETTE.RED_GOLD : '#555';
            
            const el = document.createElement('div');
            el.style.pointerEvents = 'auto'; // Ensure it catches events
            el.style.cursor = 'pointer';

            // We create a larger invisible wrapper for hit testing
            el.innerHTML = `
                <div style="padding: 12px; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="
                        transform: scale(${scale}); 
                        opacity: ${opacity}; 
                        transition: all 0.4s ease; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center;
                    ">
                        <div style="
                            background: rgba(15, 16, 20, 0.6); 
                            border: 1px solid ${borderColor};
                            color: ${isActive || isOverview ? PALETTE.RED_GOLD : '#888'};
                            padding: 2px 5px;
                            border-radius: 2px;
                            font-family: 'Noto Serif SC', serif;
                            font-size: 9px;
                            white-space: nowrap;
                            box-shadow: 0 0 10px ${shadowColor}40;
                            margin-bottom: 3px;
                            backdrop-filter: blur(2px);
                        ">
                            ${loc.name}
                        </div>
                        <div style="
                            width: 6px; 
                            height: 6px; 
                            background: ${dotColor}; 
                            transform: rotate(45deg);
                            box-shadow: 0 0 5px ${shadowColor};
                        "></div>
                    </div>
                </div>
            `;
            el.onclick = (e) => { e.stopPropagation(); setSelectedLocation(loc); };
            return el;
        }}
        
        customLayerData={!isOverview ? [shipPos] : []} // Hide ship in overview mode
        customThreeObject={() => createShipObject(currentVoyage.color)}
        customThreeObjectUpdate={(obj, d: any) => {
          Object.assign(obj.position, globeEl.current?.getCoords(d.lat, d.lng, d.altitude));
          const up = new THREE.Vector3().copy(obj.position).normalize();
          obj.lookAt(new THREE.Vector3(0,0,0)); 
          obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up); 
          obj.rotateY(-(d.heading * Math.PI) / 180); 
        }}
      />

      {/* --- POPUP (Historical Archive) --- */}
      {selectedLocation && (
          <div className="absolute top-1/2 right-10 -translate-y-1/2 z-50">
              <div 
                  className="relative w-96 flex flex-col animate-[fadeIn_0.3s_ease-out]"
                  style={{
                      borderRadius: '4px',
                      border: `1px solid ${PALETTE.RED_GOLD}`,
                      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.95), 0 0 15px rgba(212, 175, 55, 0.1)',
                      maxHeight: '80vh'
                  }}
              >
                  <button 
                    onClick={() => setSelectedLocation(null)}
                    className="absolute top-3 right-3 rounded-full p-1 z-40 backdrop-blur-sm hover:bg-white/10"
                    style={{ color: PALETTE.RED_GOLD, border: `1px solid ${PALETTE.RED_GOLD}` }}
                  >
                    <CloseIcon />
                  </button>
                  <div className="h-40 w-full relative shrink-0" style={getThemeStyle(selectedLocation.visits[0]?.iconType || 'TRADE')}>
                      {selectedLocation.baseImage && (
                          <div className="absolute inset-0 w-full h-full">
                             <img src={selectedLocation.baseImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50" onError={(e) => e.currentTarget.style.display = 'none'} />
                             <img src={selectedLocation.baseImage} alt={selectedLocation.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80 sepia-[.4] contrast-125" onError={(e) => e.currentTarget.parentElement!.style.display = 'none'} />
                             <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${PALETTE.INK_BLACK} 100%)` }}></div>
                          </div>
                      )}
                      <div className="absolute bottom-4 left-6 z-10">
                        <h3 className="text-3xl font-serif-sc drop-shadow-md tracking-wide" style={{ color: PALETTE.RED_GOLD }}>{selectedLocation.name}</h3>
                        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: PALETTE.IVORY, opacity: 0.8 }}>Historical Archive</p>
                      </div>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar" style={{ backgroundColor: PALETTE.INK_BLACK }}>
                      <div className="p-4 space-y-4">
                        {selectedLocation.visits.map((visit, index) => {
                            const isCurrent = visit.voyageId === voyageId;
                            return (
                                <div key={index} ref={isCurrent ? activeVisitRef : null} className={`relative pl-4 py-2 border-l-2 ${isCurrent ? 'bg-[rgba(212,175,55,0.08)]' : ''}`} style={{ borderColor: isCurrent ? PALETTE.RED_GOLD : '#333' }}>
                                    <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full" style={{ backgroundColor: isCurrent ? PALETTE.RED_GOLD : '#555' }}></div>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-xs font-mono" style={{ color: isCurrent ? PALETTE.RED_GOLD : '#777' }}>{visit.years.split('-')[0]} • 第{['一','二','三','四','五','六','七'][visit.voyageId-1]}次</span>
                                        {isCurrent && <span className="text-[10px] px-1 border border-[#D4AF37] text-[#D4AF37] rounded">CURRENT</span>}
                                    </div>
                                    <h4 className="text-sm font-bold mb-1 font-serif-sc" style={{ color: isCurrent ? PALETTE.IVORY : '#999' }}>{visit.label}</h4>
                                    <p className="text-xs leading-5 italic mb-2" style={{ color: isCurrent ? '#ccc' : '#666' }}>"{visit.diplomacy}"</p>
                                    {visit.trade && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {visit.trade.split('、').map(t => (
                                                <span key={t} className="text-[10px] px-2 py-0.5 rounded border" style={{ borderColor: isCurrent ? 'rgba(212,175,55,0.3)' : 'transparent', color: isCurrent ? '#d1d5db' : '#555', backgroundColor: 'rgba(255,255,255,0.02)' }}>{t}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- TITLE --- */}
      <div className="absolute top-0 left-0 w-full p-8 z-30 pointer-events-none flex justify-center">
          <div className="px-10 py-3 pointer-events-auto shadow-2xl backdrop-blur-md" style={{ backgroundColor: 'rgba(15, 16, 20, 0.85)', borderBottom: `1px solid ${PALETTE.RED_GOLD}` }}>
              <h1 className="text-4xl md:text-5xl font-serif-sc tracking-[0.2em] text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ color: PALETTE.RED_GOLD }}>郑和七下西洋</h1>
              <p className="text-[10px] text-center uppercase tracking-[0.4em] mt-2" style={{ color: '#a8a29e' }}>The Seven Great Voyages (1405-1433)</p>
          </div>
      </div>

      {/* --- BOTTOM CONTROLS & TIMELINE --- */}
      <div className="absolute bottom-0 left-0 w-full z-40 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-6 px-4">
          <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex items-center gap-4">
                       <button 
                        onClick={handlePlayToggle}
                        className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        style={{ backgroundColor: PALETTE.RED_GOLD, color: PALETTE.INK_BLACK, border: `2px solid rgba(255,255,255,0.2)` }}
                       >
                         {isPlaying ? <PauseIcon /> : <PlayIcon />}
                       </button>
                       
                       {/* Play Mode Toggle */}
                       <div className="flex bg-[#1c1917] rounded-lg border border-[#333] p-1 font-serif-sc">
                           <button 
                             onClick={() => setPlayMode('ALL')}
                             className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${playMode === 'ALL' ? 'bg-[#333] text-[#fcd34d]' : 'text-[#777] hover:text-[#ccc]'}`}
                             title="按时间顺序播放所有七次航行"
                           >
                               <span>全程连播</span>
                           </button>
                           <button 
                             onClick={() => setPlayMode('SINGLE')}
                             className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${playMode === 'SINGLE' ? 'bg-[#333] text-[#fcd34d]' : 'text-[#777] hover:text-[#ccc]'}`}
                             title="循环播放当前选中的航行"
                           >
                               <span>单次循环</span>
                           </button>
                       </div>

                       <div className="pl-4 border-l border-[#333]">
                           <div className="font-bold text-xl font-serif-sc" style={{ color: PALETTE.RED_GOLD }}>
                               {isOverview ? "全览模式" : currentVoyage.title}
                           </div>
                           <div className="text-sm" style={{ color: '#a8a29e' }}>
                               {isOverview ? "Global Overview" : currentVoyage.years}
                           </div>
                       </div>
                  </div>
                  <div className="hidden md:block text-sm max-w-md text-right font-serif-sc italic leading-relaxed" style={{ color: '#78716c' }}>
                      {isOverview ? "点击播放开始探索历史旅程。" : currentVoyage.description}
                  </div>
              </div>

              <div className="relative h-1 bg-[#292524] rounded-full mt-2 mx-8">
                  <div className="absolute top-0 left-0 h-full transition-all duration-300 shadow-[0_0_10px_#fcd34d]" style={{ width: isOverview ? '0%' : `${((voyageId - 1) / 6) * 100}%`, backgroundColor: PALETTE.RED_GOLD }}></div>
                  <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex justify-between">
                      {Object.values(VOYAGE_DATA).map((v) => {
                          const isActive = !isOverview && v.id === voyageId;
                          const isPast = !isOverview && v.id < voyageId;
                          return (
                              <button key={v.id} onClick={() => handleVoyageChange(v.id)} className="group relative focus:outline-none">
                                  <div className="w-6 h-6 rounded-full border-2 transition-all duration-300 z-10 relative" style={{ backgroundColor: isActive || isPast ? PALETTE.RED_GOLD : PALETTE.INK_BLACK, borderColor: isActive || isPast ? PALETTE.RED_GOLD : '#57534e', transform: isActive ? 'scale(1.25)' : 'scale(1)', boxShadow: isActive ? `0 0 15px ${PALETTE.RED_GOLD}` : 'none' }}></div>
                                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-mono transition-colors duration-300" style={{ color: isActive ? PALETTE.RED_GOLD : '#57534e' }}>{v.years.split(' ')[0]}</span>
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}