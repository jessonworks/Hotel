
import React, { useState } from 'react';
import { useStore } from '../../store';
import { LaundryStage } from '../../types';
import { Trash2, Plus, Clock, ChevronRight, Droplets, Wind, Warehouse, X } from 'lucide-react';

const LaundryKanban: React.FC = () => {
  const { laundry, moveLaundry, addLaundry } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'Lençol', quantity: 1, stage: LaundryStage.SUJO, roomOrigin: '' });

  const stages = [
    { id: LaundryStage.SUJO, label: 'Sujo', icon: <Trash2 size={20} />, color: 'bg-rose-100 text-rose-700' },
    { id: LaundryStage.LAVANDO, label: 'Lavando', icon: <Droplets size={20} />, color: 'bg-blue-100 text-blue-700' },
    { id: LaundryStage.SECANDO, label: 'Secando', icon: <Wind size={20} />, color: 'bg-amber-100 text-amber-700' },
    { id: LaundryStage.GUARDADO, label: 'Guardado', icon: <Warehouse size={20} />, color: 'bg-emerald-100 text-emerald-700' },
  ];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addLaundry(newItem);
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lavanderia</h1>
          <p className="text-slate-500 font-medium">Ciclo de enxoval e higienização.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="p-3 bg-blue-600 text-white rounded-xl shadow-lg flex items-center gap-2 font-bold"
        >
          <Plus size={20} /> Entrada de Lote
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-6 custom-scrollbar">
        {stages.map(stage => (
          <div key={stage.id} className="flex flex-col h-full min-w-[280px] bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm mb-4 ${stage.color}`}>
              {stage.icon}
              {stage.label}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {laundry.filter(l => l.stage === stage.id).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">{item.type}</h4>
                    <p className="text-[10px] font-black uppercase text-slate-400">Qtd: {item.quantity} • {item.roomOrigin || 'Lote Geral'}</p>
                  </div>
                  {stage.id !== LaundryStage.GUARDADO && (
                    <button onClick={() => {
                      const idx = stages.findIndex(s => s.id === stage.id);
                      moveLaundry(item.id, stages[idx+1].id);
                    }} className="p-2 text-slate-400 hover:text-blue-600"><ChevronRight size={20} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Entrada de Enxoval</h2>
              <button onClick={() => setShowAdd(false)}><X /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <input required placeholder="Tipo de Item (ex: Lençol)" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setNewItem({...newItem, type: e.target.value})} />
              <input type="number" placeholder="Quantidade" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
              <input placeholder="Quarto de Origem (opcional)" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setNewItem({...newItem, roomOrigin: e.target.value})} />
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl">Adicionar ao Sujo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaundryKanban;
