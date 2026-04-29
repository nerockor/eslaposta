import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const CANVAS_SIZE = 3200;
const API_URL = 'http://localhost:3001/api/ads';

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
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    setTransform(prev => ({
      ...prev,
      x: (winW - CANVAS_SIZE * prev.scale) / 2,
      y: (winH - CANVAS_SIZE * prev.scale) / 2
    }));
  }, []);

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
      if (img) {
        ctx.drawImage(img, ad.x, ad.y, ad.width, ad.height);
      } else {
        ctx.fillStyle = '#6366f1';
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
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 15 / transform.scale;

      const img = imageObjects[hoveredAd.id];
      if (img) {
        ctx.drawImage(img, hx, hy, targetSize, targetSize);
      } else {
        ctx.fillStyle = '#818cf8';
        ctx.fillRect(hx, hy, targetSize, targetSize);
      }
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / transform.scale;
      ctx.strokeRect(hx, hy, targetSize, targetSize);
      ctx.restore();
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2 / transform.scale;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  }, [ads, transform, hoveredAd, imageObjects]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
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
    const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, 0.05), 10);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const canvasMouseX = (mouseX - transform.x) / transform.scale;
    const canvasMouseY = (mouseY - transform.y) / transform.scale;
    
    setTransform({
      scale: newScale,
      x: mouseX - canvasMouseX * newScale,
      y: mouseY - canvasMouseY * newScale
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      style={{ cursor: isDragging ? 'grabbing' : (hoveredAd ? 'pointer' : 'grab') }}
    >
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="absolute inset-0" />

      {/* Dynamic Island */}
      {showIsland && featuredAd && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[170px] h-[130px] glass-card border-x border-b border-indigo-500/30 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] rounded-[32px] overflow-hidden flex flex-col pointer-events-auto transition-all duration-500 animate-in slide-in-from-top-10 fade-in z-50">
          <button onClick={() => setShowIsland(false)} className="absolute top-2.5 right-2.5 p-1.5 bg-black/50 hover:bg-black/90 rounded-full text-white transition-colors z-10 backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          
          <div className="h-[80px] bg-indigo-950 relative">
            {featuredAd.image ? <img src={featuredAd.image} className="w-full h-full object-cover opacity-90" alt="" /> : <div className="w-full h-full bg-indigo-600/20" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            <div className="absolute top-2 left-3 px-2 py-0.5 bg-indigo-600/80 rounded-full text-[6px] font-black uppercase text-white tracking-widest backdrop-blur-sm">Destacado</div>
          </div>
          
          <div className="flex-1 bg-slate-950 p-2 flex flex-col justify-center text-center cursor-pointer hover:bg-slate-900 transition-colors relative" onClick={() => window.open(featuredAd.url.startsWith('http') ? featuredAd.url : `https://${featuredAd.url}`, '_blank')}>
            <span className="text-[11px] text-white font-black uppercase leading-tight truncate px-2 drop-shadow-md">{featuredAd.name || 'Anunciante'}</span>
            <span className="text-[8px] text-indigo-400 truncate px-2 font-bold mt-0.5">{featuredAd.url}</span>
          </div>
        </div>
      )}

      <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-none text-center transition-all duration-500 ${showIsland && featuredAd ? 'top-[160px]' : 'top-8'}`}>
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">100,000 Ad Spaces</h1>
        <p className="text-slate-400">The digital monument of the web</p>
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-2">
        <button onClick={() => setTransform(prev => ({ ...prev, scale: prev.scale * 1.2 }))} className="p-3 glass-card text-white hover:bg-slate-800 transition-colors pointer-events-auto"><ZoomIn size={20} /></button>
        <button onClick={() => setTransform(prev => ({ ...prev, scale: prev.scale / 1.2 }))} className="p-3 glass-card text-white hover:bg-slate-800 transition-colors pointer-events-auto"><ZoomOut size={20} /></button>
        <button onClick={() => {
            const scale = Math.min(window.innerWidth, window.innerHeight) / CANVAS_SIZE;
            setTransform({ x: (window.innerWidth - CANVAS_SIZE * scale)/2, y: (window.innerHeight - CANVAS_SIZE * scale)/2, scale });
          }} className="p-3 glass-card text-white hover:bg-slate-800 transition-colors pointer-events-auto"><Maximize size={20} /></button>
      </div>

      <div className="absolute bottom-8 left-8 glass-card px-4 py-2 text-sm text-slate-300 pointer-events-none">
        {ads.length.toLocaleString()} ads • {isFetchingBatch ? 'Cargando visuales...' : 'Mapa listo'}
      </div>

      {hoveredAd && (
        <div 
          className="absolute glass-card p-3 text-xs text-white pointer-events-none border-indigo-500/50 shadow-2xl flex items-center gap-3"
          style={{ left: (hoveredAd.x * transform.scale + transform.x) + 15, top: (hoveredAd.y * transform.scale + transform.y) - 30 }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] text-indigo-400 font-black uppercase mb-1">{hoveredAd.name || 'ANUNCIANTE'}</span>
            <div className="font-bold">{hoveredAd.url}</div>
            {hoveredAd.expiration_date && <div className="text-[8px] text-red-400 mt-1 uppercase">Expira: {hoveredAd.expiration_date}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicView;
