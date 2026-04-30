import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { ZoomIn, ZoomOut, Maximize, MapPin, Tag, Image as ImageIcon, ExternalLink, Phone, Mail, Filter, X, ChevronDown } from 'lucide-react';
import MobileSphereView from './MobileSphereView';

const CANVAS_SIZE = 1000;
const API_URL = '/api/ads';

const RUBROS = [
  'Celulares y Teléfonos', 'Computación', 'Electrodomésticos', 'Hogar, Muebles y Jardín',
  'Moda', 'Ferreteria', 'Deportes y Fitness', 'Juguetes y Bebés', 'Joyas y Relojes',
  'Instrumentos Musicales', 'Libros, Revistas y Comics', 'lavanderia', 'Repuestos de autos',
  'Gimnasio', 'Mascotas', 'supermercado', 'Productos de limpieza', 'Cafeteria',
  'Artículos de cocina', 'Calzado', 'Perfumeria', 'Reparaciones de celular',
  'Mudanzas y fletes', 'Instalación de electrodomésticos', 'peluqueria, Barberia',
  'Restaurante', 'Heladeria', 'Pintureria'
];

const BARRIOS = [
  'Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo', 'Caballito', 'Chacarita',
  'Coghlan', 'Colegiales', 'Constitución', 'Flores', 'Floresta', 'La Boca', 'La Paternal',
  'Liniers', 'Mataderos', 'Monte Castro', 'Monserrat', 'Nueva Pompeya', 'Núñez', 'Palermo',
  'Parque Avellaneda', 'Parque Chacabuco', 'Parque Chas', 'Parque Patricios', 'Puerto Madero',
  'Recoleta', 'Retiro', 'Saavedra', 'San Cristóbal', 'San Nicolás', 'San Telmo', 'Vélez Sársfield',
  'Versalles', 'Villa Crespo', 'Villa del Parque', 'Villa Devoto', 'Villa General Mitre',
  'Villa Lugano', 'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón', 'Villa Real', 'Villa Riachuelo',
  'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza'
];

const PublicView = () => {
  const canvasRef = useRef(null);
  const [ads, setAds] = useState([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [hoveredAd, setHoveredAd] = useState(null);
  const [imageObjects, setImageObjects] = useState({});
  const [loadedImageIds, setLoadedImageIds] = useState(new Set());
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const [featuredAd, setFeaturedAd] = useState(null);
  const [showIsland, setShowIsland] = useState(true);
  const [targetAd, setTargetAd] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBarrio, setSelectedBarrio] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [barrioFilterOpen, setBarrioFilterOpen] = useState(false);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (ads.length > 0 && !featuredAd) {
      const activeAds = ads.filter(a => a.expiration_date ? new Date(a.expiration_date) > new Date() : true);
      const listToPick = activeAds.length > 0 ? activeAds : ads;
      const randomAd = listToPick[Math.floor(Math.random() * listToPick.length)];
      
      axios.post(`${API_URL}/batch`, { ids: [randomAd.id] }).then(res => {
        if (res.data.length > 0) {
          setFeaturedAd({ ...randomAd, image: res.data[0].image });
        }
      });
    }
  }, [ads, featuredAd]);

  useEffect(() => {
    fetchMetadata();
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes marqueeRight {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .marquee-text {
        display: inline-block;
        padding-left: 100%;
        animation: marqueeRight 15s linear infinite;
        white-space: nowrap;
        font-weight: 900;
        text-transform: uppercase;
        color: #818cf8;
        font-size: 14px;
        letter-spacing: 1px;
      }
      @keyframes rotateCyber {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .cyber-btn {
        position: relative;
        overflow: hidden;
        background: rgba(15, 23, 42, 0.8);
        color: #c9c9c9;
        border: 1px solid rgba(201, 201, 201, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s ease;
        z-index: 1;
      }
      .cyber-btn.active::before {
        content: '';
        position: absolute;
        top: -150%;
        left: -50%;
        width: 200%;
        height: 400%;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          #ff00ff 90deg,
          #00ffff 180deg,
          #00ff00 270deg,
          transparent 360deg
        );
        animation: rotateCyber 3s linear infinite;
        z-index: -2;
      }
      .cyber-btn.active::after {
        content: '';
        position: absolute;
        inset: 2px;
        background: #0f172a;
        border-radius: inherit;
        z-index: -1;
      }
      .cyber-btn.active {
        color: #fff;
        border-color: transparent;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleResize = () => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const scale = winW / CANVAS_SIZE;
    setTransform({
      scale,
      x: (winW - CANVAS_SIZE * scale) / 2,
      y: (winH - CANVAS_SIZE * scale) / 2
    });
  };

  const fetchMetadata = async () => {
    try {
      const res = await axios.get(API_URL);
      setAds(res.data);
    } catch (err) {
      console.error('Error fetching metadata', err);
    }
  };

  const fetchVisibleImages = useCallback(async () => {
    if (ads.length === 0 || isFetchingBatch) return;

    // Calculate viewport bounds in world coordinates
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const minX = -transform.x / transform.scale;
    const minY = -transform.y / transform.scale;
    const maxX = (rect.width - transform.x) / transform.scale;
    const maxY = (rect.height - transform.y) / transform.scale;

    // Find ads in viewport that don't have images loaded
    const visibleUnloaded = ads.filter(ad => 
      ad.x + ad.width >= minX && ad.x <= maxX &&
      ad.y + ad.height >= minY && ad.y <= maxY &&
      !loadedImageIds.has(ad.id)
    ).slice(0, 50); // Fetch in small batches

    if (visibleUnloaded.length === 0) return;

    setIsFetchingBatch(true);
    try {
      const ids = visibleUnloaded.map(ad => ad.id);
      const res = await axios.post(`${API_URL}/batch`, { ids });
      
      const newImages = { ...imageObjects };
      const newLoadedIds = new Set(loadedImageIds);

      res.data.forEach(item => {
        if (item.image) {
          const img = new Image();
          img.src = item.image;
          img.onload = () => {
            setImageObjects(prev => ({ ...prev, [item.id]: img }));
          };
        }
        newLoadedIds.add(item.id);
      });

      setLoadedImageIds(newLoadedIds);
    } catch (err) {
      console.error('Error fetching images batch', err);
    } finally {
      setIsFetchingBatch(false);
    }
  }, [ads, transform, loadedImageIds, isFetchingBatch]);

  // Run lazy loader when transform or ads change
  useEffect(() => {
    const timer = setTimeout(fetchVisibleImages, 200);
    return () => clearTimeout(timer);
  }, [transform, ads, fetchVisibleImages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    
    // 1. Draw all background ads (the grid squares)
    ads.forEach(ad => {
      if (ad.id === hoveredAd?.id) return;
      
      const img = imageObjects[ad.id];
      const isFilteredOut = (selectedCategory && ad.category !== selectedCategory) || 
                           (selectedBarrio && ad.barrio !== selectedBarrio);

      if (img) {
        if (isFilteredOut) {
          ctx.filter = 'grayscale(100%) brightness(0.2)';
        } else {
          ctx.filter = 'none';
        }
        ctx.drawImage(img, ad.x, ad.y, ad.width, ad.height);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = isFilteredOut ? '#1e293b' : '#6366f1';
        ctx.fillRect(ad.x, ad.y, ad.width, ad.height);
      }
    });

      // 2. Draw hovered ad with zoom effect on top
    if (hoveredAd) {
      const cx = hoveredAd.x + hoveredAd.width / 2;
      const cy = hoveredAd.y + hoveredAd.height / 2;
      
      // Dynamic zoom: 5x multiplier.
      // 10x10 -> 50x50
      // 20x20 -> 100x100
      // 50x50 -> 250x250
      const targetSize = Math.max(50, hoveredAd.width * 5);
      
      const hx = cx - targetSize / 2;
      const hy = cy - targetSize / 2;

      ctx.save();
      const isFilteredOut = (selectedCategory && hoveredAd.category !== selectedCategory) || 
                           (selectedBarrio && hoveredAd.barrio !== selectedBarrio);

      if (!isFilteredOut) {
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 30 / transform.scale;
        ctx.filter = 'none';
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10 / transform.scale;
        ctx.filter = 'grayscale(100%) brightness(0.2)';
      }

      const img = imageObjects[hoveredAd.id];
      if (img) {
        ctx.drawImage(img, hx, hy, targetSize, targetSize);
      } else {
        ctx.fillStyle = isFilteredOut ? '#1e293b' : '#818cf8';
        ctx.fillRect(hx, hy, targetSize, targetSize);
      }
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / transform.scale;
      ctx.strokeRect(hx, hy, targetSize, targetSize);
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2 / transform.scale;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  }, [ads, transform, hoveredAd, imageObjects, selectedCategory]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      
      setTransform(prev => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const limitX = winW - CANVAS_SIZE * prev.scale;
        const limitY = winH - CANVAS_SIZE * prev.scale;

        return { 
          ...prev, 
          x: prev.scale * CANVAS_SIZE < winW ? (winW - CANVAS_SIZE * prev.scale) / 2 : Math.min(0, Math.max(newX, limitX)),
          y: prev.scale * CANVAS_SIZE < winH ? (winH - CANVAS_SIZE * prev.scale) / 2 : Math.min(0, Math.max(newY, limitY))
        };
      });
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.scale;
    
    const found = ads.find(ad => 
      mouseX >= ad.x && mouseX <= ad.x + ad.width &&
      mouseY >= ad.y && mouseY <= ad.y + ad.height
    );
    setHoveredAd(found || null);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    
    // Min scale ensures it at least fills the width or height
    const minScale = Math.max(winW / CANVAS_SIZE, winH / CANVAS_SIZE);
    const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, minScale), 10);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const canvasMouseX = (mouseX - transform.x) / transform.scale;
    const canvasMouseY = (mouseY - transform.y) / transform.scale;
    
    let nextX = mouseX - canvasMouseX * newScale;
    let nextY = mouseY - canvasMouseY * newScale;

    // Constrain pan on zoom
    const limitX = winW - CANVAS_SIZE * newScale;
    const limitY = winH - CANVAS_SIZE * newScale;

    setTransform({
      scale: newScale,
      x: newScale * CANVAS_SIZE < winW ? (winW - CANVAS_SIZE * newScale) / 2 : Math.min(0, Math.max(nextX, limitX)),
      y: newScale * CANVAS_SIZE < winH ? (winH - CANVAS_SIZE * newScale) / 2 : Math.min(0, Math.max(nextY, limitY))
    });
  };

  const handleClick = () => {
    if (hoveredAd) {
      window.open(hoveredAd.url.startsWith('http') ? hoveredAd.url : `https://${hoveredAd.url}`, '_blank');
    }
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none"
      onMouseDown={!isMobile ? handleMouseDown : undefined}
      onMouseMove={!isMobile ? handleMouseMove : undefined}
      onMouseUp={!isMobile ? handleMouseUp : undefined}
      onWheel={!isMobile ? handleWheel : undefined}
      onClick={!isMobile ? handleClick : undefined}
      style={{ cursor: isMobile ? 'default' : (isDragging ? 'grabbing' : (hoveredAd ? 'pointer' : 'grab')) }}
    >
      {isMobile ? (
        <MobileSphereView 
          ads={ads.filter(a => {
            if (selectedCategory && a.category !== selectedCategory) return false;
            if (selectedBarrio && a.barrio !== selectedBarrio) return false;
            return true;
          })} 
          imageObjects={imageObjects} 
          hoveredAd={hoveredAd} 
          setHoveredAd={setHoveredAd}
          targetAd={targetAd}
          setTargetAd={setTargetAd}
          spinTrigger={spinTrigger}
        />
      ) : (
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="absolute inset-0" />
      )}

      {/* Category Filter — Compact Dropdown (Only Desktop) */}
      {!isMobile && (
        <div className="absolute top-5 left-5 z-[60] pointer-events-auto flex flex-col gap-3">
          {/* Rubro Filter */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setFilterOpen(!filterOpen); setBarrioFilterOpen(false); }}
              className={`w-52 flex items-center justify-between px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 backdrop-blur-xl border shadow-lg ${
                selectedCategory
                  ? 'bg-indigo-600/90 text-white border-indigo-400/40 shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 shadow-black/20 hover:bg-slate-800/90 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Filter size={14} />
                <span className="truncate">{selectedCategory || 'Filtrar Rubro'}</span>
              </div>
              <ChevronDown size={14} className={`transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen && (
              <div
                className="absolute top-14 left-0 w-80 max-h-[60vh] overflow-y-auto no-scrollbar rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setSelectedCategory(null); setFilterOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    !selectedCategory
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-slate-900/60 text-slate-500 border border-transparent hover:bg-slate-800/80 hover:text-slate-300'
                  }`}
                >
                  <span>Mostrar Todos los Rubros</span>
                  {selectedCategory && <X size={12} />}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {RUBROS.map(r => {
                    const isActive = selectedCategory === r;
                    return (
                      <button
                        key={r}
                        onClick={() => { setSelectedCategory(isActive ? null : r); setFilterOpen(false); }}
                        className={`px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-all text-left ${
                          isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800/70'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Barrio Filter */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setBarrioFilterOpen(!barrioFilterOpen); setFilterOpen(false); }}
              className={`w-52 flex items-center justify-between px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 backdrop-blur-xl border shadow-lg ${
                selectedBarrio
                  ? 'bg-emerald-600/90 text-white border-emerald-400/40 shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 shadow-black/20 hover:bg-slate-800/90 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin size={14} />
                <span className="truncate">{selectedBarrio || 'Filtrar Barrio'}</span>
              </div>
              <ChevronDown size={14} className={`transition-transform duration-300 ${barrioFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {barrioFilterOpen && (
              <div
                className="absolute top-14 left-0 w-80 max-h-[60vh] overflow-y-auto no-scrollbar rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setSelectedBarrio(null); setBarrioFilterOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    !selectedBarrio
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900/60 text-slate-500 border border-transparent hover:bg-slate-800/80 hover:text-slate-300'
                  }`}
                >
                  <span>Cualquier Barrio</span>
                  {selectedBarrio && <X size={12} />}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {BARRIOS.map(b => {
                    const isActive = selectedBarrio === b;
                    return (
                      <button
                        key={b}
                        onClick={() => { setSelectedBarrio(isActive ? null : b); setBarrioFilterOpen(false); }}
                        className={`px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-all text-left ${
                          isActive ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800/70'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Featured Ad — Bottom Center (Only Desktop) */}
      {!isMobile && showIsland && featuredAd && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[280px] glass-card border border-indigo-500/30 shadow-[0_-10px_50px_-12px_rgba(79,70,229,0.3)] rounded-[24px] overflow-hidden flex flex-col pointer-events-auto transition-all duration-500 z-50" style={{ animation: 'slideUp 0.5s ease' }}>
          <button onClick={() => setShowIsland(false)} className="absolute top-2.5 right-2.5 p-1.5 bg-black/50 hover:bg-black/90 rounded-full text-white transition-colors z-10 backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          
          <div className="h-[70px] bg-indigo-950 relative">
            {featuredAd.image ? <img src={featuredAd.image} className="w-full h-full object-cover opacity-90" alt="" /> : <div className="w-full h-full bg-indigo-600/20" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            <div className="absolute top-2 left-3 px-2 py-0.5 bg-indigo-600/80 rounded-full text-[6px] font-black uppercase text-white tracking-widest backdrop-blur-sm">Destacado</div>
            {featuredAd.category && (
              <div className="absolute top-2 right-10 px-2 py-0.5 bg-emerald-600/80 rounded-full text-[6px] font-black uppercase text-white tracking-widest backdrop-blur-sm flex items-center gap-1">
                <Tag size={6} /> {featuredAd.category}
              </div>
            )}
          </div>
          
          <div className="bg-slate-950 p-3 cursor-pointer hover:bg-slate-900 transition-colors relative" onClick={() => window.open(featuredAd.url.startsWith('http') ? featuredAd.url : `https://${featuredAd.url}`, '_blank')}>
            <span className="text-[12px] text-white font-black uppercase leading-tight truncate block drop-shadow-md">{featuredAd.name || 'Anunciante'}</span>
            <span className="text-[9px] text-indigo-400 truncate block font-bold mt-0.5">{featuredAd.url}</span>
            
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {featuredAd.phone && (
                <span className="text-[8px] text-slate-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {featuredAd.phone}
                </span>
              )}
              {featuredAd.location && (
                <span className="text-[8px] text-indigo-300 flex items-center gap-1">
                  <MapPin size={8} /> {featuredAd.location}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BARRIOS FLOTANTE */}
      {isMobile && barrioFilterOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
          backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            width: '90%', maxHeight: '75vh', backgroundColor: '#0f172a',
            borderRadius: '16px', border: '1px solid #334155', padding: '20px',
            overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out forwards'
          }}>
            <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <MapPin size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
              Seleccionar Barrio
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                onClick={() => {
                  setSelectedBarrio(null);
                  setSpinTrigger(prev => prev + 1);
                  setBarrioFilterOpen(false);
                }} 
                className={`cyber-btn ${!selectedBarrio ? 'active' : ''}`} 
                style={{ padding: '12px', fontSize: '10px', fontWeight: '900', borderRadius: '8px' }}
              >
                TODOS (CIUDAD ENTERA)
              </button>
              {BARRIOS.map(b => (
                <button 
                  key={b} 
                  onClick={() => {
                    setSelectedBarrio(b);
                    setSpinTrigger(prev => prev + 1);
                    setBarrioFilterOpen(false);
                  }} 
                  className={`cyber-btn ${selectedBarrio === b ? 'active' : ''}`} 
                  style={{ padding: '12px', fontSize: '10px', fontWeight: '900', borderRadius: '8px' }}
                >
                  {b.toUpperCase()}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setBarrioFilterOpen(false)} 
              style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontWeight: '900', textTransform: 'uppercase', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Side Details Panel (Only Desktop) */}
      {!isMobile && (
        <div className={`fixed z-[70] transition-all duration-500 transform top-20 right-6 w-72 ${hoveredAd ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          {hoveredAd && (
            <div className="glass-card overflow-hidden border border-indigo-500/30 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] h-full overflow-y-auto no-scrollbar rounded-[24px]">
              {/* Header / Category */}
              <div className="bg-indigo-600/20 px-4 py-2 border-b border-indigo-500/20 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Detalles</span>
                <div className="flex gap-1.5 overflow-hidden">
                  <span className="text-[8px] bg-indigo-500/40 text-white px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">{hoveredAd.category || 'General'}</span>
                  {hoveredAd.barrio && <span className="text-[8px] bg-emerald-500/40 text-white px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">{hoveredAd.barrio}</span>}
                </div>
              </div>

              {/* Brand Logo / Name */}
              <div className="p-5 bg-gradient-to-b from-indigo-950/50 to-transparent">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-indigo-500/30 overflow-hidden flex-shrink-0 shadow-xl">
                    {imageObjects[hoveredAd.id] ? (
                      <img src={imageObjects[hoveredAd.id].src} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-950">
                        <ImageIcon className="text-indigo-800" size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-white uppercase leading-tight truncate">{hoveredAd.name || 'ANUNCIANTE'}</h2>
                    <div className="flex items-center gap-1.5 text-indigo-400 mt-1">
                      <ExternalLink size={10} />
                      <span className="text-[10px] font-bold truncate">{hoveredAd.url}</span>
                    </div>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="space-y-3">
                  {hoveredAd.phone && (
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Phone size={10} /> Teléfono</span>
                      <span className="text-[10px] font-black text-slate-200">{hoveredAd.phone}</span>
                    </div>
                  )}
                  {hoveredAd.email && (
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Mail size={10} /> Email</span>
                      <span className="text-[10px] font-black text-slate-200 truncate max-w-[120px]">{hoveredAd.email}</span>
                    </div>
                  )}
                  {hoveredAd.location && (
                    <div className="flex flex-col gap-1 py-2 border-b border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><MapPin size={10} /> Ubicación Física</span>
                      <span className="text-[10px] font-black text-indigo-300 italic">{hoveredAd.location}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Posición</span>
                      <span className="text-[10px] font-black text-white">X:{hoveredAd.x} Y:{hoveredAd.y}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Tamaño</span>
                      <span className="text-[10px] font-black text-white">{hoveredAd.width}x{hoveredAd.height}px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer / Expiration */}
              <div className="bg-slate-950/80 p-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Estado</span>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">MAPA ACTIVO ✓</span>
                </div>
                {hoveredAd.expiration_date && (
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Expira</span>
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter underline decoration-red-400/30">{hoveredAd.expiration_date}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pure Inline CSS Mobile Bottom Bar (20% height) */}
      {isMobile && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '20%', backgroundColor: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'sans-serif' }}>
          
          {/* Detalles del anuncio */}
          <div style={{ flex: 1, padding: '10px 15px', overflowY: 'auto' }}>
            {hoveredAd ? (
               <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                 {imageObjects[hoveredAd.id] ? (
                    <img src={imageObjects[hoveredAd.id].src} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} alt="" />
                 ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }} />
                 )}
                 <div style={{ flex: 1.5, minWidth: 0 }}>
                   <h3 
                     onClick={() => {
                        if (hoveredAd.url && window.confirm(`¿Deseas visitar el sitio oficial de ${hoveredAd.name}?`)) {
                          window.open(hoveredAd.url.startsWith('http') ? hoveredAd.url : `https://${hoveredAd.url}`, '_blank');
                        }
                     }}
                     style={{ 
                       margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', 
                       whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
                       letterSpacing: '0.5px', color: '#6366f1', cursor: 'pointer'
                     }}
                   >
                     {hoveredAd.name || 'ANUNCIANTE'}
                   </h3>
                   <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                     <span style={{ fontSize: '8px', backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '900', border: '1px solid rgba(99,102,241,0.3)' }}>
                       {hoveredAd.category || 'General'}
                     </span>
                     {hoveredAd.barrio && (
                       <span style={{ fontSize: '8px', backgroundColor: 'rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '900', border: '1px solid rgba(16,185,129,0.3)' }}>
                         {hoveredAd.barrio}
                       </span>
                     )}
                   </div>
                 </div>

                 {/* Marquee Section (Espacio de noticias a la derecha) */}
                 <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative', height: '30px', display: 'flex', alignItems: 'center' }}>
                    {hoveredAd.description ? (
                      <div className="marquee-text">
                        {hoveredAd.description}
                      </div>
                    ) : (
                      <div style={{ fontSize: '8px', color: '#334155', fontStyle: 'italic', textAlign: 'right', width: '100%' }}>
                        SIN DESCRIPCIÓN
                      </div>
                    )}
                 </div>
               </div>
            ) : (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '12px', gap: '8px' }}>
                  <MapPin size={14} /> Gira la esfera o usa GPS
               </div>
            )}
          </div>

          {/* Botonera de Acciones (Filtros y Mapa) */}
          <div style={{ display: 'flex', gap: '8px', padding: '10px 15px 5px 15px', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#020617' }}>
            <button 
              onClick={() => {
                 const rubros = ['Todos', ...RUBROS];
                 const currentIdx = selectedCategory ? rubros.indexOf(selectedCategory) : 0;
                 const nextIdx = (currentIdx + 1) % rubros.length;
                 setSelectedCategory(nextIdx === 0 ? null : rubros[nextIdx]);
              }}
              className={`cyber-btn ${selectedCategory ? 'active' : ''}`}
              style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9' }}
            >
              RUBRO: {selectedCategory || 'TODOS'}
            </button>
            <button 
              onClick={() => setBarrioFilterOpen(true)}
              className={`cyber-btn ${selectedBarrio ? 'active' : ''}`}
              style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9' }}
            >
              BARRIO: {selectedBarrio || 'TODOS'}
            </button>
            <button 
              onClick={() => {
                if (hoveredAd && hoveredAd.location) {
                  const query = encodeURIComponent(`${hoveredAd.name} ${hoveredAd.location} ${hoveredAd.barrio || ''} Buenos Aires`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                } else {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(pos => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;
                    let closest = null;
                    let minDist = Infinity;
                    ads.forEach(ad => {
                      if (ad.lat && ad.lng) {
                        const d = Math.sqrt(Math.pow(ad.lat - uLat, 2) + Math.pow(ad.lng - uLng, 2));
                        if (d < minDist) { minDist = d; closest = ad; }
                      }
                    });
                    if (closest) setTargetAd(closest);
                  });
                }
              }} 
              className={`cyber-btn ${hoveredAd || targetAd ? 'active' : ''}`}
              style={{ flex: 1.2, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9' }}
            >
              {hoveredAd ? <MapPin size={12} /> : null}
              {hoveredAd ? 'CÓMO LLEGAR' : 'MAPA / GPS'}
            </button>
          </div>

          {/* Botón de WhatsApp One-Click */}
          <div style={{ padding: '5px 15px 15px 15px', backgroundColor: '#020617' }}>
            <button 
              onClick={() => {
                if (!hoveredAd || !hoveredAd.phone) return;
                const cleanPhone = hoveredAd.phone.replace(/\D/g, '');
                const msg = encodeURIComponent("Hola, te vi en el Elkilombo de Buenos Aires y quería consultar por...");
                window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
              }}
              disabled={!hoveredAd}
              className={`cyber-btn ${hoveredAd ? 'active' : ''}`}
              style={{ 
                width: '100%', 
                height: '55px', 
                borderRadius: '12px', 
                fontSize: '14px', 
                fontWeight: '900', 
                color: '#c9c9c9',
                opacity: hoveredAd ? 1 : 0.5,
                cursor: hoveredAd ? 'pointer' : 'default'
              }}
            >
              <Phone size={20} /> 
              {hoveredAd ? 'CONSULTAR POR WHATSAPP' : 'SELECCIONA UN COMERCIO'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicView;
