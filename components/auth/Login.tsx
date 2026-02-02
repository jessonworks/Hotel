
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { UserRole } from '../../types';
// Added Play to fix the "Cannot find name 'Play'" error
import { Hotel, Mail, Lock, AlertCircle, Loader2, RefreshCw, WifiOff, Shield, Hammer, User, Play } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isSupabaseConnected, checkConnection, enterDemoMode } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConnected) {
      setError('O servidor está offline. Tente o Modo Demo abaixo.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (!success) setError('E-mail ou senha incorretos.');
    } catch (err) {
      setError('Erro de comunicação com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[95vh]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl mb-6 shadow-xl shadow-blue-600/30">
            <Hotel size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">HospedaPro</h1>
          <p className="text-slate-500 font-medium mt-3">Gestão Inteligente Hoteleira</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-slate-900 text-xs font-black uppercase tracking-widest">
            <Play className="fill-blue-600 text-blue-600" size={16} />
            Acesso Rápido (Demo)
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => enterDemoMode(UserRole.ADMIN)}
              className="py-4 bg-slate-900 text-white font-black rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-blue-600 transition-all shadow-lg uppercase tracking-widest text-[9px]"
            >
              <Shield size={18} /> GESTOR
            </button>
            <button 
              onClick={() => enterDemoMode(UserRole.STAFF)}
              className="py-4 bg-blue-600 text-white font-black rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-slate-900 transition-all shadow-lg uppercase tracking-widest text-[9px]"
            >
              <Hammer size={18} /> ADMIN STAFF
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">Logar como Colaborador:</p>
          <div className="grid grid-cols-2 gap-2">
             <button 
                onClick={() => enterDemoMode(UserRole.STAFF, { id: 'st-1', fullName: 'Lúcia (Staff)', role: UserRole.STAFF })}
                className="py-3 bg-white border border-slate-200 text-slate-700 font-black rounded-xl text-[9px] uppercase tracking-tighter hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center gap-2"
             >
                <User size={14} /> Lúcia
             </button>
             <button 
                onClick={() => enterDemoMode(UserRole.STAFF, { id: 'st-2', fullName: 'Roberto (Staff)', role: UserRole.STAFF })}
                className="py-3 bg-white border border-slate-200 text-slate-700 font-black rounded-xl text-[9px] uppercase tracking-tighter hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center gap-2"
             >
                <User size={14} /> Roberto
             </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-slate-400 bg-white px-4">OU NUVEM</div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@hotel.com" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-xl hover:bg-slate-800 transition-all transform active:scale-95 flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : 'CONECTAR NA NUVEM'}
          </button>
        </form>

        <button onClick={() => checkConnection()} className="w-full py-2 text-slate-400 text-[9px] font-black flex items-center justify-center gap-2 hover:text-blue-600 transition-all uppercase tracking-widest">
          <RefreshCw size={12} /> Atualizar Conexão
        </button>
      </div>
    </div>
  );
};

export default Login;
