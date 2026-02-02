
import React, { useState } from 'react';
import { useStore } from '../../store';
import { 
  Bed, 
  Clock, 
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Send,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { RoomStatus, UserRole, CleaningStatus } from '../../types';

const Dashboard: React.FC = () => {
  const { rooms, tasks, inventory, currentUser, announcements, addAnnouncement, transactions } = useStore();
  const [newMsg, setNewMsg] = useState('');

  const isStaff = currentUser?.role === UserRole.STAFF;
  
  // Cálculo de DRE: Receitas totais vs Despesas operacionais (estoque)
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const realProfit = totalIncome - totalExpense;

  const stats = [
    { 
      label: isStaff ? 'Minhas Tarefas' : 'Ocupação', 
      value: isStaff ? tasks.filter(t => t.status === CleaningStatus.PENDENTE && t.assignedTo === currentUser?.id).length : rooms.filter(r => r.status === RoomStatus.OCUPADO).length, 
      icon: <Bed />, 
      color: 'bg-blue-600' 
    },
    { 
      label: 'Aprovação Pendente', 
      value: tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO).length, 
      icon: <Clock />, 
      color: 'bg-amber-500' 
    },
    { 
      label: 'Lucro Operacional', 
      value: `R$ ${realProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
      icon: <TrendingUp />, 
      color: 'bg-emerald-500' 
    },
    { 
      label: 'Itens Críticos', 
      value: inventory.filter(i => i.quantity <= i.minStock).length, 
      icon: <AlertCircle />, 
      color: 'bg-rose-500' 
    },
  ];

  const chartData = [
    { name: 'Seg', ocupacao: 65 }, { name: 'Ter', ocupacao: 58 }, { name: 'Qua', ocupacao: 72 }, 
    { name: 'Qui', ocupacao: 85 }, { name: 'Sex', ocupacao: 94 }, { name: 'Sab', ocupacao: 98 }, { name: 'Dom', ocupacao: 90 },
  ];

  const handleSendAnnouncement = () => {
    if (!newMsg.trim()) return;
    addAnnouncement(newMsg, 'normal');
    setNewMsg('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">HospedaPro Executive</h1>
        <p className="text-slate-500 font-medium">Bem-vindo, {currentUser?.fullName}. Acompanhe sua operação em tempo real.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group active:scale-95">
            <div className={`${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:rotate-6 transition-transform`}>
              {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 28 })}
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="font-black text-xl text-slate-900 mb-8">Performance da Unidade</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="ocupacao" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[550px]">
          <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="text-blue-600" size={24} />
            <h3 className="font-black text-xl">Comunicados Internos</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
            {announcements.map(msg => (
              <div key={msg.id} className={`p-6 rounded-[1.8rem] border ${msg.priority === 'high' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{msg.authorName}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-sm text-slate-600 font-bold leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
          {currentUser?.role !== UserRole.STAFF && (
            <div className="relative mt-auto">
              <textarea 
                value={newMsg} onChange={e => setNewMsg(e.target.value)}
                placeholder="Enviar novo comunicado..."
                className="w-full p-5 pr-14 bg-slate-50 border-none rounded-[1.8rem] text-sm font-bold focus:ring-2 focus:ring-blue-500 resize-none h-28"
              />
              <button onClick={handleSendAnnouncement} className="absolute right-4 bottom-4 p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-90"><Send size={20} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
