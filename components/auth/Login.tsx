
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { UserRole } from '../../types';
import { Hotel, Mail, Lock, AlertCircle, Loader2, RefreshCw, WifiOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isSupabaseConnected, checkConnection, connectionError } = useStore();
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
      setError('O servidor está offline. Verifique a conexão do seu celular.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const success = await login(email, password);
      if (!success) {
        setError('E-mail ou senha incorretos.');
      }
    } catch (err) {
      setError('Erro de comunicação com o banco de dados.');
    } finally {
      setLoading(false);
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
          <p className="text-slate-500 font-medium mt-2">Acesso Restrito ao Sistema.</p>
        </div>

        {!isSupabaseConnected && (
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-3 text-amber-700 text-sm font-black uppercase tracking-tight">
              <WifiOff size={20} />
              Servidor Desconectado
            </div>
            <p className="text-[10px] text-amber-600 font-bold leading-relaxed">
              {connectionError || "Não foi possível alcançar o banco de dados. Se este é o primeiro acesso, faça um 'Redeploy' na Vercel para carregar as chaves."}
            </p>
            <button 
              onClick={() => checkConnection()}
              className="w-full py-2 bg-amber-600 text-white text-[10px] font-black rounded-xl flex items-center justify-center gap-2 hover:bg-amber-700 transition-all"
            >
              <RefreshCw size={12} /> TENTAR RECONECTAR
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hotel.com"
                disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:opacity-50" 
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
                disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:opacity-50" 
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading || !isSupabaseConnected}
            className="w-full py-5 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'ACESSAR AGORA'}
          </button>
        </form>

        <div className="pt-4 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isSupabaseConnected ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'}`}></span>
            {isSupabaseConnected ? 'Sincronizado com Nuvem' : 'Banco de Dados Offline'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
