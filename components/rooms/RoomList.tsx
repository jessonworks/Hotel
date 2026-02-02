
import React, { useState } from 'react';
import { useStore } from '../../store';
import { RoomStatus, UserRole, RoomCategory } from '../../types';
import { Coffee, Wind, X, Bed, User, RefreshCw, Link as LinkIcon, Calendar, Clock, ClipboardList, AlertTriangle } from 'lucide-react';

const RoomList: React.FC = () => {
  const { rooms, updateRoomStatus, updateRoomICal, createTask, users, syncICal, currentUser } = useStore();
  const [filter, setFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | 'ALL'>('ALL');
  const [assigningRoomId, setAssigningRoomId] = useState<string | null>(null);
  const [editingICalRoomId, setEditingICalRoomId] = useState<string | null>(null);
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
    const room = rooms.find(r => r.id === assigningRoomId);
    
    createTask({ 
      roomId: assigningRoomId, 
      assignedTo: assignmentData.staffId, 
      deadline: assignmentData.deadline, 
      notes: assignmentData.notes, 
      bedsToMake: room?.bedsCount || 0,
      status: RoomStatus.LIMPANDO as any
    });
    
    updateRoomStatus(assigningRoomId, RoomStatus.LIMPANDO);
    setAssigningRoomId(null);
    setAssignmentData({ staffId: '', deadline: '', notes: '' });
  };

  const handleToggleSujo = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const newStatus = room.status === RoomStatus.SUJO ? RoomStatus.DISPONIVEL : RoomStatus.SUJO;
    updateRoomStatus(roomId, newStatus);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mapa de Unidades</h1>
          <p className="text-slate-500 font-medium">Gestão de quartos e áreas comuns do hotel.</p>
        </div>
        {isManagerOrAdmin && (
          <button 
            onClick={() => rooms.forEach(r => r.icalUrl && syncICal(r.id))}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
          >
            <RefreshCw size={18} /> Sincronizar Airbnb
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto">
          {(['ALL', ...Object.values(RoomCategory)] as const).map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategoryFilter(cat)} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto">
          {(['ALL', ...Object.values(RoomStatus)] as const).map(status => (
            <button 
              key={status} 
              onClick={() => setFilter(status)} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                filter === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredRooms.map(room => (
          <div key={room.id} className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-2xl transition-all flex flex-col relative ${room.category === RoomCategory.COMMON_AREA ? 'border-l-4 border-l-blue-400' : ''}`}>
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="max-w-[70%]">
                  <h3 className="text-2xl font-black text-slate-900 leading-none truncate">{room.number}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-tighter truncate">{room.category}</p>
                </div>
                <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border shadow-sm ${
                  room.status === RoomStatus.DISPONIVEL ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  room.status === RoomStatus.OCUPADO ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  room.status === RoomStatus.LIMPANDO ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {room.status}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-slate-400 mb-6">
                 {room.category === RoomCategory.GUEST_ROOM && (
                   <>
                    <div className="flex items-center gap-1.5">
                       <Bed size={16} className="text-blue-500" />
                       <span className="text-sm font-bold text-slate-700">{room.bedsCount}</span>
                    </div>
                    <div className="flex gap-2">
                       <Coffee size={16} className={room.hasMinibar ? 'text-blue-500' : 'text-slate-200'} />
                       <Wind size={16} className={room.hasBalcony ? 'text-blue-500' : 'text-slate-200'} />
                    </div>
                   </>
                 )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleToggleSujo(room.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                    room.status === RoomStatus.SUJO 
                      ? 'bg-rose-500 text-white border-rose-500' 
                      : 'bg-white text-slate-400 border-slate-200 hover:border-rose-400 hover:text-rose-400'
                  }`}
                >
                  <AlertTriangle size={14} /> Sujo
                </button>
                
                {isManagerOrAdmin && room.category === RoomCategory.GUEST_ROOM && (
                  <button 
                    onClick={() => {
                      setEditingICalRoomId(room.id);
                      setIcalInput(room.icalUrl || '');
                    }}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-100"
                  >
                    <LinkIcon size={18} />
                  </button>
                )}
              </div>
            </div>
            
            {room.status !== RoomStatus.LIMPANDO && isManagerOrAdmin && (
              <button 
                onClick={() => {
                  setAssigningRoomId(room.id);
                  setAssignmentData({ staffId: '', deadline: '', notes: '' });
                }} 
                className="w-full py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 border-t border-slate-800"
              >
                <ClipboardList size={16} /> Designar Faxina
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal Designar Tarefa */}
      {assigningRoomId && isManagerOrAdmin && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Nova Ordem de Serviço</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Unidade: {rooms.find(r => r.id === assigningRoomId)?.number}
                  </p>
                </div>
                <button onClick={() => setAssigningRoomId(null)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full"><X /></button>
             </div>
             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Executante (Equipe)</label>
                   <select 
                    value={assignmentData.staffId}
                    onChange={e => setAssignmentData({...assignmentData, staffId: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                   >
                      <option value="">Selecione o funcionário...</option>
                      {staffMembers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest flex items-center gap-2">
                     <Clock size={12} /> Hora Limite
                   </label>
                   <input 
                    type="time" 
                    value={assignmentData.deadline}
                    onChange={e => setAssignmentData({...assignmentData, deadline: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Instruções</label>
                   <textarea 
                    value={assignmentData.notes}
                    onChange={e => setAssignmentData({...assignmentData, notes: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl h-32 resize-none text-slate-700 focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Focar no terraço e escadas."
                   />
                </div>
                <button 
                  disabled={!assignmentData.staffId || !assignmentData.deadline}
                  onClick={handleAssignTask}
                  className="w-full py-5 bg-blue-600 text-white font-bold rounded-3xl shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   Lançar Ordem AGORA 🚀
                </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Modal iCal */}
      {editingICalRoomId && isManagerOrAdmin && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="text-blue-500" /> iCal Airbnb Q. {rooms.find(r => r.id === editingICalRoomId)?.number}
                </h3>
                <button onClick={() => setEditingICalRoomId(null)} className="text-slate-400"><X /></button>
             </div>
             <div className="space-y-4">
                <input 
                  type="url" 
                  value={icalInput} 
                  onChange={e => setIcalInput(e.target.value)}
                  placeholder="Link do calendário (.ics)"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={() => {
                    updateRoomICal(editingICalRoomId, icalInput);
                    setEditingICalRoomId(null);
                  }}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20"
                >
                   Salvar iCal
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomList;
