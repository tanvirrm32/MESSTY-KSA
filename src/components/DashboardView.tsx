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
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { formatCurrency, formatDate } from '../utils/calcEngine';

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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Total Common Expense
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(currentSettlement.totalCommonExpenses)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>50% Share Per Member</span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(currentSettlement.commonExpensePerMember)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Contributions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Total Contributions
            </div>
            <div className="text-2xl font-bold text-emerald-600 tracking-tight">
              {formatCurrency(currentSettlement.totalContributions)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Surplus / Cash Reserve</span>
            <span
              className={`font-semibold ${
                currentSettlement.totalContributions - currentSettlement.totalExpenses >= 0
                  ? 'text-emerald-700'
                  : 'text-rose-600'
              }`}
            >
              {formatCurrency(currentSettlement.totalContributions - currentSettlement.totalExpenses)}
            </span>
          </div>
        </div>

        {/* Card 3: Current Settlement (High Density Dark Accent) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm text-white flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Current Settlement
            </div>
            <div className="text-lg font-bold text-amber-400 leading-snug">
              {currentSettlement.isBalanced
                ? 'Accounts Balanced'
                : currentSettlement.settlementMessage}
            </div>
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

            <div className="p-4 grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500">Total Contributions</div>
              <div className="text-right font-bold text-emerald-600 font-mono">
                {formatCurrency(currentSettlement.tanvirStats.totalContributions)}
              </div>

              <div className="text-slate-500">Actual Expenses Paid</div>
              <div className="text-right font-bold text-slate-800 font-mono">
                {formatCurrency(currentSettlement.tanvirStats.totalExpensesPaid)}
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

              <div className="col-span-2 border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-500">Expense Net (Paid − Share)</span>
                <span
                  className={`font-bold font-mono ${
                    currentSettlement.tanvirStats.netExpensePosition >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {currentSettlement.tanvirStats.netExpensePosition >= 0 ? '+ ' : '- '}
                  {formatCurrency(Math.abs(currentSettlement.tanvirStats.netExpensePosition))}
                  {' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    {currentSettlement.tanvirStats.netExpensePosition > 0.005
                      ? '(Overpaid)'
                      : currentSettlement.tanvirStats.netExpensePosition < -0.005
                      ? '(Underpaid)'
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

            <div className="p-4 grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500">Total Contributions</div>
              <div className="text-right font-bold text-emerald-600 font-mono">
                {formatCurrency(currentSettlement.zilamStats.totalContributions)}
              </div>

              <div className="text-slate-500">Actual Expenses Paid</div>
              <div className="text-right font-bold text-slate-800 font-mono">
                {formatCurrency(currentSettlement.zilamStats.totalExpensesPaid)}
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

              <div className="col-span-2 border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-500">Expense Net (Paid − Share)</span>
                <span
                  className={`font-bold font-mono ${
                    currentSettlement.zilamStats.netExpensePosition >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {currentSettlement.zilamStats.netExpensePosition >= 0 ? '+ ' : '- '}
                  {formatCurrency(Math.abs(currentSettlement.zilamStats.netExpensePosition))}
                  {' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    {currentSettlement.zilamStats.netExpensePosition > 0.005
                      ? '(Overpaid)'
                      : currentSettlement.zilamStats.netExpensePosition < -0.005
                      ? '(Underpaid)'
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
                  <th className="px-4 py-2.5 border-b border-slate-200 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {monthExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No expenses recorded for this month yet.
                    </td>
                  </tr>
                ) : (
                  monthExpenses.slice(0, 6).map((exp) => (
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
                              exp.paidBy === 'tanvir-rana' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                          />
                          {exp.paidBy === 'tanvir-rana' ? 'Tanvir' : 'Zilam'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
