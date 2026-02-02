
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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Hotel size={24} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">HospedaPro</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {filteredItems.map(item => {
            const isActive = location.pathname === `/${item.id === 'dashboard' ? '' : item.id}`;
            return (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/' : `/${item.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/50' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 w-full transition-all"
          >
            <LogOut size={20} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-2 z-50">
        {filteredItems.slice(0, 5).map(item => {
          const isActive = location.pathname === `/${item.id === 'dashboard' ? '' : item.id}`;
          return (
            <Link
              key={item.id}
              to={item.id === 'dashboard' ? '/' : `/${item.id}`}
              className={`flex flex-col items-center gap-1 flex-1 py-1 rounded-lg ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;
