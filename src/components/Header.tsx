import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Lock,
  Unlock,
  ChevronDown,
  Menu,
  Receipt,
  Wallet,
  LogOut,
  Settings,
  KeyRound,
  UserCheck,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { useMess } from '../context/MessContext';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
  onOpenMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onOpenMobile,
}) => {
  const toggleSidebar = onToggleMobileSidebar || onOpenMobile;
  const {
    db,
    currentMonthId,
    setCurrentMonthId,
    currentMonth,
    createMonth,
    setIsExpenseModalOpen,
    setIsContributionModalOpen,
    setEditingExpense,
    setEditingContribution,
    setActiveTab,
    currentUser,
    logoutMember,
    switchMember,
    firebaseSyncStatus,
    lastSyncedAt,
    forceSyncToFirebase,
  } = useMess();

  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isCreateMonthOpen, setIsCreateMonthOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const currentUserName =
    currentUser === 'tanvir-rana'
      ? 'Tanvir Rana'
      : currentUser === 'zilam-jahid'
      ? 'Zilam Jahid'
      : 'Guest User';
  const currentUserShort =
    currentUser === 'tanvir-rana' ? 'Tanvir' : currentUser === 'zilam-jahid' ? 'Zilam' : 'Guest';
  const currentUserInitials =
    currentUser === 'tanvir-rana' ? 'TR' : currentUser === 'zilam-jahid' ? 'ZJ' : 'G';

  // Next month calculation for quick create
  const sortedMonths = [...db.months].sort((a, b) => a.id.localeCompare(b.id));
  const latestMonth = sortedMonths[sortedMonths.length - 1];

  let nextYear = 2026;
  let nextMonthNum = 10;
  if (latestMonth) {
    if (latestMonth.monthNumber === 12) {
      nextYear = latestMonth.year + 1;
      nextMonthNum = 1;
    } else {
      nextYear = latestMonth.year;
      nextMonthNum = latestMonth.monthNumber + 1;
    }
  }

  const [selectedYear, setSelectedYear] = useState(nextYear);
  const [selectedMonthNum, setSelectedMonthNum] = useState(nextMonthNum);

  const handleCreateMonth = (e: React.FormEvent) => {
    e.preventDefault();
    createMonth(selectedYear, selectedMonthNum);
    setIsCreateMonthOpen(false);
  };

  return (
    <header className="no-print h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left: Mobile hamburger & Month Selector */}
      <div className="flex items-center gap-3 sm:gap-4">
        {toggleSidebar && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Selected Month Pill */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-md border border-slate-200 transition-colors cursor-pointer text-left"
            >
              <span className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-tight">
                Selected Month:
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-600">
                {currentMonth.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
            </button>

            {/* Status Badge */}
            {currentMonth.status === 'finalized' ? (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded border border-amber-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Finalized
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded border border-emerald-200 flex items-center gap-1">
                Active
              </span>
            )}
          </div>

          {/* Month Dropdown menu */}
          {isMonthDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMonthDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Accounting Month
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {sortedMonths.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setCurrentMonthId(m.id);
                        setIsMonthDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors hover:bg-slate-50 cursor-pointer ${
                        m.id === currentMonthId
                          ? 'bg-blue-50/70 font-bold text-blue-900'
                          : 'text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {m.name}
                      </span>
                      {m.status === 'finalized' ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                          Finalized
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMonthDropdownOpen(false);
                      setIsCreateMonthOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create New Month
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Firebase Cloud Sync Indicator */}
        <button
          type="button"
          onClick={() => {
            forceSyncToFirebase().catch(() => {});
          }}
          title={`Firebase Cloud: ${
            firebaseSyncStatus === 'connected'
              ? 'Synced & Live'
              : firebaseSyncStatus === 'syncing'
              ? 'Syncing to cloud...'
              : 'Sync Error / Offline'
          }${lastSyncedAt ? ` • Last synced at ${lastSyncedAt}` : ''}. Click to manual sync.`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs text-xs cursor-pointer"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              firebaseSyncStatus === 'connected'
                ? 'bg-emerald-500'
                : firebaseSyncStatus === 'syncing'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <Cloud className={`w-3.5 h-3.5 ${firebaseSyncStatus === 'connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-[11px] font-medium text-slate-700 hidden md:inline">
            {firebaseSyncStatus === 'connected' ? 'Cloud Synced' : firebaseSyncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingContribution(null);
            setIsContributionModalOpen(true);
          }}
          disabled={currentMonth.status === 'finalized'}
          className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-white border border-slate-300 rounded-md text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>Deposit</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingExpense(null);
            setIsExpenseModalOpen(true);
          }}
          disabled={currentMonth.status === 'finalized'}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>

        {/* Member Profile & Logout Section */}
        <div className="relative flex items-center ml-1" ref={userMenuRef}>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden hover:border-slate-300 transition-colors">
            {/* Profile Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
              title="User profile & security options"
              aria-expanded={isUserMenuOpen}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                  currentUser === 'tanvir-rana'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentUser === 'zilam-jahid'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {currentUserInitials}
              </div>
              <span className="font-semibold text-slate-700">
                {currentUserShort}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isUserMenuOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {/* Quick 1-Click Logout Button right in the section! */}
            <div className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={logoutMember}
              className="px-2 sm:px-2.5 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
              title="Log Out (লগআউট)"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* User Account & Security Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              {/* User Identity Card */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs ${
                      currentUser === 'tanvir-rana'
                        ? 'bg-emerald-600 text-white'
                        : currentUser === 'zilam-jahid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {currentUserInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {currentUserName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-slate-500 font-medium">
                        Active Session • 50% Partner
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings & Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <span>Change Security PIN</span>
                </button>

                {currentUser && currentUser !== 'guest' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser === 'tanvir-rana') switchMember('zilam-jahid');
                      else if (currentUser === 'zilam-jahid') switchMember('tanvir-rana');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    <span>
                      Switch to {currentUser === 'tanvir-rana' ? 'Zilam Jahid' : 'Tanvir Rana'}
                    </span>
                  </button>
                )}
              </div>

              <div className="my-1.5 border-t border-slate-100" />

              {/* Prominent Log Out Button in Menu */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logoutMember();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer text-left group"
              >
                <LogOut className="w-4 h-4 text-rose-500 group-hover:text-rose-700 transition-colors" />
                <span>Log Out Current User (লগআউট)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Month Modal */}
      {isCreateMonthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900">Create New Billing Month</h3>
            <p className="text-xs text-slate-500 mt-1">
              Opening balances will be carried over automatically from previous month.
            </p>

            <form onSubmit={handleCreateMonth} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value) || 2026)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
                <select
                  value={selectedMonthNum}
                  onChange={(e) => setSelectedMonthNum(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-hidden bg-white"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateMonthOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Create Month
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
