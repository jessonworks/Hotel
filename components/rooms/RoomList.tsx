
import React, { useState } from 'react';
import { useStore } from '../../store';
import { RoomStatus, UserRole, RoomCategory } from '../../types';
import { Coffee, Wind, X, Bed, RefreshCw, Link as LinkIcon, Calendar, Clock, ClipboardList, AlertTriangle, Settings2, CheckCircle2 } from 'lucide-react';

const RoomList: React.FC = () => {
  const { rooms, updateRoomStatus, updateRoomICal, createTask, users, syncICal, currentUser } = useStore();
  const [filter, setFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | 'ALL'>('ALL');
  const [activeMenuRoomId, setActiveMenuRoomId] = useState<string | null>(null);
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
    setActiveMenuRoomId(null);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-outfit">Mapa de Unidades</h1>
          <p className="text-slate-500 font-medium font-sans">Gestão de quartos e áreas comuns.</p>
        </div>
        {isManagerOrAdmin && (
          <button 
            onClick={() => rooms.forEach(r => r.icalUrl && syncICal(r.id))}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
          >
            <RefreshCw size={18} /> Sync Airbnb
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {(['ALL', ...Object.values(RoomCategory)] as const).map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategoryFilter(cat)} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border shrink-0 ${
                categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {(['ALL', ...Object.values(RoomStatus)] as const).map(status => (
            <button 
              key={status} 
              onClick={() => setFilter(status)} 
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border shrink-0 ${
                filter === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {filteredRooms.map(room => (
          <div key={room.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group hover:shadow-xl transition-all">
            <div className="p-4 md:p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="max-w-[70%]">
                  <h3 className="text-2xl font-black text-slate-900 leading-none truncate">{room.number}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-tighter truncate">
                    {room.floor === 0 ? room.category : `Andar ${room.floor}`}
                  </p>
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
              
              <div className="flex items-center gap-4 text-slate-400 mb-6 h-6">
                 {room.category === RoomCategory.GUEST_ROOM && (
                   <>
                    <div className="flex items-center gap-1.5">
                       <Bed size={16} className="text-blue-500" />
                       <span className="text-sm font-bold text-slate-700">{room.bedsCount}</span>
                    </div>
                    <div className="flex gap-2">
                       <Coffee size={16} className={room.hasMinibar ? 'text-blue-500' : 'text-slate-100'} />
                       <Wind size={16} className={room.hasBalcony ? 'text-blue-500' : 'text-slate-100'} />
                    </div>
                   </>
                 )}
              </div>

              <button 
                onClick={() => setActiveMenuRoomId(room.id)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100"
              >
                <Settings2 size={16} /> Gestão
              </button>
            </div>
            
            {room.status === RoomStatus.LIMPANDO && (
              <div className="w-full py-2 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest text-center border-t border-amber-100 animate-pulse">
                Faxina em Curso
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Sheet de Gestão */}
      {activeMenuRoomId && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Unidade {rooms.find(r => r.id === activeMenuRoomId)?.number}</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Painel de Controle Operacional</p>
                </div>
                <button onClick={() => setActiveMenuRoomId(null)} className="text-slate-400 p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-all"><X /></button>
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
                    {rooms.find(r => r.id === activeMenuRoomId)?.status === RoomStatus.SUJO 
                      ? <CheckCircle2 size={24} /> 
                      : <AlertTriangle size={24} />}
                    <span className="font-black text-lg">Marcar como {rooms.find(r => r.id === activeMenuRoomId)?.status === RoomStatus.SUJO ? 'LIMPO' : 'SUJO'}</span>
                  </div>
                </button>

                {isManagerOrAdmin && (
                  <>
                    <button 
                      onClick={() => {
                        setAssigningRoomId(activeMenuRoomId);
                        setActiveMenuRoomId(null);
                      }}
                      className="w-full flex items-center gap-4 p-6 bg-slate-900 text-white rounded-[1.8rem] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20"
                    >
                      <ClipboardList size={24} />
                      <span className="font-black text-lg uppercase tracking-tight">Designar Faxina</span>
                    </button>

                    {rooms.find(r => r.id === activeMenuRoomId)?.category === RoomCategory.GUEST_ROOM && (
                      <button 
                        onClick={() => {
                          const room = rooms.find(r => r.id === activeMenuRoomId);
                          setEditingICalRoomId(activeMenuRoomId);
                          setIcalInput(room?.icalUrl || '');
                          setActiveMenuRoomId(null);
                        }}
                        className="w-full flex items-center gap-4 p-6 bg-white border-2 border-slate-100 text-slate-600 rounded-[1.8rem] hover:border-blue-400 hover:text-blue-600 transition-all"
                      >
                        <LinkIcon size={24} />
                        <span className="font-black text-lg uppercase tracking-tight">Sincronizar Airbnb</span>
                      </button>
                    )}
                  </>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Modal Ordem de Serviço */}
      {assigningRoomId && isManagerOrAdmin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Ordem de Serviço</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Unidade: {rooms.find(r => r.id === assigningRoomId)?.number}</p>
                </div>
                <button onClick={() => setAssigningRoomId(null)} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X /></button>
             </div>
             <div className="space-y-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Responsável</label>
                   <select 
                    value={assignmentData.staffId}
                    onChange={e => setAssignmentData({...assignmentData, staffId: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                   >
                      <option value="">Selecione o membro...</option>
                      {staffMembers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2"><Clock size={12} /> Prazo Final</label>
                   <input 
                    type="time" 
                    value={assignmentData.deadline}
                    onChange={e => setAssignmentData({...assignmentData, deadline: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Observações</label>
                   <textarea 
                    value={assignmentData.notes}
                    onChange={e => setAssignmentData({...assignmentData, notes: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl h-28 resize-none text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Detalhes específicos para esta limpeza..."
                   />
                </div>
                <button 
                  disabled={!assignmentData.staffId || !assignmentData.deadline}
                  onClick={handleAssignTask}
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                   Atribuir Tarefa
                </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Modal iCal */}
      {editingICalRoomId && isManagerOrAdmin && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="text-blue-500" /> iCal Airbnb Q. {rooms.find(r => r.id === editingICalRoomId)?.number}
                </h3>
                <button onClick={() => setEditingICalRoomId(null)} className="text-slate-400 p-2"><X /></button>
             </div>
             <div className="space-y-4">
                <input 
                  type="url" 
                  value={icalInput} 
                  onChange={e => setIcalInput(e.target.value)}
                  placeholder="Cole o link .ics aqui"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  onClick={() => {
                    updateRoomICal(editingICalRoomId, icalInput);
                    setEditingICalRoomId(null);
                  }}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20"
                >
                   Salvar Calendário
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomList;
