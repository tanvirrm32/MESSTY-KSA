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
  } = useMess();

  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  const isFinalized = currentMonth.status === 'finalized';

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

      {/* Main Settlement Verdict Box */}
      <div
        className={`p-5 rounded-xl border shadow-sm ${
          currentSettlement.isBalanced
            ? 'bg-emerald-50/90 border-emerald-200'
            : 'bg-amber-50/90 border-amber-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Settlement Calculation Verdict
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {currentSettlement.settlementMessage}
            </h3>
            <p className="text-xs text-slate-600 mt-2 max-w-xl">
              Calculated using the verified financial rule: <br />
              <code className="font-mono text-[11px] bg-white/70 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200/60">
                Net Position = Actual Amount Paid − Amount That Member Is Responsible For
              </code>
            </p>
          </div>

          <div className="shrink-0">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Transfer Amount
              </span>
              <span className="text-2xl font-black font-mono text-slate-900 block mt-0.5">
                {formatCurrency(currentSettlement.settlementAmount)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {currentSettlement.isBalanced ? 'No transfer needed' : 'Exact transfer required'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Settlement Comparison Sheet */}
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
                currentSettlement.tanvirStats.netExpensePosition > 0.005
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentSettlement.tanvirStats.netExpensePosition < -0.005
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {currentSettlement.tanvirStats.netExpensePosition > 0.005
                ? 'To Receive'
                : currentSettlement.tanvirStats.netExpensePosition < -0.005
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
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Total Out-of-Pocket Expenses Paid:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(currentSettlement.tanvirStats.totalExpensesPaid)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Common Expenses Paid:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.tanvirStats.commonExpensesPaid)}</span>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Personal Expenses Paid:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.tanvirStats.personalExpensesPaid)}</span>
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
            <div className="flex justify-between py-2 bg-slate-50 px-2 rounded-lg font-bold">
              <span className="text-slate-800">Net Expense Position (Paid − Share):</span>
              <span
                className={`font-mono ${
                  currentSettlement.tanvirStats.netExpensePosition >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {currentSettlement.tanvirStats.netExpensePosition >= 0 ? '+' : ''}
                {formatCurrency(currentSettlement.tanvirStats.netExpensePosition)}
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
                  currentSettlement.settlementReceiver === 'tanvir-rana'
                    ? 'text-emerald-700'
                    : currentSettlement.settlementPayer === 'tanvir-rana'
                    ? 'text-rose-700'
                    : 'text-slate-700'
                }`}
              >
                {currentSettlement.settlementReceiver === 'tanvir-rana'
                  ? `Receive ${formatCurrency(currentSettlement.settlementAmount)}`
                  : currentSettlement.settlementPayer === 'tanvir-rana'
                  ? `Pay ${formatCurrency(currentSettlement.settlementAmount)}`
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
                currentSettlement.zilamStats.netExpensePosition > 0.005
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentSettlement.zilamStats.netExpensePosition < -0.005
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {currentSettlement.zilamStats.netExpensePosition > 0.005
                ? 'To Receive'
                : currentSettlement.zilamStats.netExpensePosition < -0.005
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
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Total Out-of-Pocket Expenses Paid:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(currentSettlement.zilamStats.totalExpensesPaid)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Common Expenses Paid:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.zilamStats.commonExpensesPaid)}</span>
            </div>
            <div className="flex justify-between py-1.5 pl-3 text-slate-500">
              <span>• Personal Expenses Paid:</span>
              <span className="font-mono">{formatCurrency(currentSettlement.zilamStats.personalExpensesPaid)}</span>
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
            <div className="flex justify-between py-2 bg-slate-50 px-2 rounded-lg font-bold">
              <span className="text-slate-800">Net Expense Position (Paid − Share):</span>
              <span
                className={`font-mono ${
                  currentSettlement.zilamStats.netExpensePosition >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {currentSettlement.zilamStats.netExpensePosition >= 0 ? '+' : ''}
                {formatCurrency(currentSettlement.zilamStats.netExpensePosition)}
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
                  currentSettlement.settlementReceiver === 'zilam-jahid'
                    ? 'text-emerald-700'
                    : currentSettlement.settlementPayer === 'zilam-jahid'
                    ? 'text-rose-700'
                    : 'text-slate-700'
                }`}
              >
                {currentSettlement.settlementReceiver === 'zilam-jahid'
                  ? `Receive ${formatCurrency(currentSettlement.settlementAmount)}`
                  : currentSettlement.settlementPayer === 'zilam-jahid'
                  ? `Pay ${formatCurrency(currentSettlement.settlementAmount)}`
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
            Audit Check: Δ = {(currentSettlement.tanvirStats.netExpensePosition + currentSettlement.zilamStats.netExpensePosition).toFixed(2)} SAR
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
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
                <td className="py-3 px-4 text-amber-950">9. Settlement Action to Equalize Accounts</td>
                <td className="py-3 px-4 text-right font-mono text-xs">
                  {currentSettlement.settlementReceiver === 'tanvir-rana'
                    ? `Receive ${formatCurrency(currentSettlement.settlementAmount)}`
                    : currentSettlement.settlementPayer === 'tanvir-rana'
                    ? `Pay ${formatCurrency(currentSettlement.settlementAmount)}`
                    : 'Balanced'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs">
                  {currentSettlement.settlementReceiver === 'zilam-jahid'
                    ? `Receive ${formatCurrency(currentSettlement.settlementAmount)}`
                    : currentSettlement.settlementPayer === 'zilam-jahid'
                    ? `Pay ${formatCurrency(currentSettlement.settlementAmount)}`
                    : 'Balanced'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-950 font-black">
                  {currentSettlement.settlementAmount > 0 ? formatCurrency(currentSettlement.settlementAmount) : 'Balanced'}
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
        message="Finalizing this month will lock all transactions from accidental modification and preserve the official month-end settlement result. You can reopen the month later if adjustments are required."
        confirmLabel="Finalize & Lock Month"
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
