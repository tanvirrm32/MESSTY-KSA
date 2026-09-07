import { MessMonth, MonthlySettlementSummary, Expense, Contribution, Category, AppSettings } from '../types';
import { formatDate, getExpenseFundStatus } from './calcEngine';

export interface PrintReportOptions {
  month: MessMonth;
  settlement: MonthlySettlementSummary;
  expenses: Expense[];
  contributions: Contribution[];
  categories: Category[];
  settings?: AppSettings;
  activeTab?: 'statement' | 'expense' | 'payment' | 'contribution' | 'settlement';
  formatCurrency: (amount: number) => string;
}

export function openPrintReportInNewTab({
  month,
  settlement,
  expenses,
  contributions,
  categories,
  settings,
  activeTab = 'statement',
  formatCurrency,
}: PrintReportOptions): void {
  const appName = settings?.appName || 'MESSTY-KSA';
  const appSubtitle = settings?.appSubtitle || 'Monthly Living Cost Management';
  const messAddress = settings?.messAddress || 'Saudi Arabia';
  const currency = settings?.currencySymbol || 'SAR';
  const genDate = formatDate(new Date().toISOString().split('T')[0]);
  const genTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const sortedExpenses = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const sortedContributions = [...contributions].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Calculate category summaries
  const catMap = new Map<string, { total: number; tanvirPaid: number; zilamPaid: number }>();
  for (const exp of expenses) {
    const existing = catMap.get(exp.categoryId) || { total: 0, tanvirPaid: 0, zilamPaid: 0 };
    existing.total += exp.amount;
    if (exp.paidBy === 'tanvir-rana') existing.tanvirPaid += exp.amount;
    else existing.zilamPaid += exp.amount;
    catMap.set(exp.categoryId, existing);
  }
  const categorySummary = Array.from(catMap.entries())
    .map(([catId, val]) => ({
      id: catId,
      name: categoryMap.get(catId) || catId,
      ...val,
      pct: settlement.totalExpenses > 0 ? (val.total / settlement.totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Tab Title
  const tabTitles: Record<string, string> = {
    statement: 'Official Monthly Financial Statement',
    expense: 'Monthly Expense Report',
    payment: 'Member Payment Responsibility Report',
    contribution: 'Member Fund Contribution Report',
    settlement: 'Month-End Settlement Report',
  };
  const currentTabTitle = tabTitles[activeTab] || 'Financial Statement';

  // Build the complete HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} - ${currentTabTitle} - ${month.name}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #f8fafc;
      font-size: 12px;
      line-height: 1.5;
      padding: 20px;
    }
    .print-wrapper {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    
    /* Screen Action Bar */
    .screen-toolbar {
      max-width: 960px;
      margin: 0 auto 16px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.15);
    }
    .toolbar-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-title {
      font-size: 13px;
      font-weight: 600;
    }
    .toolbar-badge {
      background: #22c55e;
      color: #052e16;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background-color 0.15s;
      text-decoration: none;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* Report Layout */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 24px;
    }
    .app-title {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .app-sub {
      font-size: 13px;
      color: #475569;
      font-weight: 500;
      margin-top: 2px;
    }
    .meta-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .header-right {
      text-align: right;
    }
    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      font-size: 10px;
      border-radius: 9999px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .gen-date {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Verdict Banner */
    .verdict-banner {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-left: 6px solid #2563eb;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .verdict-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .verdict-text {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }

    /* Section Headings */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 8px;
      margin-top: 24px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      margin-bottom: 20px;
    }
    th, td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    }
    .font-bold {
      font-weight: 700;
    }
    .font-semibold {
      font-weight: 600;
    }
    .text-emerald {
      color: #047857;
    }
    .text-blue {
      color: #1d4ed8;
    }
    .text-rose {
      color: #b91c1c;
    }
    .bg-highlight {
      background: #f8fafc;
    }
    .bg-balance {
      background: #ecfdf5;
      font-weight: 700;
    }
    .bg-action {
      background: #f1f5f9;
      font-weight: 700;
    }

    /* Summary Metric Cards */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .metric-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .metric-val {
      font-size: 16px;
      font-weight: 800;
      font-family: "SFMono-Regular", Consolas, monospace;
      color: #0f172a;
    }

    /* Signatures */
    .signatures-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px dashed #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
    }
    .sig-line {
      width: 200px;
      border-bottom: 1px solid #475569;
      margin: 36px auto 8px auto;
    }
    .sig-name {
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 10px;
      color: #64748b;
    }

    /* Footer Note */
    .footer-note {
      text-align: center;
      margin-top: 28px;
      font-size: 10px;
      color: #94a3b8;
    }

    /* Print Specific Media Styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        font-size: 11px !important;
      }
      .no-print {
        display: none !important;
      }
      .print-wrapper {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      @page {
        size: A4;
        margin: 12mm 15mm 15mm 15mm;
      }
      tr {
        page-break-inside: avoid;
      }
      .signatures-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Toolbar: Hidden during actual printer output -->
  <div class="screen-toolbar no-print">
    <div class="toolbar-info">
      <span class="toolbar-badge">Print Ready</span>
      <span class="toolbar-title">${appName} • ${month.name} Statement</span>
    </div>
    <div class="toolbar-actions">
      <button onclick="window.print()" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
        Print / Save as PDF
      </button>
      <button onclick="window.close()" class="btn btn-secondary">
        Close Window
      </button>
    </div>
  </div>

  <!-- Document Sheet -->
  <div class="print-wrapper">
    <!-- Header -->
    <div class="header-section">
      <div>
        <h1 class="app-title">${appName}</h1>
        <p class="app-sub">${appSubtitle} • ${month.name}</p>
        <p class="meta-text">Location: ${messAddress} | Members: Tanvir Rana & Zilam Jahid | Currency: ${currency}</p>
      </div>
      <div class="header-right">
        <span class="status-pill">STATUS: ${month.status.toUpperCase()}</span>
        <p class="gen-date">Generated: ${genDate} at ${genTime}</p>
      </div>
    </div>

    <!-- Settlement Verdict Callout -->
    <div class="verdict-banner">
      <span class="verdict-label">Official Settlement Verdict</span>
      <div class="verdict-text">${settlement.settlementMessage}</div>
    </div>

    <!-- Active Report Content -->
    ${
      activeTab === 'statement' || activeTab === 'settlement'
        ? `
      <!-- Table 1: Financial Reconciliation -->
      <h3 class="section-title">1. Monthly Financial Reconciliation Table</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 40%;">Particulars</th>
            <th class="text-right" style="width: 20%;">Tanvir Rana</th>
            <th class="text-right" style="width: 20%;">Zilam Jahid</th>
            <th class="text-right" style="width: 20%;">Total (${currency})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Opening Balance</td>
            <td class="text-right font-mono">${formatCurrency(settlement.tanvirStats.openingBalance)}</td>
            <td class="text-right font-mono">${formatCurrency(settlement.zilamStats.openingBalance)}</td>
            <td class="text-right font-mono font-bold">${formatCurrency(settlement.tanvirStats.openingBalance + settlement.zilamStats.openingBalance)}</td>
          </tr>
          <tr>
            <td>Fund Contributions</td>
            <td class="text-right font-mono">${formatCurrency(settlement.tanvirStats.totalContributions)}</td>
            <td class="text-right font-mono">${formatCurrency(settlement.zilamStats.totalContributions)}</td>
            <td class="text-right font-mono font-bold text-blue">${formatCurrency(settlement.totalContributions)}</td>
          </tr>
          <tr class="bg-highlight font-semibold">
            <td>Expenses Actually Paid</td>
            <td class="text-right font-mono text-emerald">${formatCurrency(settlement.tanvirStats.totalExpensesPaid)}</td>
            <td class="text-right font-mono text-emerald">${formatCurrency(settlement.zilamStats.totalExpensesPaid)}</td>
            <td class="text-right font-mono font-bold text-emerald">${formatCurrency(settlement.totalExpenses)}</td>
          </tr>
          <tr>
            <td style="padding-left: 24px;">• Common Expenses Share (50%)</td>
            <td class="text-right font-mono">${formatCurrency(settlement.tanvirStats.commonExpenseShare)}</td>
            <td class="text-right font-mono">${formatCurrency(settlement.zilamStats.commonExpenseShare)}</td>
            <td class="text-right font-mono">${formatCurrency(settlement.totalCommonExpenses)}</td>
          </tr>
          <tr>
            <td style="padding-left: 24px;">• Personal Expenses Responsibility</td>
            <td class="text-right font-mono">${formatCurrency(settlement.tanvirStats.personalExpenseResponsibility)}</td>
            <td class="text-right font-mono">${formatCurrency(settlement.zilamStats.personalExpenseResponsibility)}</td>
            <td class="text-right font-mono">${formatCurrency(settlement.totalPersonalExpenses)}</td>
          </tr>
          <tr class="bg-highlight font-semibold">
            <td>Total Expense Responsibility</td>
            <td class="text-right font-mono">${formatCurrency(settlement.tanvirStats.totalExpenseResponsibility)}</td>
            <td class="text-right font-mono">${formatCurrency(settlement.zilamStats.totalExpenseResponsibility)}</td>
            <td class="text-right font-mono font-bold">${formatCurrency(settlement.totalExpenses)}</td>
          </tr>
          <tr class="font-bold">
            <td>Net Expense Position (Paid − Share)</td>
            <td class="text-right font-mono ${settlement.tanvirStats.netExpensePosition >= 0 ? 'text-emerald' : 'text-rose'}">
              ${formatCurrency(settlement.tanvirStats.netExpensePosition)}
            </td>
            <td class="text-right font-mono ${settlement.zilamStats.netExpensePosition >= 0 ? 'text-emerald' : 'text-rose'}">
              ${formatCurrency(settlement.zilamStats.netExpensePosition)}
            </td>
            <td class="text-right font-mono">SAR 0.00</td>
          </tr>
          <tr class="bg-balance">
            <td>Closing Member Account Balance</td>
            <td class="text-right font-mono text-emerald">${formatCurrency(settlement.tanvirStats.currentAccountBalance)}</td>
            <td class="text-right font-mono text-blue">${formatCurrency(settlement.zilamStats.currentAccountBalance)}</td>
            <td class="text-right font-mono font-bold">${formatCurrency(settlement.tanvirStats.currentAccountBalance + settlement.zilamStats.currentAccountBalance)}</td>
          </tr>
          <tr class="bg-action">
            <td>Final Month Settlement Action (Refund / Due)</td>
            <td class="text-right font-mono">
              ${
                settlement.tanvirStats.currentAccountBalance > 0.005
                  ? `Receive ${formatCurrency(settlement.tanvirStats.currentAccountBalance)}`
                  : settlement.tanvirStats.currentAccountBalance < -0.005
                  ? `Pay ${formatCurrency(Math.abs(settlement.tanvirStats.currentAccountBalance))}`
                  : 'Settled'
              }
            </td>
            <td class="text-right font-mono">
              ${
                settlement.zilamStats.currentAccountBalance > 0.005
                  ? `Receive ${formatCurrency(settlement.zilamStats.currentAccountBalance)}`
                  : settlement.zilamStats.currentAccountBalance < -0.005
                  ? `Pay ${formatCurrency(Math.abs(settlement.zilamStats.currentAccountBalance))}`
                  : 'Settled'
              }
            </td>
            <td class="text-right font-mono font-bold text-blue">${settlement.remainingFund !== 0 ? formatCurrency(settlement.remainingFund) : 'Balanced'}</td>
          </tr>
        </tbody>
      </table>

      <!-- Table 2: Category Breakdown -->
      <h3 class="section-title">2. Category-Wise Expense Distribution</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="text-right">Total Amount</th>
            <th class="text-right">% of Total</th>
            <th class="text-right">Tanvir Paid</th>
            <th class="text-right">Zilam Paid</th>
          </tr>
        </thead>
        <tbody>
          ${categorySummary
            .map(
              (c) => `
            <tr>
              <td class="font-semibold">${c.name}</td>
              <td class="text-right font-mono font-bold">${formatCurrency(c.total)}</td>
              <td class="text-right font-mono">${c.pct.toFixed(1)}%</td>
              <td class="text-right font-mono text-emerald">${formatCurrency(c.tanvirPaid)}</td>
              <td class="text-right font-mono text-blue">${formatCurrency(c.zilamPaid)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <!-- Table 3: Summary of Expenses -->
      <h3 class="section-title">3. Item-by-Item Expenses Summary (${expenses.length} Records)</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 12%;">Date</th>
            <th style="width: 16%;">Category</th>
            <th style="width: 24%;">Description</th>
            <th style="width: 14%;">Paid By</th>
            <th style="width: 10%;">Status</th>
            <th class="text-right" style="width: 12%;">Amount</th>
            <th class="text-right" style="width: 12%;">Type</th>
          </tr>
        </thead>
        <tbody>
          ${sortedExpenses
            .map((exp) => {
              const status = getExpenseFundStatus(exp, expenses, contributions, month.id).statusText;
              const statusColor = status === 'Paid' ? '#166534' : status === 'Partial' ? '#92400e' : '#9f1239';
              const statusBg = status === 'Paid' ? '#dcfce7' : status === 'Partial' ? '#fef3c7' : '#ffe4e6';
              return `
            <tr>
              <td>${formatDate(exp.date)}</td>
              <td>${categoryMap.get(exp.categoryId) || 'General'}</td>
              <td class="font-semibold">${exp.description}</td>
              <td>${exp.paidBy === 'total-fund' ? 'Total Fund' : exp.paidBy === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}</td>
              <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;background:${statusBg};color:${statusColor};">${status}</span></td>
              <td class="text-right font-mono font-bold">${formatCurrency(exp.amount)}</td>
              <td class="text-right">${exp.expenseType === 'common' ? 'Common (50/50)' : 'Personal'}</td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Table 4: Contributions -->
      <h3 class="section-title">4. Member Contributions & Deposits (${contributions.length} Records)</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 15%;">Date</th>
            <th style="width: 25%;">Member</th>
            <th class="text-right" style="width: 20%;">Amount</th>
            <th style="width: 20%;">Payment Method</th>
            <th style="width: 20%;">Reference / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${sortedContributions
            .map(
              (c) => `
            <tr>
              <td>${formatDate(c.date)}</td>
              <td class="font-semibold">${c.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}</td>
              <td class="text-right font-mono font-bold text-emerald">${formatCurrency(c.amount)}</td>
              <td>${c.paymentMethod}</td>
              <td>${c.reference || c.notes || '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      `
        : ''
    }

    ${
      activeTab === 'expense'
        ? `
      <div class="grid-3">
        <div class="metric-card">
          <div class="metric-label">Total Month Expenses</div>
          <div class="metric-val">${formatCurrency(settlement.totalExpenses)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Common Shared Expenses</div>
          <div class="metric-val text-emerald">${formatCurrency(settlement.totalCommonExpenses)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Personal Specific Expenses</div>
          <div class="metric-val text-blue">${formatCurrency(settlement.totalPersonalExpenses)}</div>
        </div>
      </div>

      <h3 class="section-title">Category Distribution</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="text-right">Total Amount</th>
            <th class="text-right">% of Total</th>
            <th class="text-right">Tanvir Paid</th>
            <th class="text-right">Zilam Paid</th>
          </tr>
        </thead>
        <tbody>
          ${categorySummary
            .map(
              (c) => `
            <tr>
              <td class="font-semibold">${c.name}</td>
              <td class="text-right font-mono font-bold">${formatCurrency(c.total)}</td>
              <td class="text-right font-mono">${c.pct.toFixed(1)}%</td>
              <td class="text-right font-mono text-emerald">${formatCurrency(c.tanvirPaid)}</td>
              <td class="text-right font-mono text-blue">${formatCurrency(c.zilamPaid)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <h3 class="section-title">All Month Expenses</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Paid By</th>
            <th>Status</th>
            <th class="text-right">Total Amount</th>
            <th class="text-right">Tanvir Share</th>
            <th class="text-right">Zilam Share</th>
          </tr>
        </thead>
        <tbody>
          ${sortedExpenses
            .map((exp) => {
              const status = getExpenseFundStatus(exp, expenses, contributions, month.id).statusText;
              const statusColor = status === 'Paid' ? '#166534' : status === 'Partial' ? '#92400e' : '#9f1239';
              const statusBg = status === 'Paid' ? '#dcfce7' : status === 'Partial' ? '#fef3c7' : '#ffe4e6';
              return `
            <tr>
              <td>${formatDate(exp.date)}</td>
              <td>${categoryMap.get(exp.categoryId) || 'General'}</td>
              <td class="font-semibold">${exp.description}</td>
              <td>${exp.paidBy === 'total-fund' ? 'Total Fund' : exp.paidBy === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}</td>
              <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;background:${statusBg};color:${statusColor};">${status}</span></td>
              <td class="text-right font-mono font-bold">${formatCurrency(exp.amount)}</td>
              <td class="text-right font-mono text-emerald">${formatCurrency(exp.tanvirShare)}</td>
              <td class="text-right font-mono text-blue">${formatCurrency(exp.zilamShare)}</td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
      `
        : ''
    }

    ${
      activeTab === 'payment'
        ? `
      <div class="grid-2">
        <div class="metric-card" style="border-left: 4px solid #047857;">
          <div class="metric-label" style="color: #047857; font-weight: 700;">Tanvir Rana - Actual Payments</div>
          <div class="metric-val" style="font-size: 20px; color: #047857; margin: 4px 0 10px 0;">${formatCurrency(settlement.tanvirStats.totalExpensesPaid)}</div>
          <p style="font-size: 11px; color: #64748b;">Expenses Paid (Covered): <strong>${formatCurrency(settlement.tanvirStats.totalExpensesCovered)}</strong></p>
          <p style="font-size: 11px; color: #64748b;">Covered from Total Fund: <strong>${formatCurrency(settlement.tanvirStats.expensesPaidFromFund)}</strong></p>
          <p style="font-size: 11px; color: #64748b;">Common Expenses Paid: <strong>${formatCurrency(settlement.tanvirStats.commonExpensesPaid)}</strong></p>
          <p style="font-size: 11px; color: #64748b;">Personal Expenses Paid: <strong>${formatCurrency(settlement.tanvirStats.personalExpensesPaid)}</strong></p>
          <p style="font-size: 11px; color: #047857;">Paid on behalf of Zilam: <strong>${formatCurrency(settlement.tanvirStats.amountPaidOnBehalfOfOther)}</strong></p>
        </div>
        <div class="metric-card" style="border-left: 4px solid #1d4ed8;">
          <div class="metric-label" style="color: #1d4ed8; font-weight: 700;">Zilam Jahid - Actual Payments</div>
          <div class="metric-val" style="font-size: 20px; color: #1d4ed8; margin: 4px 0 10px 0;">${formatCurrency(settlement.zilamStats.totalExpensesPaid)}</div>
          <p style="font-size: 11px; color: #64748b;">Expenses Paid (Covered): <strong>${formatCurrency(settlement.zilamStats.totalExpensesCovered)}</strong></p>
          <p style="font-size: 11px; color: #64748b;">Covered from Total Fund: <strong>${formatCurrency(settlement.zilamStats.expensesPaidFromFund)}</strong></p>
          <p style="font-size: 11px; color: #64748b;">Common Expenses Paid: <strong>${formatCurrency(settlement.zilamStats.commonExpensesPaid)}</strong></p>
          <p style="font-size: 11px; color: #64748b;">Personal Expenses Paid: <strong>${formatCurrency(settlement.zilamStats.personalExpensesPaid)}</strong></p>
          <p style="font-size: 11px; color: #1d4ed8;">Paid on behalf of Tanvir: <strong>${formatCurrency(settlement.zilamStats.amountPaidOnBehalfOfOther)}</strong></p>
        </div>
      </div>

      <h3 class="section-title">Itemized Expense Log</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Paid By</th>
            <th>Status</th>
            <th class="text-right">Amount</th>
            <th class="text-right">Split Type</th>
          </tr>
        </thead>
        <tbody>
          ${sortedExpenses
            .map((exp) => {
              const status = getExpenseFundStatus(exp, expenses, contributions, month.id).statusText;
              const statusColor = status === 'Paid' ? '#166534' : status === 'Partial' ? '#92400e' : '#9f1239';
              const statusBg = status === 'Paid' ? '#dcfce7' : status === 'Partial' ? '#fef3c7' : '#ffe4e6';
              return `
            <tr>
              <td>${formatDate(exp.date)}</td>
              <td>${categoryMap.get(exp.categoryId) || 'General'}</td>
              <td class="font-semibold">${exp.description}</td>
              <td>${exp.paidBy === 'total-fund' ? 'Total Fund' : exp.paidBy === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}</td>
              <td><span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;background:${statusBg};color:${statusColor};">${status}</span></td>
              <td class="text-right font-mono font-bold">${formatCurrency(exp.amount)}</td>
              <td class="text-right">${exp.expenseType === 'common' ? 'Common (50/50)' : 'Personal'}</td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
      `
        : ''
    }

    ${
      activeTab === 'contribution'
        ? `
      <div class="grid-3">
        <div class="metric-card">
          <div class="metric-label">Total Fund Deposited</div>
          <div class="metric-val text-blue">${formatCurrency(settlement.totalContributions)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tanvir Rana Contributed</div>
          <div class="metric-val text-emerald">${formatCurrency(settlement.tanvirStats.totalContributions)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Zilam Jahid Contributed</div>
          <div class="metric-val text-blue">${formatCurrency(settlement.zilamStats.totalContributions)}</div>
        </div>
      </div>

      <h3 class="section-title">All Member Contributions & Deposits</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Member</th>
            <th class="text-right">Amount</th>
            <th>Payment Method</th>
            <th>Reference Number</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${sortedContributions
            .map(
              (c) => `
            <tr>
              <td>${formatDate(c.date)}</td>
              <td class="font-semibold">${c.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}</td>
              <td class="text-right font-mono font-bold text-emerald">${formatCurrency(c.amount)}</td>
              <td>${c.paymentMethod}</td>
              <td class="font-mono">${c.reference || '—'}</td>
              <td>${c.notes || '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      `
        : ''
    }

    <!-- Signatures Section -->
    <div class="signatures-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">Tanvir Rana</div>
        <div class="sig-sub">Mess Member Signature & Date</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-name">Zilam Jahid</div>
        <div class="sig-sub">Mess Member Signature & Date</div>
      </div>
    </div>

    <div class="footer-note">
      This document is an official financial report generated by ${appName} for the month of ${month.name}. All calculations are final and balanced.
    </div>
  </div>

  <!-- Auto-Print Trigger Script -->
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

  // Create a Blob URL
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  // Attempt window.open first
  const printWindow = window.open(blobUrl, '_blank');

  // If popup was blocked or prevented by iframe sandbox, use an anchor trigger
  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      anchor.remove();
    }, 1500);
  }
}
