import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Download,
  FileSpreadsheet,
  X,
  SlidersHorizontal,
  Landmark,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { Expense } from '../types';
import { formatCurrency } from '../utils/calcEngine';
import { exportExpensesToCSV } from '../utils/exportUtils';
import { ConfirmModal } from './ConfirmModal';

export const TransactionsView: React.FC = () => {
  const {
    currentMonth,
    currentSettlement,
    db,
    setEditingExpense,
    setIsExpenseModalOpen,
    deleteExpense,
  } = useMess();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<'all' | 'tanvir-rana' | 'zilam-jahid' | 'total-fund'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'common' | 'personal'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryMap = useMemo(
    () => new Map(db.categories.map((c) => [c.id, c.name])),
    [db.categories]
  );

  // Month-filtered expenses
  const monthExpenses = useMemo(
    () => db.expenses.filter((e) => e.monthId === currentMonth.id),
    [db.expenses, currentMonth.id]
  );

  // Apply search and filters
  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter((e) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catName = (categoryMap.get(e.categoryId) || '').toLowerCase();
        const matches =
          e.description.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          (e.notes || '').toLowerCase().includes(q) ||
          catName.includes(q);
        if (!matches) return false;
      }

      // Member
      if (selectedMember !== 'all' && e.paidBy !== selectedMember) {
        return false;
      }

      // Category
      if (selectedCategory !== 'all' && e.categoryId !== selectedCategory) {
        return false;
      }

      // Type
      if (selectedType !== 'all' && e.expenseType !== selectedType) {
        return false;
      }

      // Date range
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;

      return true;
    });
  }, [
    monthExpenses,
    searchQuery,
    selectedMember,
    selectedCategory,
    selectedType,
    startDate,
    endDate,
    categoryMap,
  ]);

  // Aggregate totals for the filtered set
  const filteredTotals = useMemo(() => {
    let total = 0;
    let tanvirPaid = 0;
    let zilamPaid = 0;
    let fundPaid = 0;
    let commonTotal = 0;
    let personalTotal = 0;

    for (const e of filteredExpenses) {
      total += e.amount;
      if (e.paidBy === 'tanvir-rana') tanvirPaid += e.amount;
      else if (e.paidBy === 'zilam-jahid') zilamPaid += e.amount;
      else if (e.paidBy === 'total-fund') fundPaid += e.amount;

      if (e.expenseType === 'common') commonTotal += e.amount;
      else personalTotal += e.amount;
    }

    return { total, tanvirPaid, zilamPaid, fundPaid, commonTotal, personalTotal };
  }, [filteredExpenses]);

  const handleExportCSV = () => {
    exportExpensesToCSV(filteredExpenses, db.categories, currentMonth.name);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedMember('all');
    setSelectedCategory('all');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedMember !== 'all' ||
    selectedCategory !== 'all' ||
    selectedType !== 'all' ||
    startDate ||
    endDate;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Expenses Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Recorded expenses for <span className="font-semibold text-slate-700">{currentMonth.name}</span>
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
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            disabled={currentMonth.status === 'finalized'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Month Expenses Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-semibold uppercase tracking-wider text-slate-600">Total Month Expenses</span>
              <span className="text-[11px] text-slate-400 font-mono">{monthExpenses.length} items</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {formatCurrency(currentSettlement.totalExpenses)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Common: <strong className="font-mono text-slate-800">{formatCurrency(currentSettlement.totalCommonExpenses)}</strong></span>
            <span>Personal: <strong className="font-mono text-slate-800">{formatCurrency(currentSettlement.totalPersonalExpenses)}</strong></span>
          </div>
        </div>

        {/* Shared / Common Expenses Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-semibold uppercase tracking-wider text-slate-600">Shared / Common Total</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">50/50 Split</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-950 tracking-tight">
              {formatCurrency(currentSettlement.totalCommonExpenses)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Per Member Share:</span>
            <span className="font-mono font-bold text-emerald-700 text-xs">
              {formatCurrency(currentSettlement.commonExpensePerMember)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, notes, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:border-blue-500 outline-hidden bg-white"
            />
          </div>

          {/* Member filter */}
          <div>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-blue-500 outline-hidden bg-white font-medium text-slate-700"
            >
              <option value="all">All Payers / Sources</option>
              <option value="total-fund">🏛️ Total Fund</option>
              <option value="tanvir-rana">Tanvir Rana</option>
              <option value="zilam-jahid">Zilam Jahid</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-blue-500 outline-hidden bg-white text-slate-700"
            >
              <option value="all">All Categories</option>
              {db.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-blue-500 outline-hidden bg-white text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="common">Common Expense</option>
              <option value="personal">Personal Expense</option>
            </select>
          </div>
        </div>

        {/* Date Range & Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Filtered Aggregates Bar */}
      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 text-slate-600">
          <span>
            Shown: <strong className="text-slate-900">{filteredExpenses.length}</strong> / {monthExpenses.length} expenses
          </span>
          <span>•</span>
          <span>
            Filtered Total: <strong className="text-slate-900 font-mono font-bold">{formatCurrency(filteredTotals.total)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {filteredTotals.fundPaid > 0 && (
            <span className="text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              🏛️ Fund Paid: <strong className="font-mono">{formatCurrency(filteredTotals.fundPaid)}</strong>
            </span>
          )}
          <span className="text-emerald-700 font-medium">
            Tanvir Paid: <strong className="font-mono">{formatCurrency(filteredTotals.tanvirPaid)}</strong>
          </span>
          <span className="text-blue-700 font-medium">
            Zilam Paid: <strong className="font-mono">{formatCurrency(filteredTotals.zilamPaid)}</strong>
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Paid By</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Expense Split (T / Z)</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No expenses found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {exp.date}
                    </td>

                    {/* ID */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {exp.id}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {categoryMap.get(exp.categoryId) || 'General'}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs">
                      <div className="truncate">{exp.description}</div>
                      {(exp.updatedByName || exp.createdByName) && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                          <span>{exp.updatedByName ? 'Updated by:' : 'Added by:'}</span>
                          <span className="font-semibold text-slate-600">
                            {exp.updatedByName || exp.createdByName}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>

                    {/* Paid By */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.paidBy === 'total-fund'
                            ? 'bg-purple-100 text-purple-800'
                            : exp.paidBy === 'tanvir-rana'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            exp.paidBy === 'total-fund'
                              ? 'bg-purple-600'
                              : exp.paidBy === 'tanvir-rana'
                              ? 'bg-emerald-600'
                              : 'bg-blue-600'
                          }`}
                        />
                        {exp.paidBy === 'total-fund'
                          ? 'Total Fund'
                          : exp.paidBy === 'tanvir-rana'
                          ? 'Tanvir Rana'
                          : 'Zilam Jahid'}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          exp.expenseType === 'common'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {exp.expenseType === 'common' ? 'Common' : 'Personal'}
                      </span>
                    </td>

                    {/* Split */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-[11px] text-slate-600">
                        <span className="text-emerald-700 font-semibold">T: {formatCurrency(exp.tanvirShare, false)}</span>
                        {' | '}
                        <span className="text-blue-700 font-semibold">Z: {formatCurrency(exp.zilamShare, false)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {exp.paidBy === 'total-fund'
                          ? 'Deducted 50/50 from Fund'
                          : exp.expenseType === 'common'
                          ? `Split: ${exp.splitRatio?.tanvirPercent ?? 50}% / ${exp.splitRatio?.zilamPercent ?? 50}%`
                          : `Personal: ${exp.personalFor === 'tanvir-rana' ? 'Tanvir' : 'Zilam'}`}
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate text-[11px]">
                      {exp.notes || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpense(exp);
                            setIsExpenseModalOpen(true);
                          }}
                          disabled={currentMonth.status === 'finalized'}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors disabled:opacity-40 cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(exp.id)}
                          disabled={currentMonth.status === 'finalized'}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-40 cursor-pointer"
                          title="Delete Expense"
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        title="Delete Expense?"
        message="Are you sure you want to delete this expense? All affected member balances and month-end settlement will be recalculated automatically."
        confirmLabel="Delete Expense"
        isDestructive={true}
        onConfirm={() => {
          if (deletingId) {
            deleteExpense(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
