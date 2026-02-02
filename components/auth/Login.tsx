
import React, { useState } from 'react';
import { useStore } from '../../store';
import { UserRole } from '../../types';
import { Hotel, ShieldCheck, User, Hammer, Mail, Lock, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login, quickLogin } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email, password);
    if (!success) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl mb-6 shadow-xl shadow-blue-600/30">
            <Hotel size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">HospedaPro</h1>
          <p className="text-slate-500 font-medium mt-2">Gestão hoteleira inteligente.</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@hotel.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
              />
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all transform active:scale-95">
            ENTRAR NO SISTEMA
          </button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-300 font-black tracking-widest">Acesso Rápido Demo</span></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => quickLogin(UserRole.ADMIN)} className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors group">
            <ShieldCheck className="text-slate-300 group-hover:text-blue-600" size={24} />
            <span className="text-[9px] font-black uppercase text-slate-400">Admin</span>
          </button>
          <button onClick={() => quickLogin(UserRole.MANAGER)} className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors group">
            <User className="text-slate-300 group-hover:text-blue-600" size={24} />
            <span className="text-[9px] font-black uppercase text-slate-400">Gerente</span>
          </button>
          <button onClick={() => quickLogin(UserRole.STAFF)} className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors group">
            <Hammer className="text-slate-300 group-hover:text-blue-600" size={24} />
            <span className="text-[9px] font-black uppercase text-slate-400">Staff</span>
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Powered by HospedaPro Architecture</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
