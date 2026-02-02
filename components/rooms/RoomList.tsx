
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { RoomStatus, UserRole, RoomCategory, CleaningStatus } from '../../types';
import { Coffee, Wind, X, Bed, RefreshCw, Link as LinkIcon, Calendar, Clock, ClipboardList, AlertTriangle, Settings2, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';

const RoomList: React.FC = () => {
  const { rooms, tasks, updateRoomStatus, updateRoomICal, createTask, users, syncICal, currentUser } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | 'ALL'>('ALL');
  const [activeMenuRoomId, setActiveMenuRoomId] = useState<string | null>(null);
  const [assigningRoomId, setAssigningRoomId] = useState<string | null>(null);
  const [icalRoomId, setIcalRoomId] = useState<string | null>(null);
  const [icalInput, setIcalInput] = useState('');
  const [assignmentData, setAssignmentData] = useState({ staffId: '', deadline: '', notes: '' });

  const staffMembers = users.filter(u => u.role === UserRole.STAFF);
  
  const filteredRooms = rooms.filter(r => {
    const statusMatch = filter === 'ALL' || r.status === filter;
    const categoryMatch = categoryFilter === 'ALL' || r.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const isManagerOrAdmin = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;

  const handleAssignTask = () => {
    if (!assigningRoomId) return;
    createTask({ 
      roomId: assigningRoomId, 
      assignedTo: assignmentData.staffId, 
      deadline: assignmentData.deadline, 
      notes: assignmentData.notes 
    });
    setAssigningRoomId(null);
    setAssignmentData({ staffId: '', deadline: '', notes: '' });
  };

  const handleSaveICal = () => {
    if (icalRoomId) {
      updateRoomICal(icalRoomId, icalInput);
      setIcalRoomId(null);
      setIcalInput('');
    }
  };

  const handleToggleSujo = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const newStatus = room.status === RoomStatus.SUJO ? RoomStatus.DISPONIVEL : RoomStatus.SUJO;
    updateRoomStatus(roomId, newStatus);
    setActiveMenuRoomId(null);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-outfit">Mapa de Unidades</h1>
          <p className="text-slate-500 font-medium">Controle em tempo real do inventário.</p>
        </div>
        {isManagerOrAdmin && (
          <button onClick={() => rooms.forEach(r => r.icalUrl && syncICal(r.id))} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all">
            <RefreshCw size={18} /> Sync Reservas
          </button>
        )}
      </div>

      {/* FILTROS RESTAURADOS */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 border-r border-slate-100 pr-5">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filtrar</span>
        </div>
        
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="bg-slate-50 p-2.5 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ALL">Todos os Status</option>
          {Object.values(RoomStatus).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="bg-slate-50 p-2.5 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ALL">Todas Categorias</option>
          {Object.values(RoomCategory).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {filteredRooms.map(room => (
          <div key={room.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group hover:shadow-xl transition-all">
            <div className="p-4 md:p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-black text-slate-900 truncate">{room.number}</h3>
                <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border shadow-sm ${
                  room.status === RoomStatus.DISPONIVEL ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  room.status === RoomStatus.OCUPADO ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  room.status === RoomStatus.LIMPANDO ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {room.status}
                </div>
              </div>
              
              <button onClick={() => setActiveMenuRoomId(room.id)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase transition-all border border-slate-100 hover:bg-blue-50 hover:text-blue-600">
                <Settings2 size={16} /> Gestão
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeMenuRoomId && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">Unidade {rooms.find(r => r.id === activeMenuRoomId)?.number}</h3>
                <button onClick={() => setActiveMenuRoomId(null)} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X /></button>
             </div>
             
             <div className="space-y-4">
                <button 
                  onClick={() => handleToggleSujo(activeMenuRoomId)}
                  className={`w-full flex items-center justify-between p-6 rounded-[1.8rem] border-4 transition-all ${
                    rooms.find(r => r.id === activeMenuRoomId)?.status === RoomStatus.SUJO
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-rose-100 bg-rose-50 text-rose-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {rooms.find(r => r.id === activeMenuRoomId)?.status === RoomStatus.SUJO ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    <span className="font-black text-lg">MARCAR COMO {rooms.find(r => r.id === activeMenuRoomId)?.status === RoomStatus.SUJO ? 'LIMPO' : 'SUJO'}</span>
                  </div>
                </button>

                {isManagerOrAdmin && rooms.find(r => r.id === activeMenuRoomId)?.status !== RoomStatus.LIMPANDO && (
                  <button onClick={() => { setAssigningRoomId(activeMenuRoomId); setActiveMenuRoomId(null); }} className="w-full flex items-center gap-4 p-6 bg-slate-900 text-white rounded-[1.8rem] hover:bg-blue-600 transition-all shadow-xl">
                    <ClipboardList size={24} />
                    <span className="font-black text-lg">DESIGNAR FAXINA</span>
                  </button>
                )}

                {isManagerOrAdmin && (
                  <button onClick={() => { 
                    const r = rooms.find(rm => rm.id === activeMenuRoomId);
                    setIcalInput(r?.icalUrl || '');
                    setIcalRoomId(activeMenuRoomId); 
                    setActiveMenuRoomId(null); 
                  }} className="w-full flex items-center gap-4 p-6 bg-slate-50 text-slate-600 rounded-[1.8rem] hover:bg-slate-100 transition-all border border-slate-200">
                    <LinkIcon size={24} />
                    <span className="font-black text-lg">VINCULAR AIRBNB (iCal)</span>
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

      {/* MODAL DESIGNAR FAXINA */}
      {assigningRoomId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">Designar Faxina</h3>
                <button onClick={() => setAssigningRoomId(null)} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X /></button>
             </div>
             <div className="space-y-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Responsável</label>
                   <select value={assignmentData.staffId} onChange={e => setAssignmentData({...assignmentData, staffId: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold">
                      <option value="">Selecione funcionário...</option>
                      {staffMembers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Prazo Final</label>
                   <input type="time" value={assignmentData.deadline} onChange={e => setAssignmentData({...assignmentData, deadline: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" />
                </div>
                <button disabled={!assignmentData.staffId || !assignmentData.deadline} onClick={handleAssignTask} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest disabled:opacity-50">Confirmar Designação</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL ICAL / AIRBNB RESTAURADO */}
      {icalRoomId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">Configurar iCal</h3>
                <button onClick={() => setIcalRoomId(null)} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X /></button>
             </div>
             <div className="space-y-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Link iCal (Airbnb/Booking)</label>
                   <input type="text" value={icalInput} onChange={e => setIcalInput(e.target.value)} placeholder="https://..." className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleSaveICal} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest">Salvar e Sincronizar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomList;
