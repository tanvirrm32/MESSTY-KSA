import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  FileSpreadsheet,
  Tags,
  History,
  Settings,
  X,
  Building2,
  LogOut,
} from 'lucide-react';
import { useMess, AppNavTab } from '../context/MessContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: AppNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeTab, setActiveTab, appSettings, currentUser, switchMember, logoutMember } = useMess();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Expenses', icon: ReceiptText },
    { id: 'contributions', label: 'Contributions', icon: Wallet },
    { id: 'reports', label: 'Reports & Statements', icon: FileSpreadsheet },
    { id: 'history', label: 'Monthly History', icon: History },
    { id: 'settings', label: 'Settings & Data', icon: Settings },
  ];

  const handleNavClick = (id: AppNavTab) => {
    setActiveTab(id);
    onCloseMobile();
  };

  const content = (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs ring-2 ring-slate-800">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight truncate">
              {appSettings.appName}
            </h1>
            <p className="text-[10px] text-slate-400 truncate">
              {appSettings.appSubtitle || 'Mess Ledger'}
            </p>
          </div>
        </div>

        {/* Mobile close */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav
        className="flex-1 p-3.5 space-y-1 overflow-y-auto overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logged in User & Session Status */}
      <div className="mx-3.5 mb-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
          <span>Active Session</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                currentUser === 'tanvir-rana'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : currentUser === 'zilam-jahid'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {currentUser === 'tanvir-rana' ? 'TR' : currentUser === 'zilam-jahid' ? 'ZJ' : 'G'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {currentUser === 'tanvir-rana'
                  ? 'Tanvir Rana'
                  : currentUser === 'zilam-jahid'
                  ? 'Zilam Jahid'
                  : 'Guest User'}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentUser ? '50% Ratio' : 'Viewer'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (currentUser === 'tanvir-rana') switchMember('zilam-jahid');
                else if (currentUser === 'zilam-jahid') switchMember('tanvir-rana');
                else logoutMember();
              }}
              title="Switch User Profile"
              className="text-[10px] px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Switch
            </button>
            <button
              type="button"
              onClick={logoutMember}
              title="Log Out (লগআউট)"
              className="p-1 rounded bg-slate-700/80 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Members Ratio Indicator */}
      <div className="mx-3.5 mb-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-750 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Tanvir Rana
          </span>
          <span className="font-mono text-[10px]">50%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Zilam Jahid
          </span>
          <span className="font-mono text-[10px]">50%</span>
        </div>
      </div>

      {/* Version Footer */}
      <div className="px-5 py-3 border-t border-slate-800 text-[10px] opacity-40 uppercase tracking-widest text-slate-400">
        v2.1 • 2026
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="no-print hidden lg:block h-screen sticky top-0 shrink-0 z-20">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
