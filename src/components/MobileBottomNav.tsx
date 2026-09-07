import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  FileSpreadsheet,
  Menu,
  Plus,
} from 'lucide-react';
import { useMess, AppNavTab } from '../context/MessContext';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const { activeTab, setActiveTab, setIsExpenseModalOpen, setEditingExpense, currentMonth } = useMess();

  const handleOpenAddExpense = () => {
    if (currentMonth.status === 'finalized') return;
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  return (
    <nav
      aria-label="Mobile navigation bar"
      className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 px-2 py-1.5 shadow-2xl safe-area-bottom"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-blue-400' : 'text-slate-400'}`} />
          <span>Dashboard</span>
        </button>

        {/* Expenses */}
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-blue-400 font-bold bg-blue-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ReceiptText className={`w-5 h-5 mb-0.5 ${activeTab === 'transactions' ? 'text-blue-400' : 'text-slate-400'}`} />
          <span>Expenses</span>
        </button>

        {/* Center Quick Add Action Button */}
        <button
          type="button"
          onClick={handleOpenAddExpense}
          disabled={currentMonth.status === 'finalized'}
          title="Add Expense"
          className="flex flex-col items-center justify-center -mt-4 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 group-hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 ring-4 ring-slate-900 transition-all active:scale-95">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] text-blue-300 font-semibold mt-0.5">Add</span>
        </button>

        {/* Deposits / Contributions */}
        <button
          type="button"
          onClick={() => setActiveTab('contributions')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer ${
            activeTab === 'contributions'
              ? 'text-emerald-400 font-bold bg-emerald-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className={`w-5 h-5 mb-0.5 ${activeTab === 'contributions' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Deposits</span>
        </button>

        {/* More / Full Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5 mb-0.5 text-slate-400" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
};
