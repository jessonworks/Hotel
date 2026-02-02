
import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store';
import { 
  Bell, Search, Camera, X, LogOut, ChevronRight, Lock, 
  CheckCircle2, Bed, Users, Cloud, Clock, ShieldAlert, Zap, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { 
    currentUser, updateCurrentUser, updateUserPassword, logout, rooms, 
    guests, isSupabaseConnected, isDemoMode, cloudAvailableAgain, connectionError 
  } = useStore();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{rooms: any[], guests: any[]}>({ rooms: [], guests: [] });
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [tempProfile, setTempProfile] = useState({ fullName: currentUser?.fullName || '', email: currentUser?.email || '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filteredRooms = rooms.filter(r => r.number.toLowerCase().includes(searchQuery.toLowerCase()));
      const filteredGuests = guests.filter(g => !g.checkedOutAt && g.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
      setSearchResults({ rooms: filteredRooms, guests: filteredGuests });
    } else {
      setSearchResults({ rooms: [], guests: [] });
    }
  }, [searchQuery, rooms, guests]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCurrentUser({ avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSaveProfile = () => {
    updateCurrentUser({ ...tempProfile });
    setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.current !== currentUser?.password) return setMsg({ type: 'error', text: 'Senha atual incorreta.' });
    if (passData.new !== passData.confirm) return setMsg({ type: 'error', text: 'Senhas não coincidem.' });
    updateUserPassword(currentUser.id, passData.new);
    setIsChangingPassword(false);
    setMsg({ type: 'success', text: 'Senha alterada!' });
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4 flex-1 relative">
          <div className="relative max-w-md w-full hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar quarto ou hóspede..." 
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg w-full focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold"
            />
            
            {/* Search Results Dropdown */}
            {searchQuery.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                {searchResults.rooms.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase p-2 tracking-widest">Quartos</p>
                    {searchResults.rooms.map(r => (
                      <button key={r.id} onClick={() => {navigate('/rooms'); setSearchQuery('');}} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                        <Bed size={16} className="text-blue-500" />
                        <span className="text-sm font-bold text-slate-700">Quarto {r.number}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.guests.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase p-2 tracking-widest">Hóspedes Ativos</p>
                    {searchResults.guests.map(g => (
                      <button key={g.id} onClick={() => {navigate('/guests'); setSearchQuery('');}} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                        <Users size={16} className="text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700">{g.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Clock & Status */}
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-xs font-black tracking-widest shadow-lg">
                <Clock size={14} className="text-blue-400" />
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
             </div>
             
             {isDemoMode && (
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                    <ShieldAlert size={14} /> MODO DEMO
                 </div>
                 {cloudAvailableAgain && (
                   <button 
                     onClick={logout}
                     className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-bounce"
                   >
                     <Zap size={14} /> Restaurar Nuvem
                   </button>
                 )}
               </div>
             )}

             <div className={`hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${
               isSupabaseConnected 
                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                : connectionError === 'Faltam chaves na Vercel' 
                  ? 'bg-rose-50 text-rose-600 border-rose-100' 
                  : 'bg-amber-50 text-amber-600 border-amber-100'
             }`}>
               {isSupabaseConnected ? <Cloud size={14} /> : <AlertCircle size={14} />}
               <span className="text-[10px] font-black uppercase tracking-widest">
                 {isSupabaseConnected ? 'Nuvem OK' : connectionError || 'Local Persist'}
               </span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          
          <button 
            onClick={() => {
              setTempProfile({ fullName: currentUser?.fullName || '', email: currentUser?.email || '' });
              setIsProfileModalOpen(true);
            }}
            className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200 hover:bg-slate-50 transition-colors py-1 rounded-lg group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none group-hover:text-blue-600 transition-colors">{currentUser?.fullName}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{currentUser?.role}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-black overflow-hidden border-2 border-white shadow-lg">
              {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover" /> : currentUser?.fullName.charAt(0)}
            </div>
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md h-[92vh] sm:h-auto sm:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden relative flex flex-col">
            <div className="bg-slate-900 p-8 pb-12 text-center text-white relative">
              <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full"><X size={24} /></button>
              <div className="relative inline-block group mb-4">
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                <div onClick={() => fileInputRef.current?.click()} className="w-28 h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center text-4xl font-black border-4 border-white shadow-2xl cursor-pointer overflow-hidden relative">
                  {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover" /> : currentUser?.fullName.charAt(0)}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={28} className="text-white" /></div>
                </div>
              </div>
              <h2 className="text-2xl font-black">{currentUser?.fullName}</h2>
              <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">{currentUser?.role}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-white -mt-6 rounded-t-[2.5rem] relative z-10">
              {msg && <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</div>}
              {isChangingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-6">
                   <h3 className="text-lg font-black text-slate-900">Alterar Senha</h3>
                   <div className="space-y-4">
                      <input type="password" required placeholder="Senha Atual" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={passData.current} onChange={e => setPassData({...passData, current: e.target.value})} />
                      <input type="password" required placeholder="Nova Senha" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} />
                      <input type="password" required placeholder="Confirmar Nova Senha" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} />
                   </div>
                   <div className="flex gap-3">
                      <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl">ATUALIZAR</button>
                      <button type="button" onClick={() => setIsChangingPassword(false)} className="px-6 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">VOLTAR</button>
                   </div>
                </form>
              ) : (
                <>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Seu Nome</label>
                      <input value={tempProfile.fullName} onChange={e => setTempProfile({...tempProfile, fullName: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">E-mail</label>
                      <input value={tempProfile.email} onChange={e => setTempProfile({...tempProfile, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                  </div>
                  <button onClick={() => setIsChangingPassword(true)} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm"><Lock size={18} className="text-slate-500" /></div>
                      <span className="font-bold text-sm text-slate-700">Alterar minha Senha</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                  <div className="pt-4 flex flex-col gap-3 pb-8">
                    <button onClick={handleSaveProfile} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all">SALVAR ALTERAÇÕES</button>
                    <button onClick={logout} className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"><LogOut size={18} /> SAIR DO SISTEMA</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
