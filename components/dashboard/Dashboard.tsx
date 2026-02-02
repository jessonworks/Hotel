
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { 
  Bed, 
  Clock, 
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Send,
  CheckCircle2,
  Sparkles,
  Zap,
  ChevronRight,
  Brush,
  Wind
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
import { RoomStatus, UserRole, CleaningStatus, LaundryStage } from '../../types';

const Dashboard: React.FC = () => {
  const { rooms, tasks, currentUser, announcements, addAnnouncement, transactions, laundry } = useStore();
  const [newMsg, setNewMsg] = useState('');

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  // Prontidão do Hotel
  const totalRooms = rooms.length;
  const readyRooms = rooms.filter(r => r.status === RoomStatus.DISPONIVEL).length;
  const readinessPercentage = Math.round((readyRooms / totalRooms) * 100);

  // Dados Financeiros (Só para Gestão)
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const realProfit = totalIncome - totalExpense;

  // Dados Operacionais (Para Staff)
  const pendingTasksCount = tasks.filter(t => t.status === CleaningStatus.PENDENTE).length;
  const inProgressTasks = tasks.filter(t => t.status === CleaningStatus.EM_PROGRESSO).length;
  const cleanLaundryCount = laundry.filter(l => l.stage === LaundryStage.GUARDADO).reduce((acc, l) => acc + l.quantity, 0);
  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO).length;

  // Definição dos Stats baseada no cargo
  const stats = isAdminOrManager ? [
    { label: 'Ocupação Atual', value: `${rooms.filter(r => r.status === RoomStatus.OCUPADO).length} Unid`, icon: <Bed />, color: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/30' },
    { label: 'Auditorias Faxina', value: pendingAudits, icon: <Clock />, color: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
    { label: 'Lucro Previsto', value: `R$ ${realProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: <TrendingUp />, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30' },
    { label: 'Avisos Ativos', value: announcements.length, icon: <AlertCircle />, color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/30' },
  ] : [
    { label: 'Faxinas Pendentes', value: pendingTasksCount, icon: <Brush />, color: 'from-rose-500 to-orange-500', shadow: 'shadow-rose-500/30' },
    { label: 'Em Execução', value: inProgressTasks, icon: <Clock />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
    { label: 'Enxoval Limpo', value: cleanLaundryCount, icon: <Wind />, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30' },
    { label: 'Mural', value: announcements.length, icon: <MessageSquare />, color: 'from-slate-700 to-slate-900', shadow: 'shadow-slate-500/30' },
  ];

  const handleSendAnnouncement = () => {
    if (!newMsg.trim()) return;
    addAnnouncement(newMsg, 'normal');
    setNewMsg('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
            {isAdminOrManager ? 'Visão Geral' : 'Meu Plantão'}
          </h1>
          <p className="text-slate-500 font-bold font-sans text-lg">Hotel Unidade Lapa • {isAdminOrManager ? 'Gestão de Resultados' : 'Operação de Campo'}</p>
        </div>
      </header>

      {/* Progress & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Vertical Progress Card */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Prontidão do Hotel</p>
              <h4 className="text-3xl font-black text-slate-900 mb-6">{readinessPercentage}% Pronto</h4>
           </div>
           <div className="flex-1 flex flex-col justify-center items-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path className="text-slate-50" strokeDasharray="100, 100" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500 transition-all duration-1000" strokeDasharray={`${readinessPercentage}, 100`} strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black text-slate-900">{readyRooms}/{totalRooms}</span>
                </div>
              </div>
           </div>
           <p className="text-[10px] text-slate-400 font-bold text-center mt-6">QUARTOS DISPONÍVEIS AGORA</p>
        </div>

        {/* Horizontal Stats */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all group hover:-translate-y-1 hover:shadow-xl active:scale-95 flex flex-col justify-between">
              <div className={`bg-gradient-to-br ${stat.color} w-10 h-10 md:w-16 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center text-white mb-4 md:mb-6 shadow-2xl ${stat.shadow}`}>
                {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 28 })}
              </div>
              <div>
                <p className="text-slate-400 text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] leading-none mb-2">{stat.label}</p>
                <p className="text-xl md:text-3xl font-black text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-black text-2xl text-slate-900 flex items-center gap-3">
                {isAdminOrManager ? <TrendingUp size={24} className="text-blue-600" /> : <Bed size={24} className="text-blue-600" />} 
                {isAdminOrManager ? 'Histórico de Ocupação' : 'Status das Unidades'}
              </h3>
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                <span className="text-[10px] font-black uppercase text-slate-400">{isAdminOrManager ? 'Taxa de Check-in' : 'Quartos'}</span>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={isAdminOrManager ? [
                  { name: 'Seg', ocupacao: 65 }, { name: 'Ter', ocupacao: 58 }, { name: 'Qua', ocupacao: 72 }, 
                  { name: 'Qui', ocupacao: 85 }, { name: 'Sex', ocupacao: 94 }, { name: 'Sab', ocupacao: 98 }, { name: 'Dom', ocupacao: 90 },
                ] : [
                  { name: 'Disponível', valor: rooms.filter(r => r.status === RoomStatus.DISPONIVEL).length },
                  { name: 'Ocupado', valor: rooms.filter(r => r.status === RoomStatus.OCUPADO).length },
                  { name: 'Sujo', valor: rooms.filter(r => r.status === RoomStatus.SUJO).length },
                  { name: 'Limpeza', valor: rooms.filter(r => r.status === RoomStatus.LIMPANDO).length },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey={isAdminOrManager ? "ocupacao" : "valor"} fill="#2563eb" radius={[12, 12, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex flex-col h-[600px] border border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-blue-500" size={28} />
              <h3 className="font-black text-2xl text-white">Mural da Equipe</h3>
            </div>
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Live</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
            {announcements.map(msg => (
              <div key={msg.id} className={`p-6 rounded-[2rem] border transition-all ${msg.priority === 'high' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800 border-slate-700'} hover:border-blue-500/50`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${msg.priority === 'high' ? 'text-rose-400' : 'text-blue-400'}`}>{msg.authorName}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-sm text-slate-300 font-bold leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-auto">
            <textarea 
              value={newMsg} onChange={e => setNewMsg(e.target.value)}
              placeholder="Postar comunicado..."
              className="w-full p-5 pr-14 bg-slate-800 border-slate-700 text-white placeholder-slate-500 rounded-[1.8rem] text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-32"
            />
            <button onClick={handleSendAnnouncement} className="absolute right-4 bottom-4 p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-90">
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
