import React, { useState } from 'react';
import { MessProvider, useMess } from './context/MessContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { ContributionsView } from './components/ContributionsView';
import { MembersView } from './components/MembersView';
import { SettlementView } from './components/SettlementView';
import { ReportsView } from './components/ReportsView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ExpenseModal } from './components/ExpenseModal';
import { ContributionModal } from './components/ContributionModal';
import { LoginScreen } from './components/LoginScreen';
import { MobileBottomNav } from './components/MobileBottomNav';

const AppContent: React.FC = () => {
  const { activeTab, appSettings, currentUser } = useMess();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If login protection is enabled and member has not logged in, show Login Screen
  if (appSettings.auth?.enabled && !currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Header
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          onOpenMobile={() => setMobileSidebarOpen(true)}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-24 lg:pb-12">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'transactions' && <TransactionsView />}
            {activeTab === 'contributions' && <ContributionsView />}
            {activeTab === 'members' && <MembersView />}
            {activeTab === 'settlement' && <SettlementView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'categories' && <SettingsView initialTab="categories" />}
            {activeTab === 'history' && <HistoryView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav onOpenMenu={() => setMobileSidebarOpen(true)} />
      </div>

      {/* Global Transaction Modals */}
      <ExpenseModal />
      <ContributionModal />
    </div>
  );
};

export default function App() {
  return (
    <MessProvider>
      <AppContent />
    </MessProvider>
  );
}
