
import React, { useState } from 'react';
import { useStore } from '../../store';
import { LaundryStage } from '../../types';
import { Trash2, Plus, ChevronRight, Droplets, Wind, Warehouse, X, AlertCircle } from 'lucide-react';

const LaundryKanban: React.FC = () => {
  const { laundry = [], moveLaundry, addLaundry, isSupabaseConnected } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'Lençol', quantity: 1, stage: LaundryStage.SUJO, roomOrigin: '' });

  // FIX: Changed icon property to hold the component reference (Icon) instead of a rendered element
  const stages = [
    { id: LaundryStage.SUJO, label: 'Sujo', Icon: Trash2, color: 'bg-rose-50 text-rose-700 border-rose-100' },
    { id: LaundryStage.LAVANDO, label: 'Lavando', Icon: Droplets, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { id: LaundryStage.SECANDO, label: 'Secando', Icon: Wind, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { id: LaundryStage.GUARDADO, label: 'Guardado', Icon: Warehouse, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  ];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addLaundry(newItem);
    setShowAdd(false);
  };

  // Se o laundry não for um array por algum motivo de erro de sincronização
  const safeLaundry = Array.isArray(laundry) ? laundry : [];

  return (
    <div className="space-y-4 h-full flex flex-col pb-20 md:pb-12">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lavanderia</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Controle de Fluxo</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="p-3 bg-blue-600 text-white rounded-xl shadow-lg flex items-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
        >
          <Plus size={16} /> LOTE
        </button>
      </div>

      {!isSupabaseConnected && (
        <div className="mx-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 text-xs font-bold animate-pulse">
          <AlertCircle size={18} />
          <span>Atenção: Verifique se a tabela 'laundry' foi criada no seu Banco de Dados Supabase.</span>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-x-auto px-2 pb-6 snap-x snap-mandatory no-scrollbar custom-scrollbar">
        {stages.map(stage => (
          <div key={stage.id} className="flex flex-col h-full min-w-[280px] w-[85vw] md:w-[280px] md:min-w-0 bg-slate-50/50 rounded-3xl border border-slate-200 p-3 snap-center">
            {/* FIX: Use stage.Icon as a component tag */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest mb-4 border ${stage.color}`}>
              <stage.Icon size={18} />
              {stage.label}
              <span className="ml-auto bg-white/50 px-2 py-0.5 rounded-lg">
                {safeLaundry.filter(l => l.stage === stage.id).length}
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {safeLaundry.filter(l => l.stage === stage.id).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-800 text-sm truncate">{item.type}</h4>
                    <p className="text-[9px] font-black uppercase text-slate-400 mt-0.5">Qtd: {item.quantity} • {item.roomOrigin || 'Geral'}</p>
                  </div>
                  {stage.id !== LaundryStage.GUARDADO && (
                    <button onClick={() => {
                      const idx = stages.findIndex(s => s.id === stage.id);
                      moveLaundry(item.id, stages[idx+1].id);
                    }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><ChevronRight size={20} /></button>
                  )}
                </div>
              ))}
              {safeLaundry.filter(l => l.stage === stage.id).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-200">
                  {/* FIX: Use stage.Icon as a component tag with specified size */}
                  <stage.Icon size={32} />
                  <p className="text-[10px] font-black uppercase mt-2">Vazio</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">Novo Lote</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-slate-50 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Item</label>
                <input required placeholder="Ex: Lençol Casal" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" onChange={e => setNewItem({...newItem, type: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Qtd</label>
                  <input type="number" required placeholder="0" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Origem</label>
                  <input placeholder="Ex: 101" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" onChange={e => setNewItem({...newItem, roomOrigin: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest active:scale-95 transition-all mt-4">Confirmar Entrada</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaundryKanban;
