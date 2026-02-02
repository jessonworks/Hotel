
import React, { useState } from 'react';
import { useStore } from '../../store';
import { UserRole } from '../../types';
import { UserPlus, Trash2, Shield, User as UserIcon, Hammer, X, Mail, UserCircle, Lock, CheckCircle } from 'lucide-react';

const TeamManagement: React.FC = () => {
  const { users, addUser, removeUser } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: UserRole.STAFF, password: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) return;
    addUser(formData);
    setShowAdd(false);
    setFormData({ fullName: '', email: '', role: UserRole.STAFF, password: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Equipe Operacional</h1>
          <p className="text-slate-500 font-medium font-sans">Controle de acessos e permissões dos colaboradores.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all transform active:scale-95"
        >
          <UserPlus size={20} /> ADICIONAR MEMBRO
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-6 text-xs font-black uppercase text-slate-400 tracking-widest">Colaborador</th>
                <th className="px-8 py-6 text-xs font-black uppercase text-slate-400 tracking-widest">Cargo</th>
                <th className="px-8 py-6 text-xs font-black uppercase text-slate-400 tracking-widest">Acesso</th>
                <th className="px-8 py-6 text-xs font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl overflow-hidden border-2 border-transparent">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                          user.fullName.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-lg leading-tight">{user.fullName}</span>
                        <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      user.role === UserRole.ADMIN ? 'bg-rose-100 text-rose-600' : 
                      user.role === UserRole.MANAGER ? 'bg-blue-100 text-blue-600' : 
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {user.role === UserRole.ADMIN ? <Shield size={14}/> : user.role === UserRole.MANAGER ? <UserIcon size={14}/> : <Hammer size={14}/>}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                      <CheckCircle size={16} /> Ativo no Sistema
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => removeUser(user.id)} 
                      disabled={user.id === 'u1'}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">Novo Colaborador</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-all"><X /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome Completo</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input required placeholder="Digite o nome..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input required type="email" placeholder="email@hotel.com" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input required type="text" placeholder="Senha inicial" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nível de Permissão</label>
                <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value={UserRole.STAFF}>Equipe Staff (Faxina/Lavanderia)</option>
                  <option value={UserRole.MANAGER}>Gerente (Operacional Total)</option>
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all transform active:scale-95 uppercase tracking-widest">Criar Conta</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
