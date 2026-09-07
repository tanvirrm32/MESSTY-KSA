import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, User, CreditCard, AlertCircle } from 'lucide-react';
import { useMess } from '../context/MessContext';
import { PaymentMethod } from '../types';
import { roundCurrency, formatDate } from '../utils/calcEngine';

export const ContributionModal: React.FC = () => {
  const {
    isContributionModalOpen,
    setIsContributionModalOpen,
    editingContribution,
    setEditingContribution,
    currentMonth,
    addContribution,
    updateContribution,
  } = useMess();

  const [date, setDate] = useState('');
  const [memberId, setMemberId] = useState<'tanvir-rana' | 'zilam-jahid'>('tanvir-rana');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isContributionModalOpen) return;

    if (editingContribution) {
      setDate(editingContribution.date);
      setMemberId(editingContribution.memberId);
      setAmountStr(editingContribution.amount.toString());
      setPaymentMethod(editingContribution.paymentMethod);
      setReference(editingContribution.reference || '');
      setNotes(editingContribution.notes || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const defaultDate = today.startsWith(currentMonth.id) ? today : `${currentMonth.id}-01`;
      setDate(defaultDate);
      setMemberId('tanvir-rana');
      setAmountStr('');
      setPaymentMethod('Bank');
      setReference('');
      setNotes('');
    }
    setError(null);
  }, [isContributionModalOpen, editingContribution, currentMonth]);

  if (!isContributionModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentMonth.status === 'finalized') {
      setError('This month is finalized and locked. Please reopen the month before modifying contributions.');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid contribution amount greater than SAR 0.');
      return;
    }

    if (!date) {
      setError('Please select a date.');
      return;
    }

    const contributionMonthId = date.slice(0, 7);

    if (editingContribution) {
      updateContribution(editingContribution.id, {
        date,
        monthId: contributionMonthId,
        memberId,
        amount: roundCurrency(amount),
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
      });
    } else {
      addContribution({
        date,
        monthId: contributionMonthId,
        memberId,
        amount: roundCurrency(amount),
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
      });
    }

    setIsContributionModalOpen(false);
    setEditingContribution(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {editingContribution ? 'Edit Deposit / Contribution' : 'Add Member Deposit / Contribution'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mess Fund Deposit • <span className="font-semibold text-slate-700">{currentMonth.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsContributionModalOpen(false);
              setEditingContribution(null);
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
          {/* Member */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Contributing Member *
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMemberId('tanvir-rana')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                  memberId === 'tanvir-rana'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tanvir Rana
              </button>
              <button
                type="button"
                onClick={() => setMemberId('zilam-jahid')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                  memberId === 'zilam-jahid'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Zilam Jahid
              </button>
            </div>
          </div>

          {/* Amount & Date */}
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
                  placeholder="1000.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-12 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden bg-slate-50/50"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Payment Method *
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'Bank', 'Other'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                    paymentMethod === method
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Transaction ID</label>
            <input
              type="text"
              placeholder="e.g., Bank Transfer Ref #98124 or Cash In Hand"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Monthly advance deposit for groceries"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsContributionModalOpen(false);
                setEditingContribution(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs font-semibold"
            >
              {editingContribution ? 'Update Contribution' : 'Record Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
