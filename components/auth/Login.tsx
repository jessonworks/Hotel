
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { UserRole } from '../../types';
import { Hotel, Mail, Lock, AlertCircle, Loader2, RefreshCw, Shield, Hammer, User, Play, ChevronRight } from 'lucide-react';

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
    setLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (!success) {
        if (!isSupabaseConnected) {
          setError('Sem conexão com a nuvem. Verifique suas chaves na Vercel.');
        } else {
          setError('E-mail ou senha incorretos conforme banco de dados.');
        }
      }
    } catch (err) {
      setError('Erro de comunicação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    // Tenta logar automaticamente se estiver online, senão entra em demo
    if (isSupabaseConnected) {
      setLoading(true);
      const ok = await login(e, p);
      if (!ok) enterDemoMode(e.includes('admin') ? UserRole.ADMIN : UserRole.STAFF);
      setLoading(false);
    } else {
      enterDemoMode(e.includes('admin') ? UserRole.ADMIN : UserRole.STAFF);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>

      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-500 relative z-10 border border-white/20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 text-white rounded-3xl mb-6 shadow-2xl shadow-blue-900/20">
            <Hotel size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">HospedaPro</h1>
          <p className="text-slate-500 font-bold mt-3 text-sm uppercase tracking-widest">Gestão de Hotéis & Pousadas</p>
        </div>

        {/* Usuários Reais Detectados no Banco */}
        <div className="bg-slate-50/80 border border-slate-200 p-6 rounded-3xl space-y-4 shadow-inner">
          <div className="flex items-center gap-3 text-slate-900 text-[10px] font-black uppercase tracking-[0.2em]">
            <Play className="fill-blue-600 text-blue-600" size={14} />
            Acesso Rápido ao Banco
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => handleQuickLogin('admin@hotel.com', 'hotel2024')}
              className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between hover:bg-blue-600 transition-all group shadow-lg"
            >
              <div className="flex items-center gap-3 text-left">
                <Shield size={18} className="text-blue-400 group-hover:text-white" />
                <div>
                   <p className="text-[10px] font-black uppercase leading-none mb-1 opacity-60">ADMINISTRADOR</p>
                   <p className="font-bold text-sm">admin@hotel.com</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            <button 
              onClick={() => handleQuickLogin('gerente@hotel.com', 'gerente123')}
              className="p-4 bg-white border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-3 text-left">
                <User size={18} className="text-slate-400 group-hover:text-blue-600" />
                <div>
                   <p className="text-[10px] font-black uppercase leading-none mb-1 opacity-60">GERENTE</p>
                   <p className="font-bold text-sm">gerente@hotel.com</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            <button 
              onClick={() => handleQuickLogin('limpeza1@hotel.com', '123456')}
              className="p-4 bg-white border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-3 text-left">
                <Hammer size={18} className="text-slate-400 group-hover:text-blue-600" />
                <div>
                   <p className="text-[10px] font-black uppercase leading-none mb-1 opacity-60">EQUIPE LIMPEZA</p>
                   <p className="font-bold text-sm">limpeza1@hotel.com</p>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em] text-slate-300 bg-white/0 px-4">Entrada Manual</div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-black animate-shake">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Seu e-mail" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-xl hover:bg-blue-600 transition-all transform active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
            {loading ? <Loader2 className="animate-spin" /> : 'Acessar Nuvem'}
          </button>
        </form>

        <button onClick={() => checkConnection()} className="w-full py-2 text-slate-300 text-[10px] font-black flex items-center justify-center gap-2 hover:text-blue-600 transition-all uppercase tracking-[0.2em]">
          <RefreshCw size={12} /> {isSupabaseConnected ? 'Sincronizado' : 'Tentar Reconectar'}
        </button>
      </div>
    </div>
  );
};

export default Login;
