import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, User, Sliders, AlertCircle, Landmark } from 'lucide-react';
import { useMess } from '../context/MessContext';
import { formatCurrency, roundCurrency, formatDate } from '../utils/calcEngine';

export const ExpenseModal: React.FC = () => {
  const {
    isExpenseModalOpen,
    setIsExpenseModalOpen,
    editingExpense,
    setEditingExpense,
    currentMonth,
    addExpense,
    updateExpense,
    db,
  } = useMess();

  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState<'tanvir-rana' | 'zilam-jahid' | 'total-fund'>('tanvir-rana');
  const [expenseType, setExpenseType] = useState<'common' | 'personal'>('common');
  const [personalFor, setPersonalFor] = useState<'tanvir-rana' | 'zilam-jahid'>('tanvir-rana');
  const [splitMode, setSplitMode] = useState<'50-50' | 'custom'>('50-50');
  const [tanvirPercent, setTanvirPercent] = useState(50);
  const [zilamPercent, setZilamPercent] = useState(50);
  const [autoContribute, setAutoContribute] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize form
  useEffect(() => {
    if (!isExpenseModalOpen) return;

    if (editingExpense && editingExpense.id) {
      setDate(editingExpense.date);
      setCategoryId(editingExpense.categoryId);
      setDescription(editingExpense.description);
      setAmountStr(editingExpense.amount.toString());
      setPaidBy(editingExpense.paidBy);
      setExpenseType(editingExpense.expenseType);
      setPersonalFor(editingExpense.personalFor || (editingExpense.paidBy !== 'total-fund' ? editingExpense.paidBy : 'tanvir-rana'));
      setAutoContribute(editingExpense.paidBy !== 'total-fund' && editingExpense.autoContribute !== false);
      setNotes(editingExpense.notes || '');

      if (
        editingExpense.splitRatio &&
        (editingExpense.splitRatio.tanvirPercent !== 50 || editingExpense.splitRatio.zilamPercent !== 50)
      ) {
        setSplitMode('custom');
        setTanvirPercent(editingExpense.splitRatio.tanvirPercent);
        setZilamPercent(editingExpense.splitRatio.zilamPercent);
      } else {
        setSplitMode('50-50');
        setTanvirPercent(50);
        setZilamPercent(50);
      }
    } else {
      // Default to today or month's default
      const today = new Date().toISOString().slice(0, 10);
      // If current month matches today's month, use today; else use 1st of month
      const defaultDate = today.startsWith(currentMonth.id) ? today : `${currentMonth.id}-01`;
      const initialPaidBy = editingExpense?.paidBy || 'tanvir-rana';
      setDate(defaultDate);
      setCategoryId(db.categories[0]?.id || 'cat-grocery');
      setDescription('');
      setAmountStr('');
      setPaidBy(initialPaidBy);
      setExpenseType('common');
      setPersonalFor('tanvir-rana');
      setSplitMode('50-50');
      setTanvirPercent(50);
      setZilamPercent(50);
      setAutoContribute(initialPaidBy !== 'total-fund');
      setNotes('');
    }
    setError(null);
  }, [isExpenseModalOpen, editingExpense, currentMonth, db.categories]);

  if (!isExpenseModalOpen) return null;

  const parsedAmount = parseFloat(amountStr) || 0;

  // Calculate live preview shares
  let liveTanvirShare = 0;
  let liveZilamShare = 0;
  if (expenseType === 'personal') {
    if (personalFor === 'tanvir-rana') {
      liveTanvirShare = parsedAmount;
      liveZilamShare = 0;
    } else {
      liveTanvirShare = 0;
      liveZilamShare = parsedAmount;
    }
  } else {
    const tPct = splitMode === '50-50' ? 50 : tanvirPercent;
    liveTanvirShare = roundCurrency((parsedAmount * tPct) / 100);
    liveZilamShare = roundCurrency(parsedAmount - liveTanvirShare);
  }

  const handleCustomTanvirChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setTanvirPercent(clamped);
    setZilamPercent(100 - clamped);
  };

  const handleCustomZilamChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setZilamPercent(clamped);
    setTanvirPercent(100 - clamped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentMonth.status === 'finalized') {
      setError('This month is finalized and locked. Please reopen the month before adding or editing transactions.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide an expense description.');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid expense amount greater than SAR 0.');
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    // Ensure date matches current month or assign to date's month
    const expenseMonthId = date.slice(0, 7);

    if (expenseType === 'common' && splitMode === 'custom') {
      if (tanvirPercent + zilamPercent !== 100) {
        setError('Total split percentage must equal exactly 100%.');
        return;
      }
    }

    const splitRatio =
      expenseType === 'common'
        ? splitMode === '50-50'
          ? { tanvirPercent: 50, zilamPercent: 50 }
          : { tanvirPercent, zilamPercent }
        : { tanvirPercent: personalFor === 'tanvir-rana' ? 100 : 0, zilamPercent: personalFor === 'zilam-jahid' ? 100 : 0 };

    if (editingExpense && editingExpense.id) {
      updateExpense(editingExpense.id, {
        date,
        monthId: expenseMonthId,
        categoryId,
        description: description.trim(),
        amount: roundCurrency(amount),
        paidBy,
        expenseType,
        personalFor: expenseType === 'personal' ? personalFor : undefined,
        splitRatio,
        notes: notes.trim(),
        autoContribute,
      });
    } else {
      addExpense({
        date,
        monthId: expenseMonthId,
        categoryId,
        description: description.trim(),
        amount: roundCurrency(amount),
        paidBy,
        expenseType,
        personalFor: expenseType === 'personal' ? personalFor : undefined,
        splitRatio,
        notes: notes.trim(),
        autoContribute,
      });
    }

    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex min-h-full items-start sm:items-center justify-center py-6 sm:py-8 touch-pan-y"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Month: <span className="font-semibold text-slate-700">{currentMonth.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsExpenseModalOpen(false);
              setEditingExpense(null);
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date *
                </span>
                {date && (
                  <span className="text-[11px] font-mono font-medium text-emerald-700">
                    {formatDate(date)}
                  </span>
                )}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> Category *
                </span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50/50"
              >
                {db.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g., Weekly Supermarket Grocery & Vegetables"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
            />
          </div>

          {/* Amount & Paid By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Amount (SAR) *
                </span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                  SAR
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-12 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Paid By / Source *
                </span>
              </label>
              <select
                value={paidBy}
                onChange={(e) => {
                  const val = e.target.value as 'tanvir-rana' | 'zilam-jahid' | 'total-fund';
                  setPaidBy(val);
                  if (val === 'total-fund') {
                    setExpenseType('common');
                    setSplitMode('50-50');
                    setTanvirPercent(50);
                    setZilamPercent(50);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50/50 font-medium"
              >
                <option value="tanvir-rana">Tanvir Rana</option>
                <option value="zilam-jahid">Zilam Jahid</option>
                <option value="total-fund">🏛️ Total Fund (Shared Mess Pool)</option>
              </select>
            </div>
          </div>

          {paidBy === 'total-fund' && (
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
              <Landmark className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-purple-950">Paid from Shared Total Fund</span>
                <p className="text-purple-700 text-[11px] mt-0.5 leading-relaxed">
                  This expense will be deducted directly from the combined Total Fund pool, shared equally (50% Tanvir &amp; 50% Zilam) without requiring out-of-pocket payment.
                </p>
              </div>
            </div>
          )}

          {/* Expense Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expense Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExpenseType('common')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                  expenseType === 'common'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Shared / Common Expense
              </button>
              <button
                type="button"
                disabled={paidBy === 'total-fund'}
                onClick={() => {
                  if (paidBy !== 'total-fund') {
                    setExpenseType('personal');
                  }
                }}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                  paidBy === 'total-fund'
                    ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : expenseType === 'personal'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title={paidBy === 'total-fund' ? 'Total Fund can only be used for shared mess expenses' : ''}
              >
                Personal Expense
              </button>
            </div>
          </div>

          {/* If Personal Expense: Whose personal expense is it? */}
          {expenseType === 'personal' && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-indigo-900">
                Whose Personal Expense is this?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-200 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="radio"
                    name="personalFor"
                    checked={personalFor === 'tanvir-rana'}
                    onChange={() => setPersonalFor('tanvir-rana')}
                    className="text-indigo-600"
                  />
                  Tanvir Rana (100%)
                </label>
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-200 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="radio"
                    name="personalFor"
                    checked={personalFor === 'zilam-jahid'}
                    onChange={() => setPersonalFor('zilam-jahid')}
                    className="text-indigo-600"
                  />
                  Zilam Jahid (100%)
                </label>
              </div>
              <p className="text-[11px] text-indigo-700/80 italic">
                * Personal expenses are 100% charged to the selected member and not split.
              </p>
            </div>
          )}

          {/* If Common Expense: Split Settings */}
          {expenseType === 'common' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" /> Expense Split
                </span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode('50-50');
                      setTanvirPercent(50);
                      setZilamPercent(50);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      splitMode === '50-50' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    50 / 50 (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('custom')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      splitMode === 'custom' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custom Split %
                  </button>
                </div>
              </div>

              {splitMode === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-slate-200/70">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tanvir Rana Share (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tanvirPercent}
                        onChange={(e) => handleCustomTanvirChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Zilam Jahid Share (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={zilamPercent}
                        onChange={(e) => handleCustomZilamChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    Total Split: <span className={tanvirPercent + zilamPercent === 100 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>{tanvirPercent + zilamPercent}%</span> (Must equal 100%)
                  </div>
                </div>
              )}

              {/* Real-time Calculation Breakdown Preview */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Tanvir Share:</span>
                  <span className="font-bold text-slate-800 text-sm">{formatCurrency(liveTanvirShare)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Zilam Share:</span>
                  <span className="font-bold text-slate-800 text-sm">{formatCurrency(liveZilamShare)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Receipt #104, split agreed verbally"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Auto Contribution Toggle (Bazaar expense auto-contribute) */}
          {paidBy === 'total-fund' ? (
            <div className="bg-purple-50/80 border border-purple-200/80 rounded-xl p-3 flex items-start gap-3">
              <Landmark className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-purple-950 block">
                  Debited Directly from Total Fund
                </span>
                <span className="text-purple-700 text-[11px] block mt-0.5 leading-relaxed">
                  The amount will be deducted directly from the accumulated Total Fund pool. No personal out-of-pocket contribution is created.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-3">
              <input
                id="auto-contribute-toggle"
                type="checkbox"
                checked={autoContribute}
                onChange={(e) => setAutoContribute(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="auto-contribute-toggle" className="text-xs cursor-pointer select-none">
                <span className="font-semibold text-emerald-900 block">
                  Auto-credit to {paidBy === 'tanvir-rana' ? 'Tanvir' : 'Zilam'}&apos;s Contribution (Bazaar Expense)
                </span>
                <span className="text-emerald-700 text-[11px] block mt-0.5 leading-relaxed">
                  Automatically records this expense as a deposit/contribution by the payer into the mess fund.
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsExpenseModalOpen(false);
                setEditingExpense(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs font-semibold"
            >
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
