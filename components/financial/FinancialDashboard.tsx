
import React from 'react';
import { useStore } from '../../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, FileText, Wallet, ShoppingCart } from 'lucide-react';

const FinancialDashboard: React.FC = () => {
  const { transactions, guests } = useStore();

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Agrupar transações por dia para o gráfico
  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
    return {
      name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      receita: dayTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0),
      despesa: dayTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0)
    };
  });

  const categoryData = [
    { name: 'Reservas', value: totalIncome },
    { name: 'Insumos', value: transactions.filter(t => t.category === 'INVENTORY').reduce((acc, t) => acc + t.amount, 0) },
    { name: 'Lavanderia', value: transactions.filter(t => t.category === 'LAUNDRY').reduce((acc, t) => acc + t.amount, 0) },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">DRE Operacional</h1>
          <p className="text-slate-500 font-medium">Fluxo de caixa baseado em consumo e reservas.</p>
        </div>
        <button className="hidden sm:flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl">
          <FileText size={20} /> Relatório Mensal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/30 relative overflow-hidden group">
           <div className="relative z-10">
             <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-2">Receita Total</p>
             <h3 className="text-4xl font-black">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
             <div className="mt-6 flex items-center gap-2 text-emerald-100 font-bold text-sm bg-emerald-500/30 w-fit px-3 py-1 rounded-full">
                <ArrowUpRight size={16} /> +{transactions.filter(t => t.type === 'INCOME').length} entradas
             </div>
           </div>
           <DollarSign className="absolute -right-6 -bottom-6 text-white opacity-10" size={160} />
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Custos Consumidos</p>
           <h3 className="text-4xl font-black text-slate-900">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
           <div className="mt-6 flex items-center gap-2 text-rose-500 font-bold text-sm bg-rose-50 w-fit px-3 py-1 rounded-full border border-rose-100">
              <ArrowDownLeft size={16} /> Operação e Insumos
           </div>
           <ShoppingCart className="absolute -right-6 -bottom-6 text-slate-100 opacity-50" size={140} />
        </div>

        <div className={`p-8 rounded-[2.5rem] text-white shadow-2xl transition-all ${netProfit >= 0 ? 'bg-slate-900 shadow-slate-900/30' : 'bg-rose-600 shadow-rose-600/30'}`}>
           <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-2">Lucro do Período</p>
           <h3 className="text-4xl font-black">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
           <div className="mt-6 inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl text-sm font-black uppercase tracking-tighter">
              Margem: {margin.toFixed(1)}%
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <h3 className="font-black text-xl text-slate-900 mb-8 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Movimentação dos Últimos 7 Dias
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRec)" />
                <Area type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
           <h3 className="font-black text-xl text-slate-900 mb-6">Últimas Transações</h3>
           <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{t.description}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-black text-sm whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-12 text-slate-300">Nenhuma movimentação.</div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
