
import React, { useState } from 'react';
import { useStore } from '../../store';
import { 
  Bed, 
  Clock, 
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Send,
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

  const totalRooms = rooms.length;
  const readyRooms = rooms.filter(r => r.status === RoomStatus.DISPONIVEL).length;
  const readinessPercentage = totalRooms > 0 ? Math.round((readyRooms / totalRooms) * 100) : 0;

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const realProfit = totalIncome - totalExpense;

  const pendingTasksCount = tasks.filter(t => t.status === CleaningStatus.PENDENTE).length;
  const inProgressTasks = tasks.filter(t => t.status === CleaningStatus.EM_PROGRESSO).length;
  const cleanLaundryCount = laundry.filter(l => l.stage === LaundryStage.GUARDADO).reduce((acc, l) => acc + l.quantity, 0);
  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO).length;

  const stats = isAdminOrManager ? [
    { label: 'Ocupação', value: `${rooms.filter(r => r.status === RoomStatus.OCUPADO).length}`, icon: <Bed size={20}/>, color: 'bg-blue-600', shadow: 'shadow-blue-500/20' },
    { label: 'Auditoria', value: pendingAudits, icon: <Clock size={20}/>, color: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
    { label: 'Lucro', value: `R$ ${realProfit >= 1000 ? (realProfit/1000).toFixed(1) + 'k' : realProfit.toFixed(0)}`, icon: <TrendingUp size={20}/>, color: 'bg-emerald-600', shadow: 'shadow-emerald-500/20' },
    { label: 'Avisos', value: announcements.length, icon: <AlertCircle size={20}/>, color: 'bg-rose-600', shadow: 'shadow-rose-500/20' },
  ] : [
    { label: 'Faxinas', value: pendingTasksCount, icon: <Brush size={20}/>, color: 'bg-rose-600', shadow: 'shadow-rose-500/20' },
    { label: 'Executando', value: inProgressTasks, icon: <Clock size={20}/>, color: 'bg-blue-600', shadow: 'shadow-blue-500/20' },
    { label: 'Enxoval', value: cleanLaundryCount, icon: <Wind size={20}/>, color: 'bg-emerald-600', shadow: 'shadow-emerald-500/20' },
    { label: 'Mural', value: announcements.length, icon: <MessageSquare size={20}/>, color: 'bg-slate-800', shadow: 'shadow-slate-500/20' },
  ];

  const handleSendAnnouncement = () => {
    if (!newMsg.trim()) return;
    addAnnouncement(newMsg, 'normal');
    setNewMsg('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20 md:pb-12 px-1">
      <header className="px-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
          {isAdminOrManager ? 'Gestão' : 'Meu Plantão'}
        </h1>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Unidade Lapa • Real-Time</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg ${stat.shadow}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-xl md:text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6 px-1">
           <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
             <TrendingUp size={18} className="text-blue-600" /> Histórico Operacional
           </h3>
        </div>
        <div className="h-48 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={isAdminOrManager ? [
              { name: 'S', v: 65 }, { name: 'T', v: 58 }, { name: 'Q', v: 72 }, 
              { name: 'Q', v: 85 }, { name: 'S', v: 94 }, { name: 'S', v: 98 }, { name: 'D', v: 90 },
            ] : [
              { name: 'Disp', v: rooms.filter(r => r.status === RoomStatus.DISPONIVEL).length },
              { name: 'Ocup', v: rooms.filter(r => r.status === RoomStatus.OCUPADO).length },
              { name: 'Sujo', v: rooms.filter(r => r.status === RoomStatus.SUJO).length },
              { name: 'Limp', v: rooms.filter(r => r.status === RoomStatus.LIMPANDO).length },
            ]}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
              <YAxis hide />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="v" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-slate-800 flex flex-col min-h-[400px]">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="text-blue-500" size={20} />
          <h3 className="font-black text-lg text-white">Mural</h3>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 custom-scrollbar">
          {announcements.map(msg => (
            <div key={msg.id} className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">{msg.authorName}</span>
                <span className="text-[8px] text-slate-500 font-bold">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-xs text-slate-300 font-bold leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>
        <div className="relative">
          <textarea 
            value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Comunicado..."
            className="w-full p-4 pr-12 bg-slate-800 border-slate-700 text-white placeholder-slate-500 rounded-2xl text-xs font-bold focus:ring-1 focus:ring-blue-500 resize-none h-20"
          />
          <button onClick={handleSendAnnouncement} className="absolute right-3 bottom-3 p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-90">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
