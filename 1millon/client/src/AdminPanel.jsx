import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutGrid, Link as LinkIcon, Send, CheckCircle2, AlertCircle, Search, Trash2, ExternalLink, X, Image as ImageIcon, Edit3, Save, Upload, XCircle, User, Phone, Mail, Calendar, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';
import { generateCertificate } from './utils/certificateUtils';

const SECTORS = [
  { id: 'superior-izquierdo', label: 'Superior Izquierdo' },
  { id: 'superior-centro', label: 'Superior Centro' },
  { id: 'superior-derecho', label: 'Superior Derecho' },
  { id: 'centro-izquierdo', label: 'Centro Izquierdo' },
  { id: 'centro', label: 'Centro' },
  { id: 'centro-derecho', label: 'Centro Derecho' },
  { id: 'inferior-izquierdo', label: 'Inferior Izquierdo' },
  { id: 'inferior-centro', label: 'Inferior Centro' },
  { id: 'inferior-derecho', label: 'Inferior Derecho' },
];

const AdminPanel = () => {
  const [url, setUrl] = useState('');
  const [base64Image, setBase64Image] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [size, setSize] = useState('10');
  const [selectedSector, setSelectedSector] = useState('centro');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  
  const [ads, setAds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [editingAd, setEditingAd] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/ads');
      setAds(res.data);
    } catch (err) {
      console.error('Error fetching ads', err);
    }
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleFileChange = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Máximo 2MB.");
      return;
    }
    const base64 = await toBase64(file);
    if (isEdit) {
      setEditingAd({ ...editingAd, image: base64 });
    } else {
      setBase64Image(base64);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setStatus('loading');
    try {
      const resp = await axios.post('http://localhost:3001/api/ads', {
        url, sector: selectedSector, image: base64Image,
        name, phone, email, expiration_date: expirationDate, size
      });
      
      setStatus('success');
      setMessage('Publicidad colocada correctamente!');
      
      // Auto-trigger certificate download
      generateCertificate({
          id: resp.data.id,
          x: resp.data.x,
          y: resp.data.y,
          width: resp.data.width,
          height: resp.data.height,
          name: name,
          url: url,
          sector: selectedSector,
          image: base64Image
      });

      setUrl(''); setBase64Image(''); setName(''); setPhone(''); setEmail(''); setExpirationDate(''); setSize('10');
      fetchAds();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Error al conectar con el servidor');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:3001/api/ads/${editingAd.id}`, editingAd);
      setEditingAd(null);
      fetchAds();
    } catch (err) {
      alert('Error al actualizar');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(`http://localhost:3001/api/ads/${deleteConfirm}`);
      setDeleteConfirm(null);
      fetchAds();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const displayAds = searchQuery.trim()
    ? ads.filter(ad => 
        ad.url.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
        (ad.name || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
      ).reverse()
    : ads.length > 0 ? [ads[ads.length - 1]] : [];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 font-sans flex flex-col items-center">
      {/* Modals */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-xs p-6 border-red-500/20">
            <h3 className="text-lg font-bold mb-6">¿Eliminar anuncio?</h3>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 rounded-xl font-bold">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {editingAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card w-full max-w-md p-8 my-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2"><Edit3 className="text-indigo-400" /> Editar Anuncio</h3>
              <button onClick={() => setEditingAd(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre</label>
                  <input type="text" className="admin-input" value={editingAd.name || ''} onChange={(e) => setEditingAd({ ...editingAd, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Teléfono</label>
                  <input type="text" className="admin-input" value={editingAd.phone || ''} onChange={(e) => setEditingAd({ ...editingAd, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                  <input type="email" className="admin-input" value={editingAd.email || ''} onChange={(e) => setEditingAd({ ...editingAd, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vencimiento</label>
                  <input type="date" className="admin-input" value={editingAd.expiration_date || ''} onChange={(e) => setEditingAd({ ...editingAd, expiration_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Enlace</label>
                <input type="text" className="admin-input" value={editingAd.url} onChange={(e) => setEditingAd({ ...editingAd, url: e.target.value })} />
              </div>
              
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Imagen</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                    {editingAd.image ? (
                      <>
                        <img src={editingAd.image} className="w-full h-full object-cover" alt="" />
                        <button type="button" onClick={() => setEditingAd({ ...editingAd, image: null })} className="absolute top-1 right-1 bg-red-600 rounded-full p-1"><X size={8} /></button>
                      </>
                    ) : <ImageIcon className="text-slate-700" size={16} />}
                  </div>
                  <label className="flex-1 border border-dashed border-slate-700 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer">
                    <Upload size={14} className="text-slate-500" />
                    <span className="text-[8px] font-bold text-slate-400 mt-1">CAMBIAR</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, true)} />
                  </label>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest mt-4">
                <Save size={16} className="inline mr-2" /> Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main UI */}
      <div className="w-full max-w-md">
        <header className="mb-8 text-center pt-4">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
            <LayoutGrid className="text-indigo-400" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">ADMIN PANEL</h1>
        </header>

        <div className="glass-card mb-8 overflow-hidden relative border border-slate-800 transition-all duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
          
          <button type="button" onClick={() => setIsFormOpen(!isFormOpen)} className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-900/40 transition-all cursor-pointer border-b border-transparent hover:border-slate-800/50 relative z-10">
            <h2 className="text-xs font-black mb-0 flex items-center gap-2 text-indigo-400 uppercase tracking-[0.2em]"><Send size={14} /> GESTOR DE PUBLICACIÓN / VENTA NUEVA</h2>
            {isFormOpen ? <ChevronUp size={20} className="text-indigo-400" /> : <ChevronDown size={20} className="text-indigo-400" />}
          </button>
          
          <div className={`transition-all duration-500 origin-top transform relative z-10 ${isFormOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 hidden'}`}>
            <form onSubmit={handleSubmit} className="p-6 space-y-10 bg-slate-950/20">
              {/* CARD 1: CLIENT DATA */}
              <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900/80 border-t-4 border-indigo-500 border-x-indigo-500/30 border-b-indigo-500/30 rounded-2xl shadow-[0_8px_30px_rgba(99,102,241,0.15)] p-6">
                <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-indigo-400 mb-6 pb-3 border-b border-indigo-500/20"><User size={16} /> ETAPA 1: DATOS Y MARCA DEL CLIENTE</h3>
                
                <div className="space-y-5">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="admin-label"><User size={10} /> Nombre de Marca</label>
                    <input type="text" className="admin-input bg-slate-950/80" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: TechStore" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label"><Calendar size={10} /> Culminación</label>
                    <input type="date" className="admin-input bg-slate-950/80" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="admin-label"><Phone size={10} /> Teléfono</label>
                    <input type="text" className="admin-input bg-slate-950/80" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label"><Mail size={10} /> Email</label>
                    <input type="email" className="admin-input bg-slate-950/80" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@..." />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="admin-label"><LinkIcon size={10} /> Enlace Destino</label>
                  <input type="text" className="admin-input bg-slate-950/80 border-indigo-500/30" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ejemplo.com" required />
                </div>
                
                <div className="space-y-2">
                  <label className="admin-label"><ImageIcon size={10} /> Imagen / Logotipo Principal</label>
                  <label className={`w-full border-2 border-dashed border-slate-700/80 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${base64Image ? 'bg-indigo-500/10 border-indigo-500/60' : 'bg-slate-950/50 hover:bg-slate-900 hover:border-slate-500'}`}>
                    {base64Image ? (
                      <div className="flex items-center gap-3">
                        <img src={base64Image} className="w-12 h-12 rounded-lg object-cover ring-2 ring-indigo-500 shadow-xl" alt="" />
                        <span className="text-xs font-black text-indigo-400 uppercase">Imagen lista ✓</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Toca para Subir Logo</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e)} />
                  </label>
                </div>
              </div>
            </div>

              {/* CARD 2: MAP CONFIGURATION */}
              <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900/80 border-t-4 border-emerald-500 border-x-emerald-500/30 border-b-emerald-500/30 rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.15)] p-6">
                <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-emerald-400 mb-6 pb-3 border-b border-emerald-500/20"><LayoutGrid size={16} /> ETAPA 2: CONFIGURACIÓN LOGÍSTICA DEL MAPA</h3>
                
                <div className="space-y-8">


                <div className="space-y-3">
                  <label className="admin-label"><LayoutGrid size={10} /> Dimensiones del Combo</label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 shadow-inner">
                    <button type="button" onClick={() => setSize('10')} className={`py-3 px-1 rounded-lg flex flex-col items-center gap-1 text-[8px] font-black transition-all ${size === '10' ? 'bg-emerald-600 shadow-lg shadow-emerald-600/30 text-white' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/80'}`}>
                      <span>10x10</span><span className="opacity-60 font-bold">BÁSICO</span>
                    </button>
                    <button type="button" onClick={() => setSize('20')} className={`py-3 px-1 rounded-lg flex flex-col items-center gap-1 text-[8px] font-black transition-all ${size === '20' ? 'bg-emerald-600 shadow-lg shadow-emerald-600/30 text-white' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/80'}`}>
                      <span>20x20</span><span className="opacity-60 font-bold">COMBO</span>
                    </button>
                    <button type="button" onClick={() => setSize('50')} className={`py-3 px-1 rounded-lg flex flex-col items-center gap-1 text-[8px] font-black transition-all ${size === '50' ? 'bg-emerald-600 shadow-lg shadow-emerald-600/30 text-white' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/80'}`}>
                      <span>50x50</span><span className="opacity-60 font-bold">PREMIUM</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="admin-label"><LayoutGrid size={10} /> Elección de Sector</label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 shadow-inner">
                    {SECTORS.map((sector) => {
                      const isSelected = selectedSector === sector.id;
                      let colorClass = 'bg-slate-800/40'; // Default
                      
                      if (sector.id.startsWith('superior')) {
                        colorClass = isSelected ? 'bg-sky-500 shadow-sky-500/30' : 'bg-sky-950/20 text-sky-600 hover:bg-sky-900/40';
                      } else if (sector.id.startsWith('centro')) {
                        colorClass = isSelected ? 'bg-indigo-500 shadow-indigo-500/30' : 'bg-indigo-950/20 text-indigo-600 hover:bg-indigo-900/40';
                      } else if (sector.id.startsWith('inferior')) {
                        colorClass = isSelected ? 'bg-amber-500 shadow-amber-500/30' : 'bg-amber-950/20 text-amber-600 hover:bg-amber-900/40';
                      }

                      return (
                        <button 
                          key={sector.id} 
                          type="button" 
                          onClick={() => setSelectedSector(sector.id)} 
                          className={`py-3 px-1 rounded-lg text-[7px] font-black transition-all duration-300 ${colorClass} ${isSelected ? 'scale-100 shadow-md text-white' : 'scale-[0.98] opacity-70'}`}
                        >
                          {sector.label.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: CONFIRM & SUBMIT */}
              <div className="bg-gradient-to-br from-violet-950/80 to-slate-900/80 border-t-4 border-violet-500 border-x-violet-500/30 border-b-violet-500/30 rounded-2xl shadow-[0_8px_30px_rgba(139,92,246,0.15)] p-6">
                  <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-violet-400 mb-6 pb-3 border-b border-violet-500/20"><CheckCircle2 size={16} /> ETAPA 3: APROBACIÓN Y EMISIÓN DE VENTA</h3>
                  <button type="submit" disabled={!url || !selectedSector || status === 'loading'} className="w-full group relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:via-purple-500 hover:to-violet-500 text-white font-black py-6 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 shadow-[0_10px_40px_-5px_rgba(139,92,246,0.6)] transform hover:scale-[1.01] active:scale-[0.98]">
                    {status === 'loading' ? (
                        <span className="animate-spin text-3xl py-1">⏳</span>
                    ) : (
                        <>
                          <span className="flex items-center gap-2 text-xl tracking-tighter drop-shadow-md"><Send size={20} /> PUBLICAR E IMPRIMIR CERTIFICADO</span>
                          <span className="text-[9px] text-indigo-100 font-bold uppercase tracking-widest opacity-80 mt-1">Sube Automáticamente al Lienzo</span>
                        </>
                    )}
                  </button>
              </div>
            </form>
          </div>

          {status !== 'idle' && (
            <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-xs font-bold">{message}</span>
            </div>
          )}
        </div>

        {/* CARD 4/5: COMMAND CENTER & HISTORY */}
        <div className="glass-card mb-10 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <div className="flex bg-slate-900 border-b border-slate-800/60 font-black text-[10px] uppercase text-slate-500 divide-x divide-slate-800">
            <div className="px-5 py-4 w-48 flex items-center gap-2 text-indigo-400 bg-slate-900/80 shadow-inner">
               <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Panel General
            </div>
            <div className="px-5 py-4 flex-1 flex justify-between items-center bg-slate-950/50">
              <span className="hidden sm:inline">Ventas Totales en el Mapa</span>
              <span className="sm:hidden">Total Ventas</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full">{ads.length.toLocaleString()} / 100,000</span>
            </div>
          </div>
          
          <div className="p-5 bg-slate-900/20">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">Base de Datos - {searchQuery.trim() ? `Filtrando: ${displayAds.length} encontrados` : 'Última Edición'}</h3>
            
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input type="text" className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-11 pr-4 py-4 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold text-white transition-all shadow-inner" placeholder="Buscar cliente, marca o enlace web..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="space-y-4">
              {displayAds.length === 0 ? (
                 <div className="text-center py-10 text-slate-600 text-xs font-black uppercase">No hay registros</div>
              ) : displayAds.map(ad => (
              <div key={ad.id} className="glass-card p-4 border-slate-800/40">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                      {ad.image ? <img src={ad.image} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-800" size={20} />}
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-center py-0.5 pointer-events-none">
                        <span className="text-[6px] font-black tracking-widest text-white">{ad.width}x{ad.height}</span>
                      </div>
                    </div>
                    <div className="flex flex-col border-l border-slate-800 pl-3">
                      <span className="text-sm font-black text-white leading-tight uppercase">{ad.name || 'Sin Nombre'}</span>
                      <span className="text-[10px] text-indigo-400 font-bold truncate max-w-[150px]">{ad.url}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{ad.sector?.split('-')[1] || 'CENTRO'}</span>
                    {ad.expiration_date && (
                      <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded mt-1 font-black underline decoration-red-500/30">VENCE: {ad.expiration_date}</span>
                    )}
                  </div>
                </div>

                {ad.phone || ad.email ? (
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800/30">
                    {ad.phone && <div className="flex items-center gap-2 text-[9px] text-slate-400"><Phone size={10} /> {ad.phone}</div>}
                    {ad.email && <div className="flex items-center gap-2 text-[9px] text-slate-400 truncate"><Mail size={10} /> {ad.email}</div>}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <button onClick={() => setEditingAd(ad)} className="flex-1 py-3 bg-indigo-500/10 text-indigo-500 rounded-xl font-black text-[10px] uppercase border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={12} className="inline mr-1" /> Editar</button>
                  <button onClick={() => generateCertificate(ad)} className="flex-1 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl font-black text-[10px] uppercase border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all"><Award size={12} className="inline mr-1" /> Certif.</button>
                  <button onClick={() => setDeleteConfirm(ad.id)} className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl font-black text-[10px] uppercase border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={12} className="inline mr-1" /> Borrar</button>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>

    <button onClick={() => navigate('/')} className="w-full text-slate-800 hover:text-slate-600 transition-all text-[10px] font-black uppercase tracking-[0.4em] mb-12 py-8 border-t border-slate-900/50">CERRAR PANEL</button>
      </div>
    </div>
  );
};

export default AdminPanel;
