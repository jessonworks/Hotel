
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { NAVIGATION_ITEMS } from '../../constants';
import { LogOut, Hotel } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { currentUser, logout } = useStore();
  const location = useLocation();

  if (!currentUser) return null;

  const filteredItems = NAVIGATION_ITEMS.filter(item => 
    item.roles.includes(currentUser.role)
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-20%] w-[100%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="p-8 flex items-center gap-4 relative z-10">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-xl shadow-blue-600/30">
            <Hotel size={28} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tight leading-none text-white">HospedaPro</span>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">Premium</span>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 relative z-10 overflow-y-auto no-scrollbar">
          {filteredItems.map(item => {
            const isActive = location.pathname === `/${item.id === 'dashboard' ? '' : item.id}`;
            return (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/' : `/${item.id}`}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative ${
                  isActive ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`}>{item.icon}</div>
                <span className="text-sm tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 relative z-10">
          <button onClick={logout} className="flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 w-full transition-all font-black text-xs uppercase tracking-widest">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-slate-950/95 backdrop-blur-2xl border border-white/10 flex items-center h-20 z-50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="flex w-full overflow-x-auto no-scrollbar px-2">
          {filteredItems.map(item => {
            const isActive = location.pathname === `/${item.id === 'dashboard' ? '' : item.id}`;
            return (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/' : `/${item.id}`}
                className={`flex flex-col items-center justify-center flex-1 min-w-[64px] gap-1 px-2 h-full transition-all ${
                  isActive ? 'text-blue-400 scale-110' : 'text-slate-500'
                }`}
              >
                <div className={`${isActive ? 'bg-blue-600/20 p-2 rounded-xl text-blue-400' : 'text-slate-500'}`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-tighter whitespace-nowrap text-center ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
