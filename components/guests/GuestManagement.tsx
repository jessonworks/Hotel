
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { 
  UserPlus, LogOut, X, Bed, DollarSign, Calendar, 
  CreditCard, ScanLine, Sparkles, Loader2, Camera, MessageSquareText
} from 'lucide-react';
import { RoomStatus, PaymentMethod } from '../../types';

const GuestManagement: React.FC = () => {
  const { guests, rooms, checkIn, checkOut } = useStore();
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId) return;
    await checkIn({ ...formData, totalValue });
    setShowCheckInModal(false);
  };

  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setIsScanning(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: "Extraia o NOME COMPLETO e DOCUMENTO. Retorne JSON: {'fullName': '', 'documentNumber': ''}" }
            ]
          },
          config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text || '{}');
        setFormData(p => ({ ...p, fullName: result.fullName || p.fullName, document: result.documentNumber || p.document }));
      } catch (e) { alert("Erro na leitura IA."); } finally { setIsScanning(false); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hóspedes Ativos</h1>
          <p className="text-slate-500 font-medium">Gestão direta com sincronização Supabase.</p>
        </div>
        <button 
          onClick={() => setShowCheckInModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          <UserPlus size={20} /> Novo Check-in
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeGuests.map(guest => {
          const room = rooms.find(r => r.id === guest.roomId);
          return (
            <div key={guest.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl transition-all p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                  {guest.fullName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-none">{guest.fullName}</h3>
                  <p className="text-[10px] font-black uppercase text-slate-400 mt-1">DOC: {guest.document}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400">Unidade</p>
                  <p className="font-black text-blue-600 text-lg">{room?.number || '??'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400">Valor</p>
                  <p className="font-black text-slate-900 text-lg">R$ {Number(guest.totalValue).toFixed(2)}</p>
                </div>
              </div>
              <button 
                onClick={() => checkOut(guest.id)}
                className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
              >
                REALIZAR CHECK-OUT
              </button>
            </div>
          );
        })}
      </div>

      {showCheckInModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto max-h-[92vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900">Novo Registro</h2>
              <button onClick={() => setShowCheckInModal(false)} className="p-2 bg-slate-50 rounded-full"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <input type="file" ref={fileInputRef} onChange={handleAIScan} className="hidden" accept="image/*" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 font-black text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all">
                {isScanning ? <Loader2 className="animate-spin"/> : <ScanLine/>} ESCANEAR DOCUMENTO IA
              </button>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Nome do Hóspede</label>
                <input required value={formData.fullName} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Unidade</label>
                  <select required className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})}>
                    <option value="">Quarto...</option>
                    {availableRooms.map(r => <option key={r.id} value={r.id}>Q. {r.number}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Diária</label>
                  <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required className="p-4 bg-slate-50 rounded-2xl font-bold" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
                <input type="date" required className="p-4 bg-slate-50 rounded-2xl font-bold" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
              </div>
              <div className="bg-emerald-50 p-6 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase text-emerald-800">Total Previsto Estadia</p>
                <p className="text-3xl font-black text-emerald-600">R$ {totalValue.toFixed(2)}</p>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-xl hover:bg-blue-600 transition-all uppercase">Confirmar Estadia</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestManagement;
