
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

const App: React.FC = () => {
  const { currentUser, checkConnection } = useStore();

  useEffect(() => {
    // Verifica a conexão com o Supabase na inicialização
    checkConnection();
  }, [checkConnection]);

  if (!currentUser) {
    return <Login />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isManager = currentUser.role === UserRole.MANAGER || isAdmin;

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <Routes>
              {/* Rota Principal */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Rotas de Operação (Acesso Geral) */}
              <Route path="/cleaning" element={<CleaningTasks />} />
              <Route path="/laundry" element={<LaundryKanban />} />

              {/* Rotas restritas para Gerência (Manager/Admin) */}
              <Route path="/rooms" element={isManager ? <RoomList /> : <Navigate to="/" />} />
              <Route path="/guests" element={isManager ? <GuestManagement /> : <Navigate to="/" />} />
              <Route path="/inventory" element={isManager ? <InventoryDashboard /> : <Navigate to="/" />} />
              <Route path="/team" element={isManager ? <TeamManagement /> : <Navigate to="/" />} />
              
              {/* Rota restrita exclusiva para Admin */}
              <Route path="/financial" element={isAdmin ? <FinancialDashboard /> : <Navigate to="/" />} />

              {/* Fallback para rotas inexistentes */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
