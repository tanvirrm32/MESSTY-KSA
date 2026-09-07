import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Expense,
  Contribution,
  MonthlySettlementSummary,
  Category,
  MessMonth,
  MEMBERS,
  AppDatabase,
} from '../types';
import { formatCurrency, formatDate } from './calcEngine';

/**
 * Downloads a file in browser
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Expenses to CSV
 */
export function exportExpensesToCSV(
  expenses: Expense[],
  categories: Category[],
  monthName: string
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const sortedExpenses = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const headers = [
    'Date',
    'Transaction ID',
    'Category',
    'Description',
    'Amount (SAR)',
    'Paid By',
    'Expense Type',
    'Tanvir Share (SAR)',
    'Zilam Share (SAR)',
    'Notes',
  ];

  const rows = sortedExpenses.map((e) => [
    formatDate(e.date),
    e.id,
    `"${catMap.get(e.categoryId) || e.categoryId}"`,
    `"${e.description.replace(/"/g, '""')}"`,
    (Number(e.amount) || 0).toFixed(2),
    e.paidBy === 'total-fund' ? 'Total Fund' : e.paidBy === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid',
    e.expenseType === 'common' ? 'Common' : 'Personal',
    (Number(e.tanvirShare) || 0).toFixed(2),
    (Number(e.zilamShare) || 0).toFixed(2),
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `Mess_Expenses_${monthName.replace(/\s+/g, '_')}.csv`);
}

/**
 * Export Contributions to CSV
 */
export function exportContributionsToCSV(
  contributions: Contribution[],
  monthName: string
) {
  const sortedContributions = [...contributions].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const headers = [
    'Date',
    'Contribution ID',
    'Member',
    'Amount (SAR)',
    'Payment Method',
    'Reference',
    'Notes',
  ];

  const rows = sortedContributions.map((c) => [
    formatDate(c.date),
    c.id,
    c.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid',
    (Number(c.amount) || 0).toFixed(2),
    c.paymentMethod,
    `"${(c.reference || '').replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `Mess_Contributions_${monthName.replace(/\s+/g, '_')}.csv`);
}

/**
 * Export Comprehensive Monthly Settlement & Ledger to Excel (.xlsx)
 */
export function exportMonthlyReportToExcel(
  month: MessMonth,
  settlement: MonthlySettlementSummary,
  expenses: Expense[],
  contributions: Contribution[],
  categories: Category[]
) {
  const wb = XLSX.utils.book_new();
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // Sheet 1: Settlement Summary
  const summaryData = [
    ['Monthly Mess Cost Management - Settlement Statement'],
    ['Month:', settlement.monthName],
    ['Status:', settlement.status.toUpperCase()],
    ['Generated Date:', new Date().toLocaleDateString()],
    [],
    ['Key Metric', 'Amount (SAR)'],
    ['Total Expenses', settlement.totalExpenses],
    ['Common Expenses', settlement.totalCommonExpenses],
    ['Common Expense (50% Per Member)', settlement.commonExpensePerMember],
    ['Personal Expenses', settlement.totalPersonalExpenses],
    ['Total Contributions', settlement.totalContributions],
    [],
    ['Member Breakdown', 'Tanvir Rana', 'Zilam Jahid'],
    ['Opening Balance', settlement.tanvirStats.openingBalance, settlement.zilamStats.openingBalance],
    ['Total Contributions', settlement.tanvirStats.totalContributions, settlement.zilamStats.totalContributions],
    ['Actual Expenses Paid (Direct)', settlement.tanvirStats.totalExpensesPaid, settlement.zilamStats.totalExpensesPaid],
    ['Expenses Paid (Covered)', settlement.tanvirStats.totalExpensesCovered, settlement.zilamStats.totalExpensesCovered],
    ['Covered from Total Fund', settlement.tanvirStats.expensesPaidFromFund, settlement.zilamStats.expensesPaidFromFund],
    ['Unpaid Cost (Crossed)', settlement.tanvirStats.unpaidExpenseAmount, settlement.zilamStats.unpaidExpenseAmount],
    ['Payment Coverage Status', settlement.tanvirStats.paymentStatus, settlement.zilamStats.paymentStatus],
    ['Common Expense Share', settlement.tanvirStats.commonExpenseShare, settlement.zilamStats.commonExpenseShare],
    ['Personal Expense Responsibility', settlement.tanvirStats.personalExpenseResponsibility, settlement.zilamStats.personalExpenseResponsibility],
    ['Total Expense Responsibility', settlement.tanvirStats.totalExpenseResponsibility, settlement.zilamStats.totalExpenseResponsibility],
    ['Net Expense Position (Paid - Share)', settlement.tanvirStats.netExpensePosition, settlement.zilamStats.netExpensePosition],
    ['Current Account Balance', settlement.tanvirStats.currentAccountBalance, settlement.zilamStats.currentAccountBalance],
    [],
    ['SETTLEMENT VERDICT'],
    [settlement.settlementMessage],
    ['Settlement Transfer Amount', settlement.settlementAmount],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Settlement Summary');

  // Sheet 2: Expenses
  const sortedExpenses = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const expenseData = [
    ['Date', 'ID', 'Category', 'Description', 'Amount (SAR)', 'Paid By', 'Type', 'Tanvir Share', 'Zilam Share', 'Notes'],
    ...sortedExpenses.map((e) => [
      formatDate(e.date),
      e.id,
      catMap.get(e.categoryId) || e.categoryId,
      e.description,
      e.amount,
      e.paidBy === 'total-fund' ? 'Total Fund' : e.paidBy === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid',
      e.expenseType.toUpperCase(),
      e.tanvirShare,
      e.zilamShare,
      e.notes || '',
    ]),
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

  // Sheet 3: Contributions
  const sortedContributions = [...contributions].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const contributionData = [
    ['Date', 'ID', 'Member', 'Amount (SAR)', 'Payment Method', 'Reference', 'Notes'],
    ...sortedContributions.map((c) => [
      formatDate(c.date),
      c.id,
      c.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid',
      c.amount,
      c.paymentMethod,
      c.reference || '',
      c.notes || '',
    ]),
  ];
  const wsContributions = XLSX.utils.aoa_to_sheet(contributionData);
  XLSX.utils.book_append_sheet(wb, wsContributions, 'Contributions');

  // Write file
  XLSX.writeFile(wb, `Mess_Financial_Report_${month.name.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Export Settlement Report as PDF
 */
export function exportSettlementPDF(
  month: MessMonth,
  settlement: MonthlySettlementSummary,
  expenses: Expense[],
  contributions: Contribution[],
  categories: Category[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text('Monthly Mess Cost Management', 14, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Official Monthly Settlement Statement • ${settlement.monthName}`, 14, 25);
  doc.text(`Status: ${settlement.status.toUpperCase()} | Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 31);

  // Settlement Verdict Banner
  doc.setDrawColor(210, 220, 230);
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(14, 36, 182, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 60, 120);
  doc.text('FINAL SETTLEMENT VERDICT:', 18, 44);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(settlement.settlementMessage, 18, 51);

  // Settlement Comparison Table
  autoTable(doc, {
    startY: 61,
    head: [['Financial Breakdown', 'Tanvir Rana', 'Zilam Jahid', 'Total Mess']],
    body: [
      ['Opening Balance', formatCurrency(settlement.tanvirStats.openingBalance), formatCurrency(settlement.zilamStats.openingBalance), formatCurrency(settlement.tanvirStats.openingBalance + settlement.zilamStats.openingBalance)],
      ['Fund Contributions', formatCurrency(settlement.tanvirStats.totalContributions), formatCurrency(settlement.zilamStats.totalContributions), formatCurrency(settlement.totalContributions)],
      ['Expenses Paid (Covered)', formatCurrency(settlement.tanvirStats.totalExpensesCovered), formatCurrency(settlement.zilamStats.totalExpensesCovered), formatCurrency(settlement.totalExpenses)],
      ['Unpaid Cost (Crossed)', formatCurrency(settlement.tanvirStats.unpaidExpenseAmount), formatCurrency(settlement.zilamStats.unpaidExpenseAmount), formatCurrency(settlement.tanvirStats.unpaidExpenseAmount + settlement.zilamStats.unpaidExpenseAmount)],
      ['Common Expense Share', formatCurrency(settlement.tanvirStats.commonExpenseShare), formatCurrency(settlement.zilamStats.commonExpenseShare), formatCurrency(settlement.totalCommonExpenses)],
      ['Personal Expenses', formatCurrency(settlement.tanvirStats.personalExpenseResponsibility), formatCurrency(settlement.zilamStats.personalExpenseResponsibility), formatCurrency(settlement.totalPersonalExpenses)],
      ['Total Expense Responsibility', formatCurrency(settlement.tanvirStats.totalExpenseResponsibility), formatCurrency(settlement.zilamStats.totalExpenseResponsibility), formatCurrency(settlement.totalExpenses)],
      ['Net Expense Position (Paid - Share)', formatCurrency(settlement.tanvirStats.netExpensePosition), formatCurrency(settlement.zilamStats.netExpensePosition), 'SAR 0.00'],
      ['Current Account Balance', formatCurrency(settlement.tanvirStats.currentAccountBalance), formatCurrency(settlement.zilamStats.currentAccountBalance), formatCurrency(settlement.tanvirStats.currentAccountBalance + settlement.zilamStats.currentAccountBalance)],
      ['Settlement Action',
        settlement.tanvirStats.currentAccountBalance > 0.005 ? 'Receive ' + formatCurrency(settlement.tanvirStats.currentAccountBalance) : settlement.tanvirStats.currentAccountBalance < -0.005 ? 'Pay ' + formatCurrency(Math.abs(settlement.tanvirStats.currentAccountBalance)) : 'Settled',
        settlement.zilamStats.currentAccountBalance > 0.005 ? 'Receive ' + formatCurrency(settlement.zilamStats.currentAccountBalance) : settlement.zilamStats.currentAccountBalance < -0.005 ? 'Pay ' + formatCurrency(Math.abs(settlement.zilamStats.currentAccountBalance)) : 'Settled',
        formatCurrency(settlement.remainingFund)
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // Expenses Table
  const lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 140;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Monthly Expenses Detail', 14, lastY + 12);

  const sortedPDFExpenses = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const expenseRows = sortedPDFExpenses.slice(0, 30).map((e) => [
    formatDate(e.date),
    catMap.get(e.categoryId) || 'General',
    e.description,
    e.paidBy === 'total-fund' ? 'Total Fund' : e.paidBy === 'tanvir-rana' ? 'Tanvir' : 'Zilam',
    e.expenseType === 'common' ? 'Common' : 'Personal',
    `SAR ${(Number(e.amount) || 0).toFixed(2)}`,
    `T: ${(Number(e.tanvirShare) || 0).toFixed(2)} | Z: ${(Number(e.zilamShare) || 0).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: lastY + 16,
    head: [['Date', 'Category', 'Description', 'Paid By', 'Type', 'Amount', 'Split (T/Z)']],
    body: expenseRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  // Footer / Page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Monthly Mess Cost Management • Page ${i} of ${pageCount} • Tanvir Rana & Zilam Jahid`,
      14,
      290
    );
  }

  doc.save(`Mess_Settlement_Report_${month.name.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Export complete database state to JSON file
 */
export function exportDatabaseJSON(database: AppDatabase) {
  const jsonStr = JSON.stringify(database, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `mess_cost_backup_${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(blob, filename);
}

