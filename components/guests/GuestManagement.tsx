
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { UserPlus, LogOut, X, Bed, DollarSign, Calendar, CreditCard, ScanLine, Sparkles, Loader2, Camera } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId) return alert("Selecione um quarto.");
    checkIn({ ...formData, totalValue });
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
        // Create a new GoogleGenAI instance right before making an API call to ensure fresh configuration
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Following Google GenAI SDK best practices for contents structure and response handling
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: "Analise este documento de identidade (RG, CNH ou Passaporte) e extraia o NOME COMPLETO e o NÚMERO DO DOCUMENTO. Retorne apenas um JSON puro com as chaves: 'fullName' e 'documentNumber'." }
            ]
          },
          config: { responseMimeType: "application/json" }
        });

        // Use response.text directly as a property, not a function
        const textOutput = response.text;
        const result = JSON.parse(textOutput || '{}');
        setFormData(prev => ({
          ...prev,
          fullName: result.fullName || prev.fullName,
          document: result.documentNumber || prev.document
        }));
      } catch (error) {
        console.error("Erro ao ler documento:", error);
        alert("Não foi possível ler o documento automaticamente. Tente preencher manualmente.");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hóspedes Ativos</h1>
          <p className="text-slate-500 font-medium">Controle financeiro e estadias.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              fullName: '',
              document: '',
              checkIn: new Date().toISOString().split('T')[0],
              checkOut: '',
              roomId: '',
              dailyRate: 150,
              paymentMethod: PaymentMethod.PIX
            });
            setShowCheckInModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
        >
          <UserPlus size={20} /> Novo Check-in
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeGuests.map(guest => {
          const room = rooms.find(r => r.id === guest.roomId);
          return (
            <div key={guest.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-2xl transition-all group">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg group-hover:rotate-6 transition-transform">
                    {guest.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-none">{guest.fullName}</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 mt-1">DOC: {guest.document}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Unidade</p>
                    <p className="font-black text-blue-600 text-lg">{room?.number || '???'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Previsto</p>
                    <p className="font-black text-slate-900 text-lg">R$ {guest.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-black uppercase tracking-widest">
                   <CreditCard size={14} className="text-slate-400" />
                   {guest.paymentMethod}
                </div>
              </div>

              <div className="p-4 border-t border-slate-50 flex gap-2">
                <button 
                  onClick={() => checkOut(guest.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all"
                >
                  <LogOut size={18} /> Finalizar Estadia
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showCheckInModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">Novo Check-in</h2>
              <button onClick={() => setShowCheckInModal(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full"><X /></button>
            </div>

            <div className="mb-8">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAIScan} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className={`w-full py-6 rounded-3xl border-4 border-dashed transition-all flex flex-col items-center justify-center gap-2 group ${isScanning ? 'bg-blue-50 border-blue-200 text-blue-600 cursor-wait' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500'}`}
              >
                {isScanning ? (
                  <>
                    <Loader2 size={32} className="animate-spin" />
                    <span className="font-black text-sm uppercase tracking-widest animate-pulse">Lendo documento com IA...</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <ScanLine size={32} />
                      <Sparkles size={18} className="text-amber-500" />
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest">Escanear RG/CNH via IA</span>
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome Completo</label>
                <input required placeholder="Preencha ou escaneie..." value={formData.fullName} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Documento</label>
                  <input required placeholder="RG/CPF" value={formData.document} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, document: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Unidade</label>
                  <select required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})}>
                    <option value="">Quarto...</option>
                    {availableRooms.map(r => <option key={r.id} value={r.id}>Q. {r.number}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Entrada</label>
                  <input required type="date" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Saída</label>
                  <input required type="date" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Diária (R$)</label>
                   <input required type="number" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Pagamento</label>
                   <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                      {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                </div>
              </div>

              <div className="bg-emerald-50 p-6 rounded-[1.8rem] flex justify-between items-center border border-emerald-100 shadow-inner">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest">Valor Total Estadia</span>
                   <span className="text-3xl font-black text-emerald-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                 </div>
                 <Sparkles className="text-emerald-300" size={32} />
              </div>

              <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-blue-600 transition-all transform active:scale-95 uppercase tracking-widest text-sm">
                Confirmar Check-in
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestManagement;
