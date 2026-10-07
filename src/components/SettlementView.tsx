import React, { useState } from 'react';
import {
  Scale,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  Download,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { formatCurrency } from '../utils/calcEngine';
import { exportMonthlyReportToExcel, exportSettlementPDF } from '../utils/exportUtils';
import { openPrintReportInNewTab } from '../utils/printReport';
import { ConfirmModal } from './ConfirmModal';

export const SettlementView: React.FC = () => {
  const {
    currentMonth,
    currentSettlement,
    db,
    finalizeMonth,
    reopenMonth,
    setCurrentMonthId,
    createMonth,
  } = useMess();

  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  const isFinalized = currentMonth.status === 'finalized' || Boolean(currentSettlement.isClosed);
  const nextMonthAvailable = db.months.find((m) => m.id > currentMonth.id);

  const monthExpenses = db.expenses.filter((e) => e.monthId === currentMonth.id);
  const monthContributions = db.contributions.filter((c) => c.monthId === currentMonth.id);

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

  const handlePrint = () => {
    openPrintReportInNewTab({
      month: currentMonth,
      settlement: currentSettlement,
      expenses: monthExpenses,
      contributions: monthContributions,
      categories: db.categories,
      settings: db.settings,
      activeTab: 'settlement',
      formatCurrency,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Month-End Financial Settlement
          </h2>
          <p className="text-xs text-slate-500">
            Official closing & reconciliation for <span className="font-semibold text-slate-700">{currentMonth.name}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            PDF Statement
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print
          </button>

          {isFinalized ? (
            <button
              type="button"
              onClick={() => setIsReopenModalOpen(true)}
              className="no-print flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              <Unlock className="w-3.5 h-3.5" />
              Reopen Month
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsFinalizeModalOpen(true)}
              className="no-print flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all shadow-2xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalize Month
            </button>
          )}
        </div>
      </div>

      {/* Finalized Month Action Banner */}
      {isFinalized && (
        <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-emerald-950">
                  Month Finalized & Settlement Closed
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                  Settled
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Settlement for {currentMonth.name} is officially closed. All accounts were reconciled and all dues settled.
                {nextMonthAvailable
                  ? ` You can now proceed to ${nextMonthAvailable.name}.`
                  : ' Ready to create the next month for new expenses and deposits.'}
              </p>
            </div>
          </div>
          {nextMonthAvailable ? (
            <button
              type="button"
              onClick={() => setCurrentMonthId(nextMonthAvailable.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Go to {nextMonthAvailable.name} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const nextYear = currentMonth.monthNumber === 12 ? currentMonth.year + 1 : currentMonth.year;
                const nextMonthNum = currentMonth.monthNumber === 12 ? 1 : currentMonth.monthNumber + 1;
                createMonth(nextYear, nextMonthNum);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              + Start Next Month <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Settlement Verdict Box */}
      <div
        className={`p-5 rounded-xl border shadow-sm ${
          isFinalized
            ? 'bg-emerald-50/90 border-emerald-300'
            : currentSettlement.isBalanced
            ? 'bg-emerald-50/90 border-emerald-200'
            : 'bg-amber-50/90 border-amber-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Settlement Calculation Verdict
              </span>
              {isFinalized && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settlement Closed
                </span>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {currentSettlement.settlementMessage}
            </h3>
            <p className="text-xs text-slate-600 mt-2 max-w-xl">
              {isFinalized ? (
                <>
                  Settlement amount is officially closed and finalized. The new month begins fresh according to its own transactions.
                </>
              ) : (
                <>
                  Calculated based on actual contributions vs expense share: <br />
                  <code className="font-mono text-[11px] bg-white/70 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200/60">
                    Deposit − Expense Share = Member Refund from Remaining Fund
                  </code>
                </>
              )}
            </p>
          </div>

          <div className="shrink-0">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isFinalized ? 'Settlement Amount' : 'Remaining Fund'}
              </span>
              <span className="text-2xl font-black font-mono text-slate-900 block mt-0.5">
                {isFinalized ? 'SAR 0.00' : formatCurrency(currentSettlement.remainingFund)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {isFinalized
                  ? 'Closed (Settled upon finalization)'
                  : currentSettlement.isBalanced
                  ? 'No refund needed'
                  : 'Available for member refund'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Equal Share Common Expense Settlement Card (Explicit 50/50 Division) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900">
                Equal Share Common Expense Settlement
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                50 / 50 Split
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Equal Share per Person = Total Common Expense ÷ 2. Balance = Contribution − Equal Share.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isFinalized
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : currentSettlement.isBalanced
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {isFinalized
                ? 'Settlement Closed'
                : currentSettlement.isBalanced
                ? 'Fully Settled'
                : 'Action Required'}
            </span>
          </div>
        </div>

        {/* Top 2 Metrics: Total Common Expense & Equal Share per Person */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Common Expense
            </span>
            <span className="text-2xl font-black font-mono text-slate-900 block mt-1">
              {formatCurrency(currentSettlement.totalCommonExpenses)}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Sum of all shared mess expenses in {currentMonth.name}
            </span>
          </div>

          <div className="bg-blue-50/70 rounded-xl p-3.5 border border-blue-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
              Equal Share per Person (÷ 2)
            </span>
            <span className="text-2xl font-black font-mono text-blue-950 block mt-1">
              {formatCurrency(currentSettlement.equalSharePerPerson)}
            </span>
            <span className="text-[11px] text-blue-700 mt-0.5 block">
              SAR {currentSettlement.totalCommonExpenses.toFixed(2)} ÷ 2 = {formatCurrency(currentSettlement.equalSharePerPerson)} / person
            </span>
          </div>
        </div>

        {/* Two-Column Breakdown: Tanvir & Zilam */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Tanvir Contribution & Standing */}
          <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  TR
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Tanvir Rana</h4>
                  <span className="text-[11px] text-slate-500">Contribution vs Equal Share</span>
                </div>
              </div>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                  isFinalized
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentSettlement.tanvirStanding === 'Receivable'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentSettlement.tanvirStanding === 'Payable'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {isFinalized
                  ? 'Settled (Closed)'
                  : currentSettlement.tanvirStanding === 'Receivable'
                  ? 'Receivable'
                  : currentSettlement.tanvirStanding === 'Payable'
                  ? 'Payable'
                  : 'Settled / No Balance'}
              </span>
            </div>

            <div className="bg-white rounded-lg p-3 border border-emerald-100 divide-y divide-slate-100 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Tanvir Contribution:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(currentSettlement.tanvirContribution)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Equal Share Target:</span>
                <span className="font-mono text-slate-600">
                  - {formatCurrency(currentSettlement.equalSharePerPerson)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 font-bold">
                <span className="text-slate-800">Tanvir Balance:</span>
                <span
                  className={`font-mono text-sm ${
                    currentSettlement.tanvirBalance > 0.005
                      ? 'text-emerald-700'
                      : currentSettlement.tanvirBalance < -0.005
                      ? 'text-rose-700'
                      : 'text-slate-700'
                  }`}
                >
                  {isFinalized ? (
                    <span className="text-emerald-700">SAR 0.00 (Settled)</span>
                  ) : currentSettlement.tanvirStanding === 'Receivable' ? (
                    `+${formatCurrency(currentSettlement.tanvirAmount)} (Receivable)`
                  ) : currentSettlement.tanvirStanding === 'Payable' ? (
                    `-${formatCurrency(currentSettlement.tanvirAmount)} (Payable)`
                  ) : (
                    'SAR 0.00 (Settled)'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Zilam Contribution & Standing */}
          <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  ZJ
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Zilam Jahid</h4>
                  <span className="text-[11px] text-slate-500">Contribution vs Equal Share</span>
                </div>
              </div>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                  isFinalized
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentSettlement.zilamStanding === 'Receivable'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentSettlement.zilamStanding === 'Payable'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {isFinalized
                  ? 'Settled (Closed)'
                  : currentSettlement.zilamStanding === 'Receivable'
                  ? 'Receivable'
                  : currentSettlement.zilamStanding === 'Payable'
                  ? 'Payable'
                  : 'Settled / No Balance'}
              </span>
            </div>

            <div className="bg-white rounded-lg p-3 border border-blue-100 divide-y divide-slate-100 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Zilam Contribution:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(currentSettlement.zilamContribution)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Equal Share Target:</span>
                <span className="font-mono text-slate-600">
                  - {formatCurrency(currentSettlement.equalSharePerPerson)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 font-bold">
                <span className="text-slate-800">Zilam Balance:</span>
                <span
                  className={`font-mono text-sm ${
                    currentSettlement.zilamBalance > 0.005
                      ? 'text-emerald-700'
                      : currentSettlement.zilamBalance < -0.005
                      ? 'text-rose-700'
                      : 'text-slate-700'
                  }`}
                >
                  {isFinalized ? (
                    <span className="text-emerald-700">SAR 0.00 (Settled)</span>
                  ) : currentSettlement.zilamStanding === 'Receivable' ? (
                    `+${formatCurrency(currentSettlement.zilamAmount)} (Receivable)`
                  ) : currentSettlement.zilamStanding === 'Payable' ? (
                    `-${formatCurrency(currentSettlement.zilamAmount)} (Payable)`
                  ) : (
                    'SAR 0.00 (Settled)'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Balanced Mutual Settlement Verdict Footer */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-slate-700">
              <strong className="text-slate-900">Mutual Balanced Settlement:</strong>{' '}
              {isFinalized
                ? 'Settlement Closed (Month Finalized). All dues settled and accounts closed.'
                : currentSettlement.settlementMessage}
            </span>
          </div>
          <span className="font-mono font-black text-slate-900 shrink-0 sm:self-auto self-end">
            {isFinalized ? 'SAR 0.00 (Closed)' : formatCurrency(currentSettlement.settlementAmount)}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tanvir Rana Column */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                TR
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Tanvir Rana</h4>
                <span className="text-xs text-slate-500">Member Financial Position</span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                currentSettlement.tanvirStats.currentAccountBalance > 0.005
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentSettlement.tanvirStats.currentAccountBalance < -0.005
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {currentSettlement.tanvirStats.currentAccountBalance > 0.005
                ? 'To Receive'
                : currentSettlement.tanvirStats.currentAccountBalance < -0.005
                ? 'To Pay'
                : 'Balanced'}
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Opening Balance:</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.tanvirStats.openingBalance)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Total Contribution (Mess Fund):</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.tanvirStats.totalContributions)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 items-center">
              <span className="text-slate-600">Expenses Paid (Covered):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(currentSettlement.tanvirStats.totalExpensesCovered)}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentSettlement.tanvirStats.isFullyPaid ? 'Paid' : 'Partial'}
                </span>
              </div>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Covered from Total Fund:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.tanvirStats.expensesPaidFromFund)}</span>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Direct Out-of-Pocket Paid:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.tanvirStats.totalExpensesPaid)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Common Expense Share (Responsibility):</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.tanvirStats.commonExpenseShare)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Personal Expense (Responsibility):</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.tanvirStats.personalExpenseResponsibility)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Total Expense Responsibility:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(currentSettlement.tanvirStats.totalExpenseResponsibility)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 items-center">
              <span className="text-slate-600">Unpaid Cost (Crossed Contribution):</span>
              <div className="flex items-center gap-1.5">
                <span className={`font-mono font-bold ${currentSettlement.tanvirStats.unpaidExpenseAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {currentSettlement.tanvirStats.unpaidExpenseAmount > 0
                    ? `- ${formatCurrency(currentSettlement.tanvirStats.unpaidExpenseAmount)}`
                    : 'SAR 0.00'}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  currentSettlement.tanvirStats.unpaidExpenseAmount > 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {currentSettlement.tanvirStats.unpaidExpenseAmount > 0 ? 'Unpaid' : 'Paid in Full'}
                </span>
              </div>
            </div>
            <div className="flex justify-between py-2 bg-slate-50 px-2 rounded-lg font-bold">
              <span className="text-slate-800">Net Expense Standing:</span>
              <span
                className={`font-mono ${
                  currentSettlement.tanvirStats.netExpensePosition >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {currentSettlement.tanvirStats.netExpensePosition >= 0 ? '+' : ''}
                {formatCurrency(currentSettlement.tanvirStats.netExpensePosition)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">
                  {currentSettlement.tanvirStats.netExpensePosition >= 0 ? '(Surplus / Paid)' : '(Underpaid)'}
                </span>
              </span>
            </div>
            <div className="flex justify-between py-2 bg-emerald-50/60 px-2 rounded-lg font-bold">
              <span className="text-emerald-900">Total Closing Account Balance:</span>
              <span className="font-mono text-emerald-950 font-black">
                {formatCurrency(currentSettlement.tanvirStats.currentAccountBalance)}
              </span>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <span className="text-slate-900">Final Settlement Standing:</span>
              <span
                className={`font-mono text-sm ${
                  currentSettlement.tanvirStats.currentAccountBalance > 0.005
                    ? 'text-emerald-700'
                    : currentSettlement.tanvirStats.currentAccountBalance < -0.005
                    ? 'text-rose-700'
                    : 'text-slate-700'
                }`}
              >
                {currentSettlement.tanvirStats.currentAccountBalance > 0.005
                  ? `Receive ${formatCurrency(currentSettlement.tanvirStats.currentAccountBalance)}`
                  : currentSettlement.tanvirStats.currentAccountBalance < -0.005
                  ? `Pay ${formatCurrency(Math.abs(currentSettlement.tanvirStats.currentAccountBalance))}`
                  : 'Balanced (SAR 0.00)'}
              </span>
            </div>
          </div>
        </div>

        {/* Zilam Jahid Column */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center">
                ZJ
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Zilam Jahid</h4>
                <span className="text-xs text-slate-500">Member Financial Position</span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                currentSettlement.zilamStats.currentAccountBalance > 0.005
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentSettlement.zilamStats.currentAccountBalance < -0.005
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {currentSettlement.zilamStats.currentAccountBalance > 0.005
                ? 'To Receive'
                : currentSettlement.zilamStats.currentAccountBalance < -0.005
                ? 'To Pay'
                : 'Balanced'}
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Opening Balance:</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.zilamStats.openingBalance)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Total Contribution (Mess Fund):</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.zilamStats.totalContributions)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 items-center">
              <span className="text-slate-600">Expenses Paid (Covered):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(currentSettlement.zilamStats.totalExpensesCovered)}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentSettlement.zilamStats.isFullyPaid ? 'Paid' : 'Partial'}
                </span>
              </div>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Covered from Total Fund:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.zilamStats.expensesPaidFromFund)}</span>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Direct Out-of-Pocket Paid:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.zilamStats.totalExpensesPaid)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Common Expense Share (Responsibility):</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.zilamStats.commonExpenseShare)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Personal Expense (Responsibility):</span>
              <span className="font-mono font-medium text-slate-900">
                {formatCurrency(currentSettlement.zilamStats.personalExpenseResponsibility)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Total Expense Responsibility:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(currentSettlement.zilamStats.totalExpenseResponsibility)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 items-center">
              <span className="text-slate-600">Unpaid Cost (Crossed Contribution):</span>
              <div className="flex items-center gap-1.5">
                <span className={`font-mono font-bold ${currentSettlement.zilamStats.unpaidExpenseAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {currentSettlement.zilamStats.unpaidExpenseAmount > 0
                    ? `- ${formatCurrency(currentSettlement.zilamStats.unpaidExpenseAmount)}`
                    : 'SAR 0.00'}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  currentSettlement.zilamStats.unpaidExpenseAmount > 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {currentSettlement.zilamStats.unpaidExpenseAmount > 0 ? 'Unpaid' : 'Paid in Full'}
                </span>
              </div>
            </div>
            <div className="flex justify-between py-2 bg-slate-50 px-2 rounded-lg font-bold">
              <span className="text-slate-800">Net Expense Standing:</span>
              <span
                className={`font-mono ${
                  currentSettlement.zilamStats.netExpensePosition >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {currentSettlement.zilamStats.netExpensePosition >= 0 ? '+' : ''}
                {formatCurrency(currentSettlement.zilamStats.netExpensePosition)}
                <span className="text-[10px] font-normal text-slate-500 ml-1">
                  {currentSettlement.zilamStats.netExpensePosition >= 0 ? '(Surplus / Paid)' : '(Underpaid)'}
                </span>
              </span>
            </div>
            <div className="flex justify-between py-2 bg-blue-50/60 px-2 rounded-lg font-bold">
              <span className="text-blue-900">Total Closing Account Balance:</span>
              <span className="font-mono text-blue-950 font-black">
                {formatCurrency(currentSettlement.zilamStats.currentAccountBalance)}
              </span>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <span className="text-slate-900">Final Settlement Standing:</span>
              <span
                className={`font-mono text-sm ${
                  currentSettlement.zilamStats.currentAccountBalance > 0.005
                    ? 'text-emerald-700'
                    : currentSettlement.zilamStats.currentAccountBalance < -0.005
                    ? 'text-rose-700'
                    : 'text-slate-700'
                }`}
              >
                {currentSettlement.zilamStats.currentAccountBalance > 0.005
                  ? `Receive ${formatCurrency(currentSettlement.zilamStats.currentAccountBalance)}`
                  : currentSettlement.zilamStats.currentAccountBalance < -0.005
                  ? `Pay ${formatCurrency(Math.abs(currentSettlement.zilamStats.currentAccountBalance))}`
                  : 'Balanced (SAR 0.00)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Summary Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Reconciliation & Settlement Ledger Table
          </h4>
          <span className="text-xs font-mono text-slate-500">
            Audit Check: Δ = {(((currentSettlement?.tanvirStats?.netExpensePosition || 0) + (currentSettlement?.zilamStats?.netExpensePosition || 0))).toFixed(2)} SAR
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[540px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Financial Ledger Component</th>
                <th className="py-3 px-4 text-right">Tanvir Rana</th>
                <th className="py-3 px-4 text-right">Zilam Jahid</th>
                <th className="py-3 px-4 text-right">Total Mess Combined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-700">1. Opening Balance</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.openingBalance)}</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.openingBalance)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">{formatCurrency(currentSettlement.tanvirStats.openingBalance + currentSettlement.zilamStats.openingBalance)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-700">2. Fund Contributions</td>
                <td className="py-2.5 px-4 text-right font-mono text-blue-700">{formatCurrency(currentSettlement.tanvirStats.totalContributions)}</td>
                <td className="py-2.5 px-4 text-right font-mono text-blue-700">{formatCurrency(currentSettlement.zilamStats.totalContributions)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-900">{formatCurrency(currentSettlement.totalContributions)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-700">3. Actual Amount Paid (Expenses)</td>
                <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-semibold">{formatCurrency(currentSettlement.tanvirStats.totalExpensesPaid)}</td>
                <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-semibold">{formatCurrency(currentSettlement.zilamStats.totalExpensesPaid)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(currentSettlement.totalExpenses)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-700">4. Common Expense Share</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.commonExpenseShare)}</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.commonExpenseShare)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">{formatCurrency(currentSettlement.totalCommonExpenses)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-700">5. Personal Expenses</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(currentSettlement.tanvirStats.personalExpenseResponsibility)}</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(currentSettlement.zilamStats.personalExpenseResponsibility)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">{formatCurrency(currentSettlement.totalPersonalExpenses)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900 bg-slate-50/50">6. Total Expense Responsibility (4 + 5)</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold bg-slate-50/50">{formatCurrency(currentSettlement.tanvirStats.totalExpenseResponsibility)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold bg-slate-50/50">{formatCurrency(currentSettlement.zilamStats.totalExpenseResponsibility)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold bg-slate-50/50">{formatCurrency(currentSettlement.totalExpenses)}</td>
              </tr>
              <tr className="bg-slate-100/70 font-bold">
                <td className="py-3 px-4 text-slate-900">7. Net Expense Position (3 − 6)</td>
                <td className={`py-3 px-4 text-right font-mono ${currentSettlement.tanvirStats.netExpensePosition >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(currentSettlement.tanvirStats.netExpensePosition)}
                </td>
                <td className={`py-3 px-4 text-right font-mono ${currentSettlement.zilamStats.netExpensePosition >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(currentSettlement.zilamStats.netExpensePosition)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">SAR 0.00 (Balanced)</td>
              </tr>
              <tr className="bg-emerald-50/50 font-bold border-t border-emerald-200">
                <td className="py-3 px-4 text-emerald-950">8. Closing Member Account Balance (1 + 2 + 7)</td>
                <td className="py-3 px-4 text-right font-mono text-emerald-950">
                  {formatCurrency(currentSettlement.tanvirStats.currentAccountBalance)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-blue-950">
                  {formatCurrency(currentSettlement.zilamStats.currentAccountBalance)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-950">
                  {formatCurrency(currentSettlement.tanvirStats.currentAccountBalance + currentSettlement.zilamStats.currentAccountBalance)}
                </td>
              </tr>
              <tr className="bg-amber-50/60 font-bold border-t border-amber-200">
                <td className="py-3 px-4 text-amber-950">9. Settlement Action (Refund / Due)</td>
                <td className="py-3 px-4 text-right font-mono text-xs">
                  {isFinalized
                    ? 'Settled (Closed)'
                    : currentSettlement.tanvirStats.currentAccountBalance > 0.005
                    ? `Receive ${formatCurrency(currentSettlement.tanvirStats.currentAccountBalance)}`
                    : currentSettlement.tanvirStats.currentAccountBalance < -0.005
                    ? `Pay ${formatCurrency(Math.abs(currentSettlement.tanvirStats.currentAccountBalance))}`
                    : 'Balanced'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs">
                  {isFinalized
                    ? 'Settled (Closed)'
                    : currentSettlement.zilamStats.currentAccountBalance > 0.005
                    ? `Receive ${formatCurrency(currentSettlement.zilamStats.currentAccountBalance)}`
                    : currentSettlement.zilamStats.currentAccountBalance < -0.005
                    ? `Pay ${formatCurrency(Math.abs(currentSettlement.zilamStats.currentAccountBalance))}`
                    : 'Balanced'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-950 font-black">
                  {isFinalized ? 'Settled / Closed' : currentSettlement.remainingFund !== 0 ? formatCurrency(currentSettlement.remainingFund) : 'Balanced'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isFinalizeModalOpen}
        title={`Finalize Month: ${currentMonth.name}?`}
        message="Finalizing this month will lock all transactions from modification, close the settlement amount, and reconcile all member balances. The next month will start fresh according to its own transactions with previous settlement closed."
        confirmLabel="Finalize & Close Settlement"
        onConfirm={() => {
          finalizeMonth(currentMonth.id);
          setIsFinalizeModalOpen(false);
        }}
        onCancel={() => setIsFinalizeModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isReopenModalOpen}
        title={`Reopen Month: ${currentMonth.name}?`}
        message="Are you sure you want to reopen this finalized month? Reopening allows adding, modifying, or deleting transactions, which will update the settlement results."
        confirmLabel="Reopen Month"
        isDestructive={false}
        onConfirm={() => {
          reopenMonth(currentMonth.id);
          setIsReopenModalOpen(false);
        }}
        onCancel={() => setIsReopenModalOpen(false)}
      />
    </div>
  );
};
