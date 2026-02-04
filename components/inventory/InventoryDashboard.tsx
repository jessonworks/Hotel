
import React, { useState } from 'react';
import { useStore } from '../../store';
import { Package, Plus, X, ArrowUp, ArrowDown, DollarSign, Tag, AlertCircle } from 'lucide-react';

const InventoryDashboard: React.FC = () => {
  const { inventory, addInventory, updateInventory } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Insumo', quantity: 0, minStock: 5, price: 0, unitCost: 0 });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;
    await addInventory(newItem);
    setShowAdd(false);
    setNewItem({ name: '', category: 'Insumo', quantity: 0, minStock: 5, price: 0, unitCost: 0 });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Estoque de Insumos</h1>
          <p className="text-slate-500 font-medium font-sans">Controle de custos e reposição em tempo real.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all transform active:scale-95"
        >
          <Plus size={20} /> CADASTRAR LOTE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {inventory.map(item => (
          <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col group hover:shadow-2xl transition-all border-l-8 border-l-slate-900">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <Package size={28} />
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-slate-900">{item.quantity}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</p>
              </div>
            </div>
            
            <h3 className="font-black text-2xl text-slate-900 mb-2 truncate">{item.name}</h3>
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit mb-6">{item.category}</span>
            
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-50">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Custo Un.</p>
                <p className="font-black text-slate-900 text-lg">R$ {Number(item.unitCost).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Total Saldo</p>
                <p className="font-black text-emerald-600 text-lg">R$ {(item.quantity * item.unitCost).toFixed(2)}</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => updateInventory(item.id, 1)} 
                className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95"
              >
                <ArrowUp size={18} /> ENTRADA
              </button>
              <button 
                onClick={() => updateInventory(item.id, -1)} 
                className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all transform active:scale-95"
                disabled={item.quantity === 0}
              >
                <ArrowDown size={18} /> SAÍDA
              </button>
            </div>
            
            {item.quantity <= item.minStock && (
              <div className="mt-4 flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl animate-pulse">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-tighter">Reposição Necessária!</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">Novo Insumo</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome do Produto</label>
                <input required placeholder="Ex: Detergente 5L" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all" onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Quantidade</label>
                  <input required type="number" placeholder="0" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all" onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Estoque Mín.</label>
                  <input required type="number" placeholder="5" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all" onChange={e => setNewItem({...newItem, minStock: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Custo Unitário (R$)</label>
                <input required type="number" step="0.01" placeholder="0.00" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all" onChange={e => setNewItem({...newItem, unitCost: parseFloat(e.target.value)})} />
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-slate-800 transition-all transform active:scale-95">CONFIRMAR CADASTRO</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;
