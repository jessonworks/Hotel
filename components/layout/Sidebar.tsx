
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { NAVIGATION_ITEMS } from '../../constants';
import { LogOut, Hotel, Sparkles } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { currentUser, logout } = useStore();
  const location = useLocation();

  if (!currentUser) return null;

  const filteredItems = NAVIGATION_ITEMS.filter(item => 
    item.roles.includes(currentUser.role)
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950 text-white shrink-0 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-20%] w-[100%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-20%] w-[100%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="p-8 flex items-center gap-4 relative z-10">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-xl shadow-blue-600/30">
            <Hotel size={28} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tight leading-none">HospedaPro</span>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1 flex items-center gap-1">
              Premium <Sparkles size={8} />
            </span>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 relative z-10">
          {filteredItems.map(item => {
            const isActive = location.pathname === `/${item.id === 'dashboard' ? '' : item.id}`;
            return (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/' : `/${item.id}`}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative overflow-hidden ${
                  isActive 
                    ? 'bg-blue-600 text-white font-black shadow-2xl shadow-blue-900/40' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`}>
                  {item.icon}
                </div>
                <span className="text-sm tracking-tight">{item.label}</span>
                {isActive && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 relative z-10">
          <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 mb-6 group hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black overflow-hidden border-2 border-slate-900">
                {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover" /> : currentUser?.fullName.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black truncate">{currentUser.fullName}</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{currentUser.role}</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 w-full transition-all font-black text-xs uppercase tracking-widest"
          >
            <LogOut size={20} />
            <span>Encerrar Turno</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav - Styled like an iPhone dock */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-xl border border-white/10 flex justify-around items-center h-20 px-4 z-50 rounded-[2.5rem] shadow-2xl">
        {filteredItems.slice(0, 5).map(item => {
          const isActive = location.pathname === `/${item.id === 'dashboard' ? '' : item.id}`;
          return (
            <Link
              key={item.id}
              to={item.id === 'dashboard' ? '/' : `/${item.id}`}
              className={`flex flex-col items-center gap-1.5 flex-1 py-2 rounded-2xl transition-all ${
                isActive ? 'text-blue-400 scale-110' : 'text-slate-500'
              }`}
            >
              <div className={`${isActive ? 'bg-blue-600/10 p-2 rounded-xl' : ''}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: isActive ? 24 : 20 })}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;
