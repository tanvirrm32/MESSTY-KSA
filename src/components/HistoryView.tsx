import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Receipt,
  Scale,
  Trash2,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { MessMonth } from '../types';
import { formatCurrency, calculateMonthlySettlement } from '../utils/calcEngine';
import { ConfirmModal } from './ConfirmModal';

export const HistoryView: React.FC = () => {
  const {
    currentMonth,
    setCurrentMonthId,
    db,
    createMonth,
    finalizeMonth,
    reopenMonth,
    deleteMonth,
    setActiveTab,
  } = useMess();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createYear, setCreateYear] = useState<number>(new Date().getFullYear());
  const [createMonthNum, setCreateMonthNum] = useState<number>(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2);
  const [formError, setFormError] = useState<string | null>(null);

  // Reopen / finalize / delete confirm
  const [finalizeTargetId, setFinalizeTargetId] = useState<string | null>(null);
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);
    setCreateYear(nextDate.getFullYear());
    setCreateMonthNum(nextDate.getMonth() + 1);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateMonth = (e: React.FormEvent) => {
    e.preventDefault();
    const padMonth = createMonthNum.toString().padStart(2, '0');
    const monthId = `${createYear}-${padMonth}`;

    if (db.months.some((m) => m.id === monthId)) {
      setFormError('A month with this ID already exists.');
      return;
    }

    createMonth(createYear, createMonthNum);
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Monthly History & Archives
          </h2>
          <p className="text-xs text-slate-500">
            View past months, audit settlements, and start new billing cycles
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Month
        </button>
      </div>

      {/* Month List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...db.months].sort((a, b) => b.id.localeCompare(a.id)).map((m) => {
          const settlement = calculateMonthlySettlement(m, db.expenses, db.contributions);
          const isSelected = m.id === currentMonth.id;
          const isFinalized = m.status === 'finalized';

          return (
            <div
              key={m.id}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Month Title & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{m.name}</h3>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active Selection
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Period ID: {m.id} • Year {m.year}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isFinalized
                        ? 'bg-slate-800 text-white'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isFinalized ? (
                      <>
                        <Lock className="w-3 h-3" />
                        Finalized
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        Open
                      </>
                    )}
                  </span>
                </div>

                {/* Settlement Summary Line */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Settlement Status
                  </span>
                  <span className="font-bold text-slate-800">
                    {settlement.settlementMessage}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Total Expenses:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(settlement.totalExpenses)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Contributions:</span>
                    <span className="font-mono font-bold text-blue-900">
                      {formatCurrency(settlement.totalContributions)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {isFinalized ? (
                    <button
                      type="button"
                      onClick={() => setReopenTargetId(m.id)}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Reopen
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFinalizeTargetId(m.id)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" /> Finalize
                    </button>
                  )}

                  {db.months.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(m.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Delete this month"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonthId(m.id);
                    setActiveTab('dashboard');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                  }`}
                >
                  {isSelected ? 'View Dashboard' : 'Switch To Month'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create New Month Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Create New Billing Month</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set up an active period for monthly cost tracking
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMonth} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Month *
                  </label>
                  <select
                    value={createMonthNum}
                    onChange={(e) => setCreateMonthNum(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-semibold bg-slate-50"
                  >
                    {[
                      'January',
                      'February',
                      'March',
                      'April',
                      'May',
                      'June',
                      'July',
                      'August',
                      'September',
                      'October',
                      'November',
                      'December',
                    ].map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Year *
                  </label>
                  <input
                    type="number"
                    value={createYear}
                    onChange={(e) => setCreateYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-mono"
                    min={2020}
                    max={2035}
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                <span className="font-semibold block mb-0.5 text-slate-900">
                  Automated Balance Carry-Forward:
                </span>
                Opening balances will be initialized automatically from the previous month's final closing balances.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer"
                >
                  Create Month
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={finalizeTargetId !== null}
        title="Finalize Month?"
        message="Finalizing this month locks transactions and preserves the official settlement verdict. You can reopen it if adjustments are needed."
        confirmLabel="Finalize & Lock"
        onConfirm={() => {
          if (finalizeTargetId) {
            finalizeMonth(finalizeTargetId);
            setFinalizeTargetId(null);
          }
        }}
        onCancel={() => setFinalizeTargetId(null)}
      />

      <ConfirmModal
        isOpen={reopenTargetId !== null}
        title="Reopen Month?"
        message="Reopening will allow editing transactions and updating the settlement calculation."
        confirmLabel="Reopen"
        isDestructive={false}
        onConfirm={() => {
          if (reopenTargetId) {
            reopenMonth(reopenTargetId);
            setReopenTargetId(null);
          }
        }}
        onCancel={() => setReopenTargetId(null)}
      />

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete Month Record?"
        message="Are you sure you want to delete this billing month from history? All expenses and contributions associated with this month will also be removed."
        confirmLabel="Delete Month"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMonth(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
