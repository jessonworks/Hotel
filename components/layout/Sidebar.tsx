
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { NAVIGATION_ITEMS } from '../../constants';
import { LogOut, Hotel } from 'lucide-react';
import { UserRole } from '../../types';

const Sidebar: React.FC = () => {
  const { currentUser, logout } = useStore();
  const location = useLocation();

  if (!currentUser) return null;

  // Lógica resiliente com verificação de segurança para evitar erro de .toLowerCase() em undefined
  const userRole = (currentUser?.role || '').toLowerCase();
  
  const filteredItems = NAVIGATION_ITEMS.filter(item => {
    // Se for admin, vê tudo
    if (userRole === 'admin') return true;
    
    // Mapeamento para aceitar termos em português ou inglês salvos no banco
    const isAdminItem = item.roles.some(r => r === UserRole.ADMIN);
    const isManagerItem = item.roles.some(r => r === UserRole.MANAGER);
    const isStaffItem = item.roles.some(r => r === UserRole.STAFF);

    if (userRole === 'manager' || userRole === 'gerente') {
      return isManagerItem || isStaffItem;
    }
    
    if (userRole === 'staff' || userRole === 'funcionario' || userRole === 'colaborador') {
      return isStaffItem;
    }

    // Fallback: se o cargo do usuário estiver explicitamente na lista do item
    return item.roles.includes(currentUser.role as any);
  });

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0F172A] text-white shrink-0 relative border-r border-white/5 h-screen sticky top-0 z-[50]">
        <div className="p-8 flex items-center gap-4 border-b border-white/5 bg-[#0F172A]">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-xl">
            <Hotel size={28} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tight leading-none">HospedaPro</span>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">OPERACIONAL</span>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredItems.map(item => {
            const isActive = location.pathname === (item.id === 'dashboard' ? '/' : `/${item.id}`);
            return (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/' : `/${item.id}`}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  isActive ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`}>{item.icon}</div>
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#0F172A]">
          <button onClick={logout} className="flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 w-full transition-all font-black text-xs uppercase tracking-widest">
            <LogOut size={20} />
            <span>SAIR</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TAB BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-white/10 flex items-center h-20 z-[9999] px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex w-full justify-between items-center h-full overflow-x-auto no-scrollbar py-2">
          {filteredItems.map(item => {
            const isActive = location.pathname === (item.id === 'dashboard' ? '/' : `/${item.id}`);
            return (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/' : `/${item.id}`}
                className={`flex flex-col items-center justify-center min-w-[60px] flex-1 gap-1 h-full transition-all ${
                  isActive ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <div className={`${isActive ? 'bg-blue-600 text-white p-2 rounded-xl shadow-lg' : 'text-slate-500'}`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-tighter text-center leading-none ${isActive ? 'text-white' : 'text-slate-500'}`}>
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
