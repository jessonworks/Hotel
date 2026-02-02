
import React from 'react';
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
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/rooms" element={<RoomList />} />
              <Route path="/cleaning" element={<CleaningTasks />} />
              <Route path="/guests" element={<GuestManagement />} />
              <Route path="/laundry" element={<LaundryKanban />} />
              <Route path="/inventory" element={<InventoryDashboard />} />
              <Route path="/team" element={<TeamManagement />} />
              <Route path="/financial" element={<FinancialDashboard />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
