import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Receipt,
  Wallet,
  Users,
  Scale,
  Calendar,
  Layers,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { formatCurrency, formatDate, getExpenseFundStatus } from '../utils/calcEngine';
import {
  exportExpensesToCSV,
  exportContributionsToCSV,
  exportMonthlyReportToExcel,
  exportSettlementPDF,
} from '../utils/exportUtils';
import { openPrintReportInNewTab } from '../utils/printReport';

type ReportTab = 'expense' | 'contribution' | 'payment' | 'settlement' | 'statement';

export const ReportsView: React.FC = () => {
  const { currentMonth, currentSettlement, db, appSettings } = useMess();
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('statement');

  const monthExpenses = useMemo(
    () =>
      [...db.expenses.filter((e) => e.monthId === currentMonth.id)].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
      ),
    [db.expenses, currentMonth.id]
  );

  const monthContributions = useMemo(
    () =>
      [...db.contributions.filter((c) => c.monthId === currentMonth.id)].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
      ),
    [db.contributions, currentMonth.id]
  );

  const categoryMap = useMemo(
    () => new Map(db.categories.map((c) => [c.id, c.name])),
    [db.categories]
  );

  // Category totals
  const categorySummary = useMemo(() => {
    const map = new Map<string, { total: number; tanvirPaid: number; zilamPaid: number; fundPaid: number }>();
    for (const exp of monthExpenses) {
      const existing = map.get(exp.categoryId) || { total: 0, tanvirPaid: 0, zilamPaid: 0, fundPaid: 0 };
      existing.total += exp.amount;
      if (exp.paidBy === 'tanvir-rana') existing.tanvirPaid += exp.amount;
      else if (exp.paidBy === 'zilam-jahid') existing.zilamPaid += exp.amount;
      else existing.fundPaid += exp.amount;
      map.set(exp.categoryId, existing);
    }
    return Array.from(map.entries())
      .map(([catId, val]) => ({
        id: catId,
        name: categoryMap.get(catId) || catId,
        ...val,
        pct: currentSettlement.totalExpenses > 0 ? (val.total / currentSettlement.totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses, categoryMap, currentSettlement.totalExpenses]);

  // Daily totals
  const dailySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of monthExpenses) {
      map.set(exp.date, (map.get(exp.date) || 0) + exp.amount);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [monthExpenses]);

  const handlePrint = () => {
    openPrintReportInNewTab({
      month: currentMonth,
      settlement: currentSettlement,
      expenses: monthExpenses,
      contributions: monthContributions,
      categories: db.categories,
      settings: appSettings,
      activeTab: activeReportTab,
      formatCurrency,
    });
  };

  const handleExportExcel = () => {
    exportMonthlyReportToExcel(
      currentMonth,
      currentSettlement,
      monthExpenses,
      monthContributions,
      db.categories
    );
  };

  const handleExportPDF = () => {
    exportSettlementPDF(
      currentMonth,
      currentSettlement,
      monthExpenses,
      monthContributions,
      db.categories
    );
  };

  const handleExportCSV = () => {
    if (activeReportTab === 'contribution') {
      exportContributionsToCSV(monthContributions, currentMonth.name);
    } else {
      exportExpensesToCSV(monthExpenses, db.categories, currentMonth.name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Financial Reports & Statements
          </h2>
          <p className="text-xs text-slate-500">
            Export and print reports for <span className="font-semibold text-slate-700">{currentMonth.name}</span>
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV Export
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            PDF Statement
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Sub-tabs */}
      <div className="no-print flex items-center gap-1 overflow-x-auto bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => setActiveReportTab('statement')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'statement'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          Full Monthly Statement
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('expense')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'expense'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-rose-600" />
          Monthly Expense Report
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('payment')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'payment'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          Member Payment Report
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('contribution')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'contribution'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-amber-600" />
          Contribution Report
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('settlement')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'settlement'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-indigo-600" />
          Settlement Report
        </button>
      </div>

      {/* Printable Sheet Container (Clean White A4 Ready) */}
      <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs print:border-none print:shadow-none print:p-0">
        {/* Print Header */}
        <div className="pb-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {appSettings.appName}
              </h1>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {appSettings.appSubtitle || 'Official Financial Statement'} • {currentMonth.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {appSettings.messAddress ? `${appSettings.messAddress} | ` : ''}Members: Tanvir Rana & Zilam Jahid | Currency: {appSettings.currencySymbol}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs">
              <span className="inline-block px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] bg-slate-100 text-slate-800">
                Status: {currentMonth.status.toUpperCase()}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Generated: {formatDate(new Date().toISOString().split('T')[0])}
              </p>
            </div>
          </div>
        </div>

        {/* Tab 1: Full Monthly Statement */}
        {activeReportTab === 'statement' && (
          <div className="mt-6 space-y-6">
            {/* Settlement Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Official Settlement Verdict
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                {currentSettlement.settlementMessage}
              </h3>
            </div>

            {/* Financial Summary Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                1. Monthly Financial Reconciliation Table
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 min-w-[500px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-left border-b border-slate-200">Particulars</th>
                      <th className="py-2.5 px-3 text-right border-b border-slate-200">Tanvir Rana</th>
                      <th className="py-2.5 px-3 text-right border-b border-slate-200">Zilam Jahid</th>
                      <th className="py-2.5 px-3 text-right border-b border-slate-200">Total (SAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-3 text-slate-700">Opening Balance</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.openingBalance)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.openingBalance)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(currentSettlement.tanvirStats.openingBalance + currentSettlement.zilamStats.openingBalance)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-700">Fund Contributions</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.totalContributions)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.totalContributions)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-blue-700">{formatCurrency(currentSettlement.totalContributions)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Expenses Actually Paid</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">{formatCurrency(currentSettlement.tanvirStats.totalExpensesPaid)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">{formatCurrency(currentSettlement.zilamStats.totalExpensesPaid)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900">{formatCurrency(currentSettlement.totalExpenses)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-700 pl-6">• Common Expenses Share</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.commonExpenseShare)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.commonExpenseShare)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.totalCommonExpenses)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-700 pl-6">• Personal Expenses Responsibility</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.personalExpenseResponsibility)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.personalExpenseResponsibility)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.totalPersonalExpenses)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-semibold">
                      <td className="py-2 px-3 text-slate-900">Total Expense Responsibility</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.totalExpenseResponsibility)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.totalExpenseResponsibility)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(currentSettlement.totalExpenses)}</td>
                    </tr>
                    <tr className="bg-slate-100/80 font-bold">
                      <td className="py-2.5 px-3 text-slate-900">Net Expense Position (Paid − Share)</td>
                      <td className={`py-2.5 px-3 text-right font-mono ${currentSettlement.tanvirStats.netExpensePosition >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(currentSettlement.tanvirStats.netExpensePosition)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono ${currentSettlement.zilamStats.netExpensePosition >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(currentSettlement.zilamStats.netExpensePosition)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">SAR 0.00</td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-bold">
                      <td className="py-2.5 px-3 text-emerald-950">Closing Member Account Balance</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-950">
                        {formatCurrency(currentSettlement.tanvirStats.currentAccountBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-950">
                        {formatCurrency(currentSettlement.zilamStats.currentAccountBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-950 font-bold">
                        {formatCurrency(currentSettlement.tanvirStats.currentAccountBalance + currentSettlement.zilamStats.currentAccountBalance)}
                      </td>
                    </tr>
                    <tr className="bg-slate-200/50 font-bold">
                      <td className="py-2.5 px-3 text-slate-900">Final Month Settlement Action (Refund / Due)</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-800">
                        {currentSettlement.tanvirStats.currentAccountBalance > 0.005
                          ? `Receive ${formatCurrency(currentSettlement.tanvirStats.currentAccountBalance)}`
                          : currentSettlement.tanvirStats.currentAccountBalance < -0.005
                          ? `Pay ${formatCurrency(Math.abs(currentSettlement.tanvirStats.currentAccountBalance))}`
                          : 'Settled'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-800">
                        {currentSettlement.zilamStats.currentAccountBalance > 0.005
                          ? `Receive ${formatCurrency(currentSettlement.zilamStats.currentAccountBalance)}`
                          : currentSettlement.zilamStats.currentAccountBalance < -0.005
                          ? `Pay ${formatCurrency(Math.abs(currentSettlement.zilamStats.currentAccountBalance))}`
                          : 'Settled'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-900 font-bold">
                        {currentSettlement.remainingFund !== 0 ? formatCurrency(currentSettlement.remainingFund) : 'Balanced'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Expenses Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Category-Wise Expense Distribution
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 min-w-[550px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2 px-3 text-left border-b border-slate-200">Category</th>
                      <th className="py-2 px-3 text-right border-b border-slate-200">Total Amount</th>
                      <th className="py-2 px-3 text-right border-b border-slate-200">% of Total</th>
                      <th className="py-2 px-3 text-right border-b border-slate-200">Tanvir Paid</th>
                      <th className="py-2 px-3 text-right border-b border-slate-200">Zilam Paid</th>
                      <th className="py-2 px-3 text-right border-b border-slate-200">Total Fund Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {categorySummary.map((cat) => (
                      <tr key={cat.id}>
                        <td className="py-1.5 px-3 font-medium text-slate-800">{cat.name}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(cat.total)}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-600">{(cat.pct || 0).toFixed(1)}%</td>
                        <td className="py-1.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(cat.tanvirPaid)}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-blue-700">{formatCurrency(cat.zilamPaid)}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-purple-700">{formatCurrency(cat.fundPaid || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Monthly Expense Report */}
        {activeReportTab === 'expense' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Total Expenses:</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatCurrency(currentSettlement.totalExpenses)}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Common Expenses:</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatCurrency(currentSettlement.totalCommonExpenses)}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Personal Expenses:</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatCurrency(currentSettlement.totalPersonalExpenses)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Date</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Category</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Description</th>
                    <th className="py-2 px-3 text-right border-b border-slate-200">Amount</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Paid By</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Status</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Type</th>
                    <th className="py-2 px-3 text-right border-b border-slate-200">Tanvir Share</th>
                    <th className="py-2 px-3 text-right border-b border-slate-200">Zilam Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {monthExpenses.map((exp) => {
                    const fundStatus = getExpenseFundStatus(
                      exp,
                      db.expenses,
                      db.contributions,
                      currentMonth.id
                    );
                    return (
                      <tr key={exp.id}>
                        <td className="py-1.5 px-3 font-medium text-slate-700 whitespace-nowrap">{formatDate(exp.date)}</td>
                        <td className="py-1.5 px-3 text-slate-600">{categoryMap.get(exp.categoryId) || 'General'}</td>
                        <td className="py-1.5 px-3 font-medium text-slate-800">{exp.description}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(exp.amount)}</td>
                        <td className="py-1.5 px-3 text-slate-700 whitespace-nowrap">
                          {exp.paidBy === 'total-fund'
                            ? 'Total Fund'
                            : exp.paidBy === 'tanvir-rana'
                            ? 'Tanvir Rana'
                            : 'Zilam Jahid'}
                        </td>
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          {fundStatus.statusText === 'Paid' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Paid
                            </span>
                          ) : fundStatus.statusText === 'Partial' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">{exp.expenseType === 'common' ? 'Common' : 'Personal'}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(exp.tanvirShare)}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-blue-700">{formatCurrency(exp.zilamShare)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Member Payment Report */}
        {activeReportTab === 'payment' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs">
                <h5 className="font-bold text-emerald-950 text-sm">Tanvir Rana Actual Payments</h5>
                <p className="text-emerald-800 mt-1">Total Paid (Direct): <strong className="text-base font-mono">{formatCurrency(currentSettlement.tanvirStats.totalExpensesPaid)}</strong></p>
                <div className="mt-3 space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Expenses Paid (Covered):</span>
                    <span className="font-mono font-bold text-emerald-700">{formatCurrency(currentSettlement.tanvirStats.totalExpensesCovered)} ({currentSettlement.tanvirStats.paymentStatus})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Covered from Fund:</span>
                    <span className="font-mono">{formatCurrency(currentSettlement.tanvirStats.expensesPaidFromFund)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Common Expenses Paid:</span>
                    <span className="font-mono">{formatCurrency(currentSettlement.tanvirStats.commonExpensesPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Personal Expenses Paid:</span>
                    <span className="font-mono">{formatCurrency(currentSettlement.tanvirStats.personalExpensesPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid on Behalf of Zilam:</span>
                    <span className="font-mono text-emerald-700 font-bold">{formatCurrency(currentSettlement.tanvirStats.amountPaidOnBehalfOfOther)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs">
                <h5 className="font-bold text-blue-950 text-sm">Zilam Jahid Actual Payments</h5>
                <p className="text-blue-800 mt-1">Total Paid (Direct): <strong className="text-base font-mono">{formatCurrency(currentSettlement.zilamStats.totalExpensesPaid)}</strong></p>
                <div className="mt-3 space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Expenses Paid (Covered):</span>
                    <span className="font-mono font-bold text-blue-700">{formatCurrency(currentSettlement.zilamStats.totalExpensesCovered)} ({currentSettlement.zilamStats.paymentStatus})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Covered from Fund:</span>
                    <span className="font-mono">{formatCurrency(currentSettlement.zilamStats.expensesPaidFromFund)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Common Expenses Paid:</span>
                    <span className="font-mono">{formatCurrency(currentSettlement.zilamStats.commonExpensesPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Personal Expenses Paid:</span>
                    <span className="font-mono">{formatCurrency(currentSettlement.zilamStats.personalExpensesPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid on Behalf of Tanvir:</span>
                    <span className="font-mono text-blue-700 font-bold">{formatCurrency(currentSettlement.zilamStats.amountPaidOnBehalfOfOther)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Member Contribution Report */}
        {activeReportTab === 'contribution' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-blue-700 block font-semibold">Total Fund Collected:</span>
                <span className="text-base font-bold text-blue-950 font-mono">{formatCurrency(currentSettlement.totalContributions)}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-emerald-700 block font-semibold">Tanvir Rana Contributed:</span>
                <span className="text-base font-bold text-emerald-950 font-mono">{formatCurrency(currentSettlement.tanvirStats.totalContributions)}</span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="text-indigo-700 block font-semibold">Zilam Jahid Contributed:</span>
                <span className="text-base font-bold text-indigo-950 font-mono">{formatCurrency(currentSettlement.zilamStats.totalContributions)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 min-w-[520px]">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Date</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Member</th>
                    <th className="py-2 px-3 text-right border-b border-slate-200">Amount</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Method</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Reference</th>
                    <th className="py-2 px-3 text-left border-b border-slate-200">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {monthContributions.map((con) => (
                    <tr key={con.id}>
                      <td className="py-2 px-3 font-medium text-slate-700">{formatDate(con.date)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{con.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(con.amount)}</td>
                      <td className="py-2 px-3 text-slate-600">{con.paymentMethod}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono">{con.reference || '—'}</td>
                      <td className="py-2 px-3 text-slate-500">{con.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Settlement Report */}
        {activeReportTab === 'settlement' && (
          <div className="mt-6 space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-sm font-bold">
              {currentSettlement.settlementMessage}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">Tanvir Rana Position</h5>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Expenses Paid (Covered):</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(currentSettlement.tanvirStats.totalExpensesCovered)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Expense Responsibility:</span>
                  <span className="font-mono text-slate-900">{formatCurrency(currentSettlement.tanvirStats.totalExpenseResponsibility)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Unpaid Cost (Crossed):</span>
                  <span className={`font-mono font-bold ${currentSettlement.tanvirStats.unpaidExpenseAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {currentSettlement.tanvirStats.unpaidExpenseAmount > 0 ? formatCurrency(currentSettlement.tanvirStats.unpaidExpenseAmount) : 'SAR 0.00 (Paid)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold bg-slate-50 px-2 rounded">
                  <span>Expense Net Standing:</span>
                  <span className={currentSettlement.tanvirStats.netExpensePosition >= 0 ? 'text-emerald-700 font-mono' : 'text-rose-700 font-mono'}>
                    {formatCurrency(currentSettlement.tanvirStats.netExpensePosition)}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">Zilam Jahid Position</h5>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Expenses Paid (Covered):</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(currentSettlement.zilamStats.totalExpensesCovered)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Expense Responsibility:</span>
                  <span className="font-mono text-slate-900">{formatCurrency(currentSettlement.zilamStats.totalExpenseResponsibility)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Unpaid Cost (Crossed):</span>
                  <span className={`font-mono font-bold ${currentSettlement.zilamStats.unpaidExpenseAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {currentSettlement.zilamStats.unpaidExpenseAmount > 0 ? formatCurrency(currentSettlement.zilamStats.unpaidExpenseAmount) : 'SAR 0.00 (Paid)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold bg-slate-50 px-2 rounded">
                  <span>Expense Net Standing:</span>
                  <span className={currentSettlement.zilamStats.netExpensePosition >= 0 ? 'text-emerald-700 font-mono' : 'text-rose-700 font-mono'}>
                    {formatCurrency(currentSettlement.zilamStats.netExpensePosition)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Footer Signatures */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-500">
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mx-auto mb-2" />
            <span className="font-semibold text-slate-800 block">Tanvir Rana</span>
            <span className="text-[11px]">Member Signature & Date</span>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mx-auto mb-2" />
            <span className="font-semibold text-slate-800 block">Zilam Jahid</span>
            <span className="text-[11px]">Member Signature & Date</span>
          </div>
        </div>
      </div>
    </div>
  );
};
