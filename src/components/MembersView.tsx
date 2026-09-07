import React, { useState, useMemo } from 'react';
import {
  User,
  DollarSign,
  TrendingUp,
  Receipt,
  Printer,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { formatCurrency } from '../utils/calcEngine';

export const MembersView: React.FC = () => {
  const {
    currentMonth,
    currentSettlement,
    db,
    selectedMemberId,
    setSelectedMemberId,
  } = useMess();

  const isTanvir = selectedMemberId === 'tanvir-rana';
  const memberName = isTanvir ? 'Tanvir Rana' : 'Zilam Jahid';
  const stats = isTanvir ? currentSettlement.tanvirStats : currentSettlement.zilamStats;
  const otherMemberName = isTanvir ? 'Zilam Jahid' : 'Tanvir Rana';

  // Category map
  const categoryMap = useMemo(
    () => new Map(db.categories.map((c) => [c.id, c.name])),
    [db.categories]
  );

  // Month transactions involving this member
  const memberExpensesPaid = useMemo(
    () =>
      db.expenses.filter(
        (e) => e.monthId === currentMonth.id && e.paidBy === selectedMemberId
      ),
    [db.expenses, currentMonth.id, selectedMemberId]
  );

  const memberContributions = useMemo(
    () =>
      db.contributions.filter(
        (c) => c.monthId === currentMonth.id && c.memberId === selectedMemberId
      ),
    [db.contributions, currentMonth.id, selectedMemberId]
  );

  // All expenses this member participates in (either paid, or has share > 0)
  const memberLedgerEntries = useMemo(() => {
    const list: {
      date: string;
      id: string;
      type: 'Expense Paid' | 'Expense Responsibility' | 'Deposit';
      description: string;
      amountPaid: number;
      shareCharged: number;
      impactOnPosition: number;
    }[] = [];

    // Expenses
    const monthExpenses = db.expenses.filter((e) => e.monthId === currentMonth.id);
    for (const exp of monthExpenses) {
      const isPayer = exp.paidBy === selectedMemberId;
      const myShare = isTanvir ? exp.tanvirShare : exp.zilamShare;

      if (isPayer || myShare > 0) {
        list.push({
          date: exp.date,
          id: exp.id,
          type: isPayer ? 'Expense Paid' : 'Expense Responsibility',
          description: `${exp.description} (${categoryMap.get(exp.categoryId) || 'General'})`,
          amountPaid: isPayer ? exp.amount : 0,
          shareCharged: myShare,
          // Impact on net expense position = Amount Paid - Share Charged
          impactOnPosition: (isPayer ? exp.amount : 0) - myShare,
        });
      }
    }

    // Contributions
    for (const con of memberContributions) {
      list.push({
        date: con.date,
        id: con.id,
        type: 'Deposit',
        description: `Fund Deposit (${con.paymentMethod}${con.reference ? ` - ${con.reference}` : ''})`,
        amountPaid: con.amount,
        shareCharged: 0,
        impactOnPosition: con.amount,
      });
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [db.expenses, memberContributions, currentMonth.id, selectedMemberId, isTanvir, categoryMap]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar & Member Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Individual Member Ledgers
          </h2>
          <p className="text-xs text-slate-500">
            Dedicated account sheets for <span className="font-semibold text-slate-700">{currentMonth.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Member Switcher Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedMemberId('tanvir-rana')}
              className={`flex items-center gap-2 px-3 py-1 rounded font-medium transition-all cursor-pointer ${
                isTanvir
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              Tanvir Rana
            </button>
            <button
              type="button"
              onClick={() => setSelectedMemberId('zilam-jahid')}
              className={`flex items-center gap-2 px-3 py-1 rounded font-medium transition-all cursor-pointer ${
                !isTanvir
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-300" />
              Zilam Jahid
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="no-print flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Ledger
          </button>
        </div>
      </div>

      {/* Printable Ledger Header (visible in print mode or screen) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center text-base font-black text-white ${
                isTanvir ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
            >
              {isTanvir ? 'TR' : 'ZJ'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{memberName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                  Fixed Mess Member
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Financial Statement for Month: <strong className="text-slate-800">{currentMonth.name}</strong>
              </p>
            </div>
          </div>

          {/* Account Status Badge */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-right">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                Expense Net (Bazaar)
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  stats.netExpensePosition > 0.005
                    ? 'text-emerald-600'
                    : stats.netExpensePosition < -0.005
                    ? 'text-rose-600'
                    : 'text-slate-800'
                }`}
              >
                {stats.netExpensePosition > 0.005 ? '+' : ''}
                {formatCurrency(stats.netExpensePosition)}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                {stats.netExpensePosition > 0.005
                  ? `Overpaid by ${formatCurrency(stats.netExpensePosition)}`
                  : stats.netExpensePosition < -0.005
                  ? `Underpaid by ${formatCurrency(Math.abs(stats.netExpensePosition))}`
                  : 'Balanced'}
              </span>
            </div>

            <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-800 text-right shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Account Balance
              </span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {formatCurrency(stats.currentAccountBalance)}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                Deposit + Expense Net
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {/* Opening Balance */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Opening Balance
            </span>
            <div className="mt-1 text-base font-bold text-slate-900 font-mono">
              {formatCurrency(stats.openingBalance)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">From previous month</span>
          </div>

          {/* Total Contributions */}
          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
              Contributions / Deposit
            </span>
            <div className="mt-1 text-base font-bold text-blue-950 font-mono">
              {formatCurrency(stats.totalContributions)}
            </div>
            <span className="text-[10px] text-blue-600/80 block mt-0.5">Paid into mess fund</span>
          </div>

          {/* Total Expenses Paid */}
          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Actual Expenses Paid
            </span>
            <div className="mt-1 text-base font-bold text-emerald-950 font-mono">
              {formatCurrency(stats.totalExpensesPaid)}
            </div>
            <span className="text-[10px] text-emerald-700/80 block mt-0.5">Paid out of pocket</span>
          </div>

          {/* Total Expense Responsibility */}
          <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
              Total Responsibility
            </span>
            <div className="mt-1 text-base font-bold text-rose-950 font-mono">
              {formatCurrency(stats.totalExpenseResponsibility)}
            </div>
            <span className="text-[10px] text-rose-700/80 block mt-0.5">
              Common: {formatCurrency(stats.commonExpenseShare, false)} | Personal: {formatCurrency(stats.personalExpenseResponsibility, false)}
            </span>
          </div>
        </div>

        {/* Detailed Financial Balance Calculation Card */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
            Comprehensive Ledger Accounting Equation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Common Expense Share:</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(stats.commonExpenseShare)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Personal Expense Incurred:</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(stats.personalExpenseResponsibility)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid on Behalf of {otherMemberName}:</span>
              <strong className="text-emerald-700 font-mono">{formatCurrency(stats.amountPaidOnBehalfOfOther)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Amount Owed to {otherMemberName}:</span>
              <strong className="text-rose-700 font-mono">{formatCurrency(stats.amountOwedToOther)}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
              <span className="text-slate-900">Net Expense Position (Paid - Share):</span>
              <span className={stats.netExpensePosition >= 0 ? 'text-emerald-700 font-bold font-mono' : 'text-rose-700 font-bold font-mono'}>
                {formatCurrency(stats.netExpensePosition)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
              <span className="text-slate-900">Total Member Account Balance:</span>
              <span className="text-slate-900 font-bold font-mono">
                {formatCurrency(stats.currentAccountBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Member Transaction History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Ledger Details ({memberLedgerEntries.length})
          </h3>
          <span className="text-xs text-slate-500">
            All expenses & deposits affecting {memberName}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount Paid</th>
                <th className="py-2.5 px-3 text-right">Expense Share</th>
                <th className="py-2.5 px-3 text-right">Net Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberLedgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No transactions recorded for this member in {currentMonth.name}.
                  </td>
                </tr>
              ) : (
                memberLedgerEntries.map((entry, idx) => (
                  <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          entry.type === 'Deposit'
                            ? 'bg-blue-100 text-blue-800'
                            : entry.type === 'Expense Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {entry.amountPaid > 0 ? formatCurrency(entry.amountPaid) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {entry.shareCharged > 0 ? formatCurrency(entry.shareCharged) : '—'}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        entry.impactOnPosition > 0
                          ? 'text-emerald-600'
                          : entry.impactOnPosition < 0
                          ? 'text-rose-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {entry.impactOnPosition > 0 ? '+' : ''}
                      {formatCurrency(entry.impactOnPosition)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
