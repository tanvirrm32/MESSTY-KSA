import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  CreditCard,
  Building,
  Coins,
  ShoppingCart,
  Wallet,
  ArrowUpRight,
  Landmark,
  LayoutList,
  Table as TableIcon,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { formatCurrency, formatDate } from '../utils/calcEngine';
import { exportContributionsToCSV } from '../utils/exportUtils';
import { ConfirmModal } from './ConfirmModal';

export const ContributionsView: React.FC = () => {
  const {
    currentMonth,
    currentSettlement,
    db,
    setEditingContribution,
    setIsContributionModalOpen,
    deleteContribution,
    setEditingExpense,
    setIsExpenseModalOpen,
  } = useMess();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<'all' | 'tanvir-rana' | 'zilam-jahid'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });

  // Month-filtered contributions
  const monthContributions = useMemo(
    () => db.contributions.filter((c) => c.monthId === currentMonth.id),
    [db.contributions, currentMonth.id]
  );

  const filteredContributions = useMemo(() => {
    return monthContributions.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.id.toLowerCase().includes(q) ||
          (c.reference || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q) ||
          c.paymentMethod.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedMember !== 'all' && c.memberId !== selectedMember) {
        return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [monthContributions, searchQuery, selectedMember]);

  const tanvirEntriesCount = useMemo(
    () => monthContributions.filter((c) => c.memberId === 'tanvir-rana').length,
    [monthContributions]
  );
  const zilamEntriesCount = useMemo(
    () => monthContributions.filter((c) => c.memberId === 'zilam-jahid').length,
    [monthContributions]
  );

  const handleExportCSV = () => {
    exportContributionsToCSV(filteredContributions, currentMonth.name);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Member Contributions & Deposits
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              Total Mess Pool: {formatCurrency(currentSettlement.totalContributions)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Member accounts & automatic expense credits for <span className="font-semibold text-slate-700">{currentMonth.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingContribution(null);
              setIsContributionModalOpen(true);
            }}
            disabled={currentMonth.status === 'finalized'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Deposit
          </button>
        </div>
      </div>

      {/* Three Summary & Contribution Cards: Total Fund, Tanvir Rana, Zilam Jahid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Fund (Requested by User) */}
        <div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 rounded-xl border border-purple-200/90 shadow-sm p-4.5 relative overflow-hidden flex flex-col justify-between transition-all hover:border-purple-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Top row: Fund info & Spend button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center border border-purple-200 shrink-0 shadow-2xs">
                  <Landmark className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Total Fund</h3>
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  </div>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 mt-0.5 inline-block">
                    🏛️ Shared Mess Pool
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingExpense({ paidBy: 'total-fund' } as any);
                  setIsExpenseModalOpen(true);
                }}
                disabled={currentMonth.status === 'finalized'}
                className="px-2.5 py-1 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-40"
                title="Record expense paid from Total Fund"
              >
                + Spend from Fund
              </button>
            </div>

            {/* Total Collected */}
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Fund Collected
              </span>
              <div className="text-2xl sm:text-3xl font-black text-purple-950 font-mono mt-1 tracking-tight">
                {formatCurrency(currentSettlement.totalContributions)}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-emerald-700 font-medium">Tanvir: <strong className="font-mono text-slate-800">{formatCurrency(currentSettlement.tanvirStats.totalContributions)}</strong></span>
                <span className="text-purple-300 font-bold">+</span>
                <span className="text-blue-700 font-medium">Zilam: <strong className="font-mono text-slate-800">{formatCurrency(currentSettlement.zilamStats.totalContributions)}</strong></span>
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-purple-50/60 p-2.5 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-purple-700 mb-0.5">
                <span>Fund Used</span>
                <ShoppingCart className="w-3 h-3 text-purple-600" />
              </div>
              <div className="text-sm font-bold font-mono text-purple-950">
                {formatCurrency(currentSettlement.fundExpensesPaid || currentSettlement.totalExpenses || 0)}
              </div>
              <span className="text-[10px] text-purple-600/90 block mt-0.5">Total month expenses</span>
            </div>

            <div
              className={`p-2.5 rounded-lg border ${
                currentSettlement.remainingFund >= 0
                  ? 'bg-indigo-50/60 border-indigo-100'
                  : 'bg-rose-50/60 border-rose-100'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase font-bold mb-0.5">
                <span className={currentSettlement.remainingFund >= 0 ? 'text-indigo-700' : 'text-rose-700'}>
                  {currentSettlement.remainingFund >= 0 ? 'Available' : 'Deficit'}
                </span>
                <Wallet className={`w-3 h-3 ${currentSettlement.remainingFund >= 0 ? 'text-indigo-600' : 'text-rose-600'}`} />
              </div>
              <div
                className={`text-sm font-bold font-mono ${
                  currentSettlement.remainingFund >= 0 ? 'text-indigo-950' : 'text-rose-700 font-black'
                }`}
              >
                {formatCurrency(currentSettlement.remainingFund)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {currentSettlement.remainingFund >= 0 ? 'Remaining balance' : 'Shortage / Due'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Tanvir Rana */}
        <div className="bg-white rounded-xl border border-emerald-200/90 shadow-sm p-4.5 relative overflow-hidden flex flex-col justify-between transition-all hover:border-emerald-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Top row: Member info & Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200 shrink-0 shadow-2xs">
                  TR
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Tanvir Rana</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5 inline-block">
                    ⚡ Auto-Credit Active
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400 font-medium">
                  {tanvirEntriesCount} entries
                </span>
              </div>
            </div>

            {/* Total Amount Added */}
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Contributed & Spent
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono mt-1 tracking-tight">
                {formatCurrency(currentSettlement.tanvirStats.totalContributions)}
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Automatically increases whenever Tanvir makes an expense or deposit</span>
              </p>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-700 mb-0.5">
                <span>Bazaar Expenses</span>
                <ShoppingCart className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="text-sm font-bold font-mono text-emerald-950">
                {formatCurrency(currentSettlement.tanvirStats.autoContributions || 0)}
              </div>
              <span className="text-[10px] text-emerald-600/90 block mt-0.5">Auto-added from bazaar</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                <span>Direct Deposits</span>
                <Wallet className="w-3 h-3 text-slate-500" />
              </div>
              <div className="text-sm font-bold font-mono text-slate-900">
                {formatCurrency(currentSettlement.tanvirStats.directContributions || 0)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Cash / bank transfers</span>
            </div>
          </div>
        </div>

        {/* Card 2: Zilam Jahid */}
        <div className="bg-white rounded-xl border border-blue-200/90 shadow-sm p-4.5 relative overflow-hidden flex flex-col justify-between transition-all hover:border-blue-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Top row: Member info & Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center border border-blue-200 shrink-0 shadow-2xs">
                  ZJ
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Zilam Jahid</h3>
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  </div>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 mt-0.5 inline-block">
                    ⚡ Auto-Credit Active
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400 font-medium">
                  {zilamEntriesCount} entries
                </span>
              </div>
            </div>

            {/* Total Amount Added */}
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Contributed & Spent
              </span>
              <div className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1 tracking-tight">
                {formatCurrency(currentSettlement.zilamStats.totalContributions)}
              </div>
              <p className="text-[11px] text-blue-700 font-medium mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Automatically increases whenever Zilam makes an expense or deposit</span>
              </p>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-blue-700 mb-0.5">
                <span>Bazaar Expenses</span>
                <ShoppingCart className="w-3 h-3 text-blue-600" />
              </div>
              <div className="text-sm font-bold font-mono text-blue-950">
                {formatCurrency(currentSettlement.zilamStats.autoContributions || 0)}
              </div>
              <span className="text-[10px] text-blue-600/90 block mt-0.5">Auto-added from bazaar</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                <span>Direct Deposits</span>
                <Wallet className="w-3 h-3 text-slate-500" />
              </div>
              <div className="text-sm font-bold font-mono text-slate-900">
                {formatCurrency(currentSettlement.zilamStats.directContributions || 0)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Cash / bank transfers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & View Toggle */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, notes, method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:border-blue-500 outline-hidden bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Member:</span>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md outline-hidden bg-white font-medium text-slate-700"
            >
              <option value="all">All Members</option>
              <option value="tanvir-rana">Tanvir Rana</option>
              <option value="zilam-jahid">Zilam Jahid</option>
            </select>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Card View (Mobile friendly)"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Table View (Spreadsheet)"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Contributions Display: Cards or Table */}
      {viewMode === 'cards' ? (
        <div className="space-y-3">
          {filteredContributions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              No member contributions recorded for this month.
            </div>
          ) : (
            filteredContributions.map((con) => (
              <div
                key={con.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Header: Date, ID, Member, Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                      {formatDate(con.date)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{con.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        con.memberId === 'tanvir-rana'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          con.memberId === 'tanvir-rana' ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                      />
                      {con.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold font-mono text-emerald-700">
                      {formatCurrency(con.amount)}
                    </span>
                  </div>
                </div>

                {/* Method & Tags */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                    {con.paymentMethod === 'Bank' && <Building className="w-3 h-3 text-slate-500" />}
                    {con.paymentMethod === 'Cash' && <Coins className="w-3 h-3 text-slate-500" />}
                    {con.paymentMethod === 'Other' && <CreditCard className="w-3 h-3 text-slate-500" />}
                    {con.paymentMethod}
                  </span>

                  {(con.isAutoExpense || con.linkedExpenseId) && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                      title="Automatically added from bazaar expense"
                    >
                      Bazaar Auto Credit
                    </span>
                  )}
                </div>

                {/* Reference & Notes */}
                {(con.reference || con.notes) && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                    {con.reference && (
                      <div className="font-mono text-[11px] text-slate-600 truncate">
                        Ref: {con.reference}
                      </div>
                    )}
                    {con.notes && (
                      <div className="text-slate-600">
                        {con.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Added by info & Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                  <div className="text-[10px] text-slate-400">
                    {(con.updatedByName || con.createdByName) ? (
                      <span>
                        {con.updatedByName ? 'Updated by:' : 'Added by:'}{' '}
                        <strong className="text-slate-600">{con.updatedByName || con.createdByName}</strong>
                      </span>
                    ) : (
                      <span>Deposit confirmed</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContribution(con);
                        setIsContributionModalOpen(true);
                      }}
                      disabled={currentMonth.status === 'finalized'}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                      title="Edit Contribution"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(con.id)}
                      disabled={currentMonth.status === 'finalized'}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                      title="Delete Contribution"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Contributions Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContributions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No member contributions recorded for this month.
                    </td>
                  </tr>
                ) : (
                  filteredContributions.map((con) => (
                    <tr key={con.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatDate(con.date)}
                      </td>

                      {/* ID */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {con.id}
                      </td>

                      {/* Member */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            con.memberId === 'tanvir-rana'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              con.memberId === 'tanvir-rana' ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                          />
                          {con.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(con.amount)}
                      </td>

                      {/* Method */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            {con.paymentMethod === 'Bank' && <Building className="w-3 h-3 text-slate-500" />}
                            {con.paymentMethod === 'Cash' && <Coins className="w-3 h-3 text-slate-500" />}
                            {con.paymentMethod === 'Other' && <CreditCard className="w-3 h-3 text-slate-500" />}
                            {con.paymentMethod}
                          </span>
                          {(con.isAutoExpense || con.linkedExpenseId) && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title="Automatically added from bazaar expense"
                            >
                              Bazaar Auto
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-xs">
                        <div className="truncate">{con.reference || '—'}</div>
                        {(con.updatedByName || con.createdByName) && (
                          <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5 flex items-center gap-1">
                            <span>{con.updatedByName ? 'Updated by:' : 'Added by:'}</span>
                            <span className="font-semibold text-slate-600">
                              {con.updatedByName || con.createdByName}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                        {con.notes || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContribution(con);
                              setIsContributionModalOpen(true);
                            }}
                            disabled={currentMonth.status === 'finalized'}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-40 cursor-pointer"
                            title="Edit Contribution"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(con.id)}
                            disabled={currentMonth.status === 'finalized'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-40 cursor-pointer"
                            title="Delete Contribution"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        title="Delete Contribution Deposit?"
        message="Are you sure you want to delete this deposit record? The member's balance and mess fund totals will be recalculated immediately."
        confirmLabel="Delete Deposit"
        isDestructive={true}
        onConfirm={() => {
          if (deletingId) {
            deleteContribution(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
