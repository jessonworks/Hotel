
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { UserRole } from './types';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import RoomList from './components/rooms/RoomList';
import CleaningTasks from './components/cleaning/CleaningTasks';
import GuestManagement from './components/guests/GuestManagement';
import LaundryKanban from './components/laundry/LaundryKanban';
import InventoryDashboard from './components/inventory/InventoryDashboard';
import FinancialDashboard from './components/financial/FinancialDashboard';
import Login from './components/auth/Login';
import TeamManagement from './components/auth/TeamManagement';
import { Hotel, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { currentUser, checkConnection, subscribeToChanges, syncData, isInitialLoading } = useStore();

  useEffect(() => {
    // Sincronização inicial e realtime
    if (currentUser) {
      syncData();
      const unsubscribe = subscribeToChanges();
      return () => unsubscribe();
    }
  }, [currentUser, syncData, subscribeToChanges]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(() => checkConnection(), 60000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  if (!currentUser) {
    return <Login />;
  }

  // Tela de Carregamento Inicial
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
        <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-2xl mb-8 animate-bounce">
          <Hotel size={64} className="text-white" />
        </div>
        <div className="flex items-center gap-3 text-white font-black uppercase tracking-[0.3em] text-sm">
          <Loader2 className="animate-spin text-blue-400" size={24} />
          Sincronizando Dados...
        </div>
      </div>
    );
  }

  const roleStr = (currentUser?.role || '').toLowerCase();
  const isAdmin = roleStr.includes('admin');
  const isManager = roleStr.includes('gerente') || roleStr.includes('manager') || isAdmin;

  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row min-h-screen w-full bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 custom-scrollbar">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cleaning" element={<CleaningTasks />} />
              <Route path="/laundry" element={<LaundryKanban />} />
              <Route path="/rooms" element={isManager ? <RoomList /> : <Navigate to="/" />} />
              <Route path="/guests" element={isManager ? <GuestManagement /> : <Navigate to="/" />} />
              <Route path="/inventory" element={isManager ? <InventoryDashboard /> : <Navigate to="/" />} />
              <Route path="/team" element={isManager ? <TeamManagement /> : <Navigate to="/" />} />
              <Route path="/financial" element={isAdmin ? <FinancialDashboard /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
