import React from 'react';
import {
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Receipt,
  Scale,
  Calendar,
  Wallet,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { formatCurrency, formatDate, getExpenseFundStatus } from '../utils/calcEngine';

export const DashboardView: React.FC = () => {
  const {
    currentMonth,
    currentSettlement,
    db,
    setActiveTab,
    setIsExpenseModalOpen,
    setIsContributionModalOpen,
  } = useMess();

  const monthExpenses = [...db.expenses.filter((e) => e.monthId === currentMonth.id)].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const monthContributions = db.contributions.filter((c) => c.monthId === currentMonth.id);

  // Category breakdown calculation
  const categoryTotals = new Map<string, number>();
  for (const exp of monthExpenses) {
    const prev = categoryTotals.get(exp.categoryId) || 0;
    categoryTotals.set(exp.categoryId, prev + exp.amount);
  }

  const categoryMap = new Map(db.categories.map((c) => [c.id, c.name]));
  const sortedCategories = Array.from(categoryTotals.entries())
    .map(([catId, total]) => ({
      id: catId,
      name: categoryMap.get(catId) || catId,
      total,
      percentage: currentSettlement.totalExpenses > 0 ? (total / currentSettlement.totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Net Cash Balance in Mess Fund
  const messFundCash = currentSettlement.totalContributions - currentSettlement.totalExpenses;

  return (
    <div className="space-y-6">
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Common Expense */}
        <div className="bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/30 p-4 rounded-xl border border-indigo-100/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider leading-none">
                    Total Common Expense
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Shared Mess Living Cost
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                50/50 Split
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between">
              <div className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight font-mono">
                {formatCurrency(currentSettlement.totalCommonExpenses)}
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/80">
                {monthExpenses.length} {monthExpenses.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 mt-2 flex items-center justify-between border-t border-indigo-100/70 pt-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              50% Share Per Member
            </span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50/90 px-2 py-0.5 rounded border border-indigo-200/60 shadow-2xs">
              {formatCurrency(currentSettlement.commonExpensePerMember)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Contributions */}
        <div className="bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 p-4 rounded-xl border border-emerald-100/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider leading-none">
                    Total Contributions
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Collected Member Fund
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  currentSettlement.totalContributions - currentSettlement.totalExpenses >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-rose-50 text-rose-700 border-rose-200/80'
                }`}
              >
                {currentSettlement.totalContributions - currentSettlement.totalExpenses >= 0
                  ? 'Surplus Reserve'
                  : 'Fund Deficit'}
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between">
              <div className="text-2xl sm:text-[26px] font-extrabold text-emerald-600 tracking-tight font-mono">
                {formatCurrency(currentSettlement.totalContributions)}
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/80">
                {monthContributions.length} {monthContributions.length === 1 ? 'deposit' : 'deposits'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 mt-2 flex items-center justify-between border-t border-emerald-100/70 pt-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Surplus / Cash Reserve
            </span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded border shadow-2xs ${
                currentSettlement.totalContributions - currentSettlement.totalExpenses >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  : 'bg-rose-50 text-rose-700 border-rose-200/60'
              }`}
            >
              {currentSettlement.totalContributions - currentSettlement.totalExpenses >= 0 ? '+' : ''}
              {formatCurrency(currentSettlement.totalContributions - currentSettlement.totalExpenses)}
            </span>
          </div>
        </div>

        {/* Card 3: Current Settlement (High Density Dark Accent) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Settlement
              </div>
              <span className="text-[10px] font-semibold text-amber-400/90 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                {currentSettlement.isBalanced ? 'Balanced' : 'Breakdown'}
              </span>
            </div>

            {/* List System for Settlement Breakdown */}
            {currentSettlement.settlementItems && currentSettlement.settlementItems.length > 0 ? (
              <ul className="space-y-1.5 my-1">
                {currentSettlement.settlementItems.map((item) => (
                  <li
                    key={item.memberId}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
                      <span className="font-semibold text-slate-100 shrink-0 text-xs">{item.name}</span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${item.badgeClass}`}
                      >
                        {item.actionLabel}
                      </span>
                      {item.sourceNote && (
                        <span className="text-[10px] text-slate-400 truncate hidden xl:inline">
                          ({item.sourceNote})
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={`font-mono font-bold text-sm ${item.amountColor}`}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-lg font-bold text-amber-400 leading-snug">
                {currentSettlement.isBalanced
                  ? 'Accounts Balanced'
                  : currentSettlement.settlementMessage}
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {currentSettlement.isBalanced
                ? 'Net Difference'
                : currentSettlement.remainingFund > 0
                ? 'Remaining Cash Fund'
                : 'Settlement Amount'}
            </span>
            <span className="text-base font-bold text-white font-mono">
              {formatCurrency(currentSettlement.settlementAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Member Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Member 1: Tanvir Rana */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-800">Tanvir Rana</span>
              </div>
              <span className="text-xs text-slate-500 italic uppercase">Ledger Summary</span>
            </div>

            <div className="p-4 grid grid-cols-2 gap-y-2.5 text-sm">
              <div className="text-slate-500">Total Contributions</div>
              <div className="text-right font-bold text-emerald-600 font-mono">
                {formatCurrency(currentSettlement.tanvirStats.totalContributions)}
              </div>

              <div className="text-slate-500">Expenses Paid (Covered)</div>
              <div className="text-right font-bold text-slate-800 font-mono flex items-center justify-end gap-1.5">
                {formatCurrency(currentSettlement.tanvirStats.totalExpensesCovered)}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentSettlement.tanvirStats.isFullyPaid ? 'Paid' : 'Partial'}
                </span>
              </div>

              <div className="text-slate-500">Common Share (50%)</div>
              <div className="text-right text-rose-500 font-mono">
                - {formatCurrency(currentSettlement.tanvirStats.commonExpenseShare)}
              </div>

              {currentSettlement.tanvirStats.personalExpenseResponsibility > 0 && (
                <>
                  <div className="text-slate-500">Personal Expense</div>
                  <div className="text-right text-rose-500 font-mono">
                    - {formatCurrency(currentSettlement.tanvirStats.personalExpenseResponsibility)}
                  </div>
                </>
              )}

              <div className="text-slate-500">Unpaid Cost (Crossed)</div>
              <div
                className={`text-right font-mono font-bold flex items-center justify-end gap-1.5 ${
                  currentSettlement.tanvirStats.unpaidExpenseAmount > 0
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {currentSettlement.tanvirStats.unpaidExpenseAmount > 0
                  ? `- ${formatCurrency(currentSettlement.tanvirStats.unpaidExpenseAmount)}`
                  : 'SAR 0.00'}
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    currentSettlement.tanvirStats.unpaidExpenseAmount > 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {currentSettlement.tanvirStats.unpaidExpenseAmount > 0 ? 'Unpaid' : 'Paid in Full'}
                </span>
              </div>

              <div className="col-span-2 border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-500">Expense Net Standing</span>
                <span
                  className={`font-bold font-mono ${
                    currentSettlement.tanvirStats.currentAccountBalance >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {currentSettlement.tanvirStats.currentAccountBalance >= 0 ? '+ ' : '- '}
                  {formatCurrency(Math.abs(currentSettlement.tanvirStats.currentAccountBalance))}
                  {' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    {currentSettlement.tanvirStats.currentAccountBalance > 0.005
                      ? '(Surplus / Paid)'
                      : currentSettlement.tanvirStats.currentAccountBalance < -0.005
                      ? `(${formatCurrency(currentSettlement.tanvirStats.unpaidExpenseAmount)} Unpaid)`
                      : '(Settled)'}
                  </span>
                </span>
              </div>

              <div className="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex justify-between items-center">
                <span className="font-bold uppercase text-[11px] text-slate-700">Total Account Balance</span>
                <span className="font-black font-mono text-slate-900">
                  {formatCurrency(currentSettlement.tanvirStats.currentAccountBalance)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setActiveTab('contributions');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              View Contributions & Credits <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Member 2: Zilam Jahid */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="font-bold text-slate-800">Zilam Jahid</span>
              </div>
              <span className="text-xs text-slate-500 italic uppercase">Ledger Summary</span>
            </div>

            <div className="p-4 grid grid-cols-2 gap-y-2.5 text-sm">
              <div className="text-slate-500">Total Contributions</div>
              <div className="text-right font-bold text-emerald-600 font-mono">
                {formatCurrency(currentSettlement.zilamStats.totalContributions)}
              </div>

              <div className="text-slate-500">Expenses Paid (Covered)</div>
              <div className="text-right font-bold text-slate-800 font-mono flex items-center justify-end gap-1.5">
                {formatCurrency(currentSettlement.zilamStats.totalExpensesCovered)}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentSettlement.zilamStats.isFullyPaid ? 'Paid' : 'Partial'}
                </span>
              </div>

              <div className="text-slate-500">Common Share (50%)</div>
              <div className="text-right text-rose-500 font-mono">
                - {formatCurrency(currentSettlement.zilamStats.commonExpenseShare)}
              </div>

              {currentSettlement.zilamStats.personalExpenseResponsibility > 0 && (
                <>
                  <div className="text-slate-500">Personal Expense</div>
                  <div className="text-right text-rose-500 font-mono">
                    - {formatCurrency(currentSettlement.zilamStats.personalExpenseResponsibility)}
                  </div>
                </>
              )}

              <div className="text-slate-500">Unpaid Cost (Crossed)</div>
              <div
                className={`text-right font-mono font-bold flex items-center justify-end gap-1.5 ${
                  currentSettlement.zilamStats.unpaidExpenseAmount > 0
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {currentSettlement.zilamStats.unpaidExpenseAmount > 0
                  ? `- ${formatCurrency(currentSettlement.zilamStats.unpaidExpenseAmount)}`
                  : 'SAR 0.00'}
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    currentSettlement.zilamStats.unpaidExpenseAmount > 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {currentSettlement.zilamStats.unpaidExpenseAmount > 0 ? 'Unpaid' : 'Paid in Full'}
                </span>
              </div>

              <div className="col-span-2 border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-500">Expense Net Standing</span>
                <span
                  className={`font-bold font-mono ${
                    currentSettlement.zilamStats.currentAccountBalance >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {currentSettlement.zilamStats.currentAccountBalance >= 0 ? '+ ' : '- '}
                  {formatCurrency(Math.abs(currentSettlement.zilamStats.currentAccountBalance))}
                  {' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    {currentSettlement.zilamStats.currentAccountBalance > 0.005
                      ? '(Surplus / Paid)'
                      : currentSettlement.zilamStats.currentAccountBalance < -0.005
                      ? `(${formatCurrency(currentSettlement.zilamStats.unpaidExpenseAmount)} Unpaid)`
                      : '(Settled)'}
                  </span>
                </span>
              </div>

              <div className="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex justify-between items-center">
                <span className="font-bold uppercase text-[11px] text-slate-700">Total Account Balance</span>
                <span className="font-black font-mono text-slate-900">
                  {formatCurrency(currentSettlement.zilamStats.currentAccountBalance)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setActiveTab('contributions');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              View Contributions & Credits <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Columns: Category Breakdown & Recent Transactions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Expenses Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:col-span-1">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-700 text-sm">Category Spending</h3>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">
              {sortedCategories.length} Types
            </span>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No expenses recorded for this month yet.
            </div>
          ) : (
            <div className="mt-3.5 space-y-3">
              {sortedCategories.slice(0, 6).map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.name}</span>
                    <span className="font-mono text-slate-600 font-medium">
                      {formatCurrency(cat.total)} ({cat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col lg:col-span-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-sm">Recent Expenses</h3>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              All Expenses ({monthExpenses.length}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="px-4 py-2.5 border-b border-slate-200">Date</th>
                  <th className="px-4 py-2.5 border-b border-slate-200">Category</th>
                  <th className="px-4 py-2.5 border-b border-slate-200">Description</th>
                  <th className="px-4 py-2.5 border-b border-slate-200">Type</th>
                  <th className="px-4 py-2.5 border-b border-slate-200">Paid By</th>
                  <th className="px-4 py-2.5 border-b border-slate-200">Payment Status</th>
                  <th className="px-4 py-2.5 border-b border-slate-200 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {monthExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No expenses recorded for this month yet.
                    </td>
                  </tr>
                ) : (
                  monthExpenses.slice(0, 6).map((exp) => {
                    const fundStatus = getExpenseFundStatus(
                      exp,
                      db.expenses,
                      db.contributions,
                      currentMonth.id
                    );
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 text-slate-600 font-mono whitespace-nowrap">
                          {formatDate(exp.date)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                          {categoryMap[exp.categoryId] || 'General'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800 max-w-[160px] truncate">
                          {exp.description}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {exp.expenseType === 'common' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded uppercase font-bold">
                              Common
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold">
                              Personal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                exp.paidBy === 'total-fund'
                                  ? 'bg-purple-500'
                                  : exp.paidBy === 'tanvir-rana'
                                  ? 'bg-emerald-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            {exp.paidBy === 'total-fund'
                              ? 'Total Fund'
                              : exp.paidBy === 'tanvir-rana'
                              ? 'Tanvir'
                              : 'Zilam'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {fundStatus.statusText === 'Paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
