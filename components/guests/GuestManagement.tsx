
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { UserPlus, LogOut, X, Bed, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { RoomStatus, PaymentMethod } from '../../types';

const GuestManagement: React.FC = () => {
  const { guests, rooms, checkIn, checkOut } = useStore();
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    document: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: '',
    roomId: '',
    dailyRate: 150,
    paymentMethod: PaymentMethod.PIX
  });

  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      const start = new Date(formData.checkIn).getTime();
      const end = new Date(formData.checkOut).getTime();
      const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      setTotalValue(nights * formData.dailyRate);
    }
  }, [formData.checkIn, formData.checkOut, formData.dailyRate]);

  const availableRooms = rooms.filter(r => r.status === RoomStatus.DISPONIVEL);
  const activeGuests = guests.filter(g => !g.checkedOutAt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId) return alert("Selecione um quarto.");
    checkIn({ ...formData, totalValue });
    setShowCheckInModal(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hóspedes Ativos</h1>
          <p className="text-slate-500 font-medium">Controle financeiro e estadias.</p>
        </div>
        <button 
          onClick={() => setShowCheckInModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg"
        >
          <UserPlus size={20} /> Novo Check-in
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeGuests.map(guest => {
          const room = rooms.find(r => r.id === guest.roomId);
          return (
            <div key={guest.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">{guest.fullName.charAt(0)}</div>
                  <div>
                    <h3 className="font-bold text-slate-900">{guest.fullName}</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400">DOC: {guest.document}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2 rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Quarto</p>
                    <p className="font-bold text-blue-600">{room?.number || '???'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Estadia</p>
                    <p className="font-bold text-slate-900">R$ {guest.totalValue.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl">
                   <CreditCard size={14} className="text-slate-400" />
                   <span className="font-medium">Pagamento: <span className="font-bold text-slate-700">{guest.paymentMethod}</span></span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-50 flex gap-2">
                <button 
                  onClick={() => checkOut(guest.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-all"
                >
                  <LogOut size={18} /> Check-out
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showCheckInModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Novo Check-in</h2>
              <button onClick={() => setShowCheckInModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Nome Completo" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setFormData({...formData, fullName: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Documento" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setFormData({...formData, document: e.target.value})} />
                <select required className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setFormData({...formData, roomId: e.target.value})}>
                  <option value="">Quarto...</option>
                  {availableRooms.map(r => <option key={r.id} value={r.id}>Q. {r.number}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required type="date" className="w-full p-3 bg-slate-50 rounded-xl" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
                <input required type="date" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setFormData({...formData, checkOut: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Valor Diária (R$)</label>
                   <input required type="number" className="w-full p-3 bg-slate-50 rounded-xl" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: parseFloat(e.target.value)})} />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Forma de Pagamento</label>
                   <select className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                      {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                </div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center border border-emerald-100">
                 <span className="font-bold text-emerald-900">Valor Total Estimado</span>
                 <span className="text-2xl font-black text-emerald-600">R$ {totalValue.toFixed(2)}</span>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20">Confirmar Estadia</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestManagement;
