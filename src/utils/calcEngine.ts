import {
  Expense,
  Contribution,
  MessMonth,
  MonthlySettlementSummary,
  MemberMonthlyStats,
  SplitSetting,
  SettlementListItem,
} from '../types';

/**
 * Rounds a number safely to 2 decimal places.
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number as SAR currency, e.g. "SAR 1,250.00" or just "1,250.00"
 */
export function formatCurrency(amount: number, includeCode: boolean = true): string {
  const isNegative = amount < -0.004;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!includeCode) {
    return isNegative ? `-${formatted}` : formatted;
  }
  return isNegative ? `-SAR ${formatted}` : `SAR ${formatted}`;
}

/**
 * Formats a date string into standard DD-MM-YYYY format (e.g., '2026-09-07' -> '07-09-2026').
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // Already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // Matches YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // Matches DD-MM-YYYY with slashes or dots
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // Fallback to Date object parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

/**
 * Calculate member shares for an expense
 */
export function calculateExpenseShares(
  amount: number,
  expenseType: 'common' | 'personal',
  paidBy: 'tanvir-rana' | 'zilam-jahid' | 'total-fund',
  personalFor?: 'tanvir-rana' | 'zilam-jahid',
  splitRatio: SplitSetting = { tanvirPercent: 50, zilamPercent: 50 }
): { tanvirShare: number; zilamShare: number } {
  if (expenseType === 'personal') {
    const targetMember = personalFor || (paidBy !== 'total-fund' ? paidBy : 'tanvir-rana');
    if (targetMember === 'tanvir-rana') {
      return { tanvirShare: roundCurrency(amount), zilamShare: 0 };
    } else {
      return { tanvirShare: 0, zilamShare: roundCurrency(amount) };
    }
  }

  // Common expense split (Total Fund expenses are shared 50/50 equally from both members' contributed equity)
  const tanvirPercent = splitRatio.tanvirPercent ?? 50;
  const tanvirShare = roundCurrency((amount * tanvirPercent) / 100);
  const zilamShare = roundCurrency(amount - tanvirShare);

  return { tanvirShare, zilamShare };
}

/**
 * Centralized calculation engine for a given month.
 * Computes all member financial positions, expense shares, contributions, and settlement verdict.
 */
export function calculateMonthlySettlement(
  month: MessMonth,
  expenses: Expense[],
  contributions: Contribution[]
): MonthlySettlementSummary {
  // Filter for this specific month
  const monthExpenses = expenses.filter((e) => e.monthId === month.id);
  const monthContributions = contributions.filter((c) => c.monthId === month.id);

  // Overall totals
  let totalExpenses = 0;
  let totalCommonExpenses = 0;
  let totalPersonalExpenses = 0;
  let directFundExpensesPaid = 0;

  // Member-specific aggregations
  let tanvirPaid = 0;
  let tanvirCommonPaid = 0;
  let tanvirPersonalPaid = 0;
  let tanvirCommonShare = 0;
  let tanvirPersonalResponsibility = 0;
  let tanvirPaidForZilam = 0;

  let zilamPaid = 0;
  let zilamCommonPaid = 0;
  let zilamPersonalPaid = 0;
  let zilamCommonShare = 0;
  let zilamPersonalResponsibility = 0;
  let zilamPaidForTanvir = 0;

  for (const exp of monthExpenses) {
    totalExpenses = roundCurrency(totalExpenses + exp.amount);

    if (exp.expenseType === 'common') {
      totalCommonExpenses = roundCurrency(totalCommonExpenses + exp.amount);
    } else {
      totalPersonalExpenses = roundCurrency(totalPersonalExpenses + exp.amount);
    }

    if (exp.paidBy === 'tanvir-rana') {
      tanvirPaid = roundCurrency(tanvirPaid + exp.amount);
      if (exp.expenseType === 'common') {
        tanvirCommonPaid = roundCurrency(tanvirCommonPaid + exp.amount);
      } else {
        tanvirPersonalPaid = roundCurrency(tanvirPersonalPaid + exp.amount);
      }
      // Tanvir paid zilam's share
      tanvirPaidForZilam = roundCurrency(tanvirPaidForZilam + exp.zilamShare);
    } else if (exp.paidBy === 'zilam-jahid') {
      zilamPaid = roundCurrency(zilamPaid + exp.amount);
      if (exp.expenseType === 'common') {
        zilamCommonPaid = roundCurrency(zilamCommonPaid + exp.amount);
      } else {
        zilamPersonalPaid = roundCurrency(zilamPersonalPaid + exp.amount);
      }
      // Zilam paid tanvir's share
      zilamPaidForTanvir = roundCurrency(zilamPaidForTanvir + exp.tanvirShare);
    } else if (exp.paidBy === 'total-fund') {
      // Paid directly from the shared Total Fund pool
      directFundExpensesPaid = roundCurrency(directFundExpensesPaid + exp.amount);
      // Neither member paid out-of-pocket individually; both members' shares are deducted equally
    }

    // Shares
    if (exp.expenseType === 'common') {
      tanvirCommonShare = roundCurrency(tanvirCommonShare + exp.tanvirShare);
      zilamCommonShare = roundCurrency(zilamCommonShare + exp.zilamShare);
    } else {
      tanvirPersonalResponsibility = roundCurrency(tanvirPersonalResponsibility + exp.tanvirShare);
      zilamPersonalResponsibility = roundCurrency(zilamPersonalResponsibility + exp.zilamShare);
    }
  }

  // Contributions (Separating direct cash/bank deposits from auto-contributions for bazaar)
  let tanvirDirectContributions = 0;
  let tanvirAutoContributions = 0;
  let zilamDirectContributions = 0;
  let zilamAutoContributions = 0;

  for (const con of monthContributions) {
    const isAuto = Boolean(con.linkedExpenseId || con.isAutoExpense);
    if (con.memberId === 'tanvir-rana') {
      if (isAuto) {
        tanvirAutoContributions = roundCurrency(tanvirAutoContributions + con.amount);
      } else {
        tanvirDirectContributions = roundCurrency(tanvirDirectContributions + con.amount);
      }
    } else {
      if (isAuto) {
        zilamAutoContributions = roundCurrency(zilamAutoContributions + con.amount);
      } else {
        zilamDirectContributions = roundCurrency(zilamDirectContributions + con.amount);
      }
    }
  }
  const tanvirContributions = roundCurrency(tanvirDirectContributions + tanvirAutoContributions);
  const zilamContributions = roundCurrency(zilamDirectContributions + zilamAutoContributions);
  const totalContributions = roundCurrency(tanvirContributions + zilamContributions);
  const directContributions = roundCurrency(tanvirDirectContributions + zilamDirectContributions);
  const autoContributions = roundCurrency(tanvirAutoContributions + zilamAutoContributions);

  // Responsibilities
  const tanvirTotalResponsibility = roundCurrency(tanvirCommonShare + tanvirPersonalResponsibility);
  const zilamTotalResponsibility = roundCurrency(zilamCommonShare + zilamPersonalResponsibility);

  const openingTanvir = month.openingBalance?.['tanvir-rana'] ?? 0;
  const openingZilam = month.openingBalance?.['zilam-jahid'] ?? 0;

  // Total funds provided by each member (Opening Balance + Total Contributions + Direct Out-of-pocket Paid)
  const tanvirTotalFunds = roundCurrency(openingTanvir + tanvirContributions + tanvirPaid);
  const zilamTotalFunds = roundCurrency(openingZilam + zilamContributions + zilamPaid);

  // Expense coverage:
  // Expenses paid/covered by member's contribution & payments
  const tanvirExpensesCovered = Math.min(tanvirTotalResponsibility, Math.max(0, tanvirTotalFunds));
  const zilamExpensesCovered = Math.min(zilamTotalResponsibility, Math.max(0, zilamTotalFunds));

  // The cost that crosses/exceeds the member's contribution amount (Unpaid/Due)
  const tanvirUnpaidExpenseAmount = Math.max(0, roundCurrency(tanvirTotalResponsibility - tanvirTotalFunds));
  const zilamUnpaidExpenseAmount = Math.max(0, roundCurrency(zilamTotalResponsibility - zilamTotalFunds));

  // Expenses paid through Total Fund pool on member's behalf
  const tanvirExpensesPaidFromFund = Math.max(0, roundCurrency(tanvirExpensesCovered - tanvirPaid));
  const zilamExpensesPaidFromFund = Math.max(0, roundCurrency(zilamExpensesCovered - zilamPaid));

  // Current closing account balance = Total Funds Provided - Total Expense Responsibility
  const tanvirAccountBalance = roundCurrency(tanvirTotalFunds - tanvirTotalResponsibility);
  const zilamAccountBalance = roundCurrency(zilamTotalFunds - zilamTotalResponsibility);

  // Net expense position reflecting true financial standing (Contribution + Paid - Responsibility)
  // Positive: Member has surplus/overpaid/in credit (Paid in Full)
  // Negative: Member's expense crossed contribution (Unpaid/Due)
  const tanvirNetExpensePosition = tanvirAccountBalance;
  const zilamNetExpensePosition = zilamAccountBalance;

  const tanvirStats: MemberMonthlyStats = {
    memberId: 'tanvir-rana',
    name: 'Tanvir Rana',
    openingBalance: openingTanvir,
    totalContributions: tanvirContributions,
    directContributions: tanvirDirectContributions,
    autoContributions: tanvirAutoContributions,
    totalExpensesPaid: tanvirPaid,
    commonExpensesPaid: tanvirCommonPaid,
    personalExpensesPaid: tanvirPersonalPaid,
    commonExpenseShare: tanvirCommonShare,
    personalExpenseResponsibility: tanvirPersonalResponsibility,
    totalExpenseResponsibility: tanvirTotalResponsibility,
    amountPaidOnBehalfOfOther: tanvirPaidForZilam,
    amountOwedToOther: zilamPaidForTanvir,
    netExpensePosition: tanvirNetExpensePosition,
    currentAccountBalance: tanvirAccountBalance,
    expensesPaidFromFund: tanvirExpensesPaidFromFund,
    totalExpensesCovered: tanvirExpensesCovered,
    unpaidExpenseAmount: tanvirUnpaidExpenseAmount,
    isFullyPaid: tanvirUnpaidExpenseAmount === 0,
    paymentStatus: tanvirUnpaidExpenseAmount === 0 ? 'Paid' : tanvirExpensesCovered > 0 ? 'Partial' : 'Unpaid',
  };

  const zilamStats: MemberMonthlyStats = {
    memberId: 'zilam-jahid',
    name: 'Zilam Jahid',
    openingBalance: openingZilam,
    totalContributions: zilamContributions,
    directContributions: zilamDirectContributions,
    autoContributions: zilamAutoContributions,
    totalExpensesPaid: zilamPaid,
    commonExpensesPaid: zilamCommonPaid,
    personalExpensesPaid: zilamPersonalPaid,
    commonExpenseShare: zilamCommonShare,
    personalExpenseResponsibility: zilamPersonalResponsibility,
    totalExpenseResponsibility: zilamTotalResponsibility,
    amountPaidOnBehalfOfOther: zilamPaidForTanvir,
    amountOwedToOther: tanvirPaidForZilam,
    netExpensePosition: zilamNetExpensePosition,
    currentAccountBalance: zilamAccountBalance,
    expensesPaidFromFund: zilamExpensesPaidFromFund,
    totalExpensesCovered: zilamExpensesCovered,
    unpaidExpenseAmount: zilamUnpaidExpenseAmount,
    isFullyPaid: zilamUnpaidExpenseAmount === 0,
    paymentStatus: zilamUnpaidExpenseAmount === 0 ? 'Paid' : zilamExpensesCovered > 0 ? 'Partial' : 'Unpaid',
  };

  const commonExpensePerMember = roundCurrency(totalCommonExpenses / 2);

  const fundExpensesPaid = totalExpenses;
  const totalDeposit = totalContributions;
  const remainingFund = roundCurrency(totalDeposit - totalExpenses);

  // Rule 1: Refund from remaining mess fund based on actual closing account balance
  // Member Balance = Opening Balance + Total Contributions - Expense Responsibility
  const tanvirBal = tanvirStats.currentAccountBalance;
  const zilamBal = zilamStats.currentAccountBalance;

  let settlementPayer: 'tanvir-rana' | 'zilam-jahid' | null = null;
  let settlementReceiver: 'tanvir-rana' | 'zilam-jahid' | null = null;
  let settlementAmount = roundCurrency(Math.abs(remainingFund));
  let settlementMessage = 'Settlement Complete — Accounts are fully balanced.';
  let isBalanced = Math.abs(tanvirBal) < 0.005 && Math.abs(zilamBal) < 0.005;

  let tanvirItem: SettlementListItem;
  let zilamItem: SettlementListItem;

  if (tanvirBal > 0.005 && zilamBal > 0.005) {
    // Both members have positive closing balance: both receive their refund directly from the remaining mess fund
    settlementMessage = `Tanvir receives ${formatCurrency(tanvirBal)} and Zilam receives ${formatCurrency(zilamBal)} from remaining fund.`;
    settlementAmount = remainingFund;
    isBalanced = false;

    tanvirItem = {
      memberId: 'tanvir-rana',
      name: 'Tanvir',
      fullName: 'Tanvir Rana',
      action: 'receives',
      actionLabel: 'Receives',
      amount: tanvirBal,
      sourceNote: 'from remaining fund',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80',
      amountColor: 'text-amber-400',
    };

    zilamItem = {
      memberId: 'zilam-jahid',
      name: 'Zilam',
      fullName: 'Zilam Jahid',
      action: 'receives',
      actionLabel: 'Receives',
      amount: zilamBal,
      sourceNote: 'from remaining fund',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80',
      amountColor: 'text-amber-400',
    };
  } else if (tanvirBal < -0.005 && zilamBal > 0.005) {
    // Tanvir underpaid, Zilam overpaid
    settlementPayer = 'tanvir-rana';
    settlementReceiver = 'zilam-jahid';
    settlementAmount = roundCurrency(Math.abs(tanvirBal));
    settlementMessage = `Tanvir Rana owes ${formatCurrency(settlementAmount)} to fund / Zilam Jahid.`;
    isBalanced = false;

    tanvirItem = {
      memberId: 'tanvir-rana',
      name: 'Tanvir',
      fullName: 'Tanvir Rana',
      action: 'owes',
      actionLabel: 'Owes',
      amount: Math.abs(tanvirBal),
      sourceNote: 'to fund / Zilam',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-rose-950 text-rose-300 border border-rose-800/80',
      amountColor: 'text-rose-400',
    };

    zilamItem = {
      memberId: 'zilam-jahid',
      name: 'Zilam',
      fullName: 'Zilam Jahid',
      action: 'receives',
      actionLabel: 'Receives',
      amount: Math.abs(zilamBal),
      sourceNote: 'from settlement',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80',
      amountColor: 'text-amber-400',
    };
  } else if (zilamBal < -0.005 && tanvirBal > 0.005) {
    // Zilam underpaid, Tanvir overpaid
    settlementPayer = 'zilam-jahid';
    settlementReceiver = 'tanvir-rana';
    settlementAmount = roundCurrency(Math.abs(zilamBal));
    settlementMessage = `Zilam Jahid owes ${formatCurrency(settlementAmount)} to fund / Tanvir Rana.`;
    isBalanced = false;

    tanvirItem = {
      memberId: 'tanvir-rana',
      name: 'Tanvir',
      fullName: 'Tanvir Rana',
      action: 'receives',
      actionLabel: 'Receives',
      amount: Math.abs(tanvirBal),
      sourceNote: 'from settlement',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80',
      amountColor: 'text-amber-400',
    };

    zilamItem = {
      memberId: 'zilam-jahid',
      name: 'Zilam',
      fullName: 'Zilam Jahid',
      action: 'owes',
      actionLabel: 'Owes',
      amount: Math.abs(zilamBal),
      sourceNote: 'to fund / Tanvir',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-rose-950 text-rose-300 border border-rose-800/80',
      amountColor: 'text-rose-400',
    };
  } else if (tanvirBal < -0.005 && zilamBal < -0.005) {
    // Both in deficit to the mess fund
    settlementAmount = roundCurrency(Math.abs(remainingFund));
    settlementMessage = `Fund Deficit: Tanvir owes ${formatCurrency(Math.abs(tanvirBal))} & Zilam owes ${formatCurrency(Math.abs(zilamBal))} to fund.`;
    isBalanced = false;

    tanvirItem = {
      memberId: 'tanvir-rana',
      name: 'Tanvir',
      fullName: 'Tanvir Rana',
      action: 'owes',
      actionLabel: 'Owes',
      amount: Math.abs(tanvirBal),
      sourceNote: 'to fund deficit',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-rose-950 text-rose-300 border border-rose-800/80',
      amountColor: 'text-rose-400',
    };

    zilamItem = {
      memberId: 'zilam-jahid',
      name: 'Zilam',
      fullName: 'Zilam Jahid',
      action: 'owes',
      actionLabel: 'Owes',
      amount: Math.abs(zilamBal),
      sourceNote: 'to fund deficit',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-rose-950 text-rose-300 border border-rose-800/80',
      amountColor: 'text-rose-400',
    };
  } else if (tanvirBal > 0.005) {
    settlementReceiver = 'tanvir-rana';
    settlementAmount = tanvirBal;
    settlementMessage = `Tanvir Rana will receive ${formatCurrency(tanvirBal)} from remaining fund.`;
    isBalanced = false;

    tanvirItem = {
      memberId: 'tanvir-rana',
      name: 'Tanvir',
      fullName: 'Tanvir Rana',
      action: 'receives',
      actionLabel: 'Receives',
      amount: tanvirBal,
      sourceNote: 'from remaining fund',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80',
      amountColor: 'text-amber-400',
    };

    zilamItem = {
      memberId: 'zilam-jahid',
      name: 'Zilam',
      fullName: 'Zilam Jahid',
      action: 'settled',
      actionLabel: 'Settled',
      amount: 0,
      sourceNote: 'balanced',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      amountColor: 'text-slate-400',
    };
  } else if (zilamBal > 0.005) {
    settlementReceiver = 'zilam-jahid';
    settlementAmount = zilamBal;
    settlementMessage = `Zilam Jahid will receive ${formatCurrency(zilamBal)} from remaining fund.`;
    isBalanced = false;

    tanvirItem = {
      memberId: 'tanvir-rana',
      name: 'Tanvir',
      fullName: 'Tanvir Rana',
      action: 'settled',
      actionLabel: 'Settled',
      amount: 0,
      sourceNote: 'balanced',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      amountColor: 'text-slate-400',
    };

    zilamItem = {
      memberId: 'zilam-jahid',
      name: 'Zilam',
      fullName: 'Zilam Jahid',
      action: 'receives',
      actionLabel: 'Receives',
      amount: zilamBal,
      sourceNote: 'from remaining fund',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80',
      amountColor: 'text-amber-400',
    };
  } else {
    tanvirItem = {
      memberId: 'tanvir-rana',
      name: 'Tanvir',
      fullName: 'Tanvir Rana',
      action: 'settled',
      actionLabel: 'Settled',
      amount: 0,
      sourceNote: 'balanced',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      amountColor: 'text-slate-400',
    };

    zilamItem = {
      memberId: 'zilam-jahid',
      name: 'Zilam',
      fullName: 'Zilam Jahid',
      action: 'settled',
      actionLabel: 'Settled',
      amount: 0,
      sourceNote: 'balanced',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      amountColor: 'text-slate-400',
    };
  }

  const settlementItems = [tanvirItem, zilamItem];

  return {
    monthId: month.id,
    monthName: month.name,
    status: month.status,
    finalizedAt: month.finalizedAt,
    totalExpenses,
    totalCommonExpenses,
    commonExpensePerMember,
    totalPersonalExpenses,
    totalContributions,
    directContributions,
    autoContributions,
    fundExpensesPaid,
    remainingFund,
    tanvirStats,
    zilamStats,
    settlementPayer,
    settlementReceiver,
    settlementAmount,
    settlementMessage,
    settlementItems,
    isBalanced,
  };
}

/**
 * All-Time Aggregations across all months or filtered selection.
 */
export interface AllTimeSummary {
  totalExpenses: number;
  totalContributions: number;
  totalPaidByTanvir: number;
  totalPaidByZilam: number;
  totalCommonExpenses: number;
  totalPersonalExpenses: number;
  tanvirTotalResponsibility: number;
  zilamTotalResponsibility: number;
  tanvirNetExpenseAllTime: number;
  zilamNetExpenseAllTime: number;
  tanvirNetAllTime: number;
  zilamNetAllTime: number;
  tanvirAllTimeContributions: number;
  zilamAllTimeContributions: number;
}

export function calculateAllTimeSummary(
  months: MessMonth[],
  expenses: Expense[],
  contributions: Contribution[]
): AllTimeSummary {
  let totalExpenses = 0;
  let totalCommonExpenses = 0;
  let totalPersonalExpenses = 0;
  let totalPaidByTanvir = 0;
  let totalPaidByZilam = 0;
  let tanvirTotalResponsibility = 0;
  let zilamTotalResponsibility = 0;

  for (const exp of expenses) {
    totalExpenses = roundCurrency(totalExpenses + exp.amount);
    if (exp.expenseType === 'common') {
      totalCommonExpenses = roundCurrency(totalCommonExpenses + exp.amount);
    } else {
      totalPersonalExpenses = roundCurrency(totalPersonalExpenses + exp.amount);
    }

    if (exp.paidBy === 'tanvir-rana') {
      totalPaidByTanvir = roundCurrency(totalPaidByTanvir + exp.amount);
    } else if (exp.paidBy === 'zilam-jahid') {
      totalPaidByZilam = roundCurrency(totalPaidByZilam + exp.amount);
    }

    tanvirTotalResponsibility = roundCurrency(tanvirTotalResponsibility + exp.tanvirShare);
    zilamTotalResponsibility = roundCurrency(zilamTotalResponsibility + exp.zilamShare);
  }

  let tanvirAllTimeContributions = 0;
  let zilamAllTimeContributions = 0;
  for (const con of contributions) {
    if (con.memberId === 'tanvir-rana') {
      tanvirAllTimeContributions = roundCurrency(tanvirAllTimeContributions + con.amount);
    } else {
      zilamAllTimeContributions = roundCurrency(zilamAllTimeContributions + con.amount);
    }
  }

  const totalContributions = roundCurrency(tanvirAllTimeContributions + zilamAllTimeContributions);
  const tanvirNetExpenseAllTime = roundCurrency(totalPaidByTanvir - tanvirTotalResponsibility);
  const zilamNetExpenseAllTime = roundCurrency(totalPaidByZilam - zilamTotalResponsibility);
  const tanvirNetAllTime = roundCurrency(tanvirAllTimeContributions + tanvirNetExpenseAllTime);
  const zilamNetAllTime = roundCurrency(zilamAllTimeContributions + zilamNetExpenseAllTime);

  return {
    totalExpenses,
    totalContributions,
    totalPaidByTanvir,
    totalPaidByZilam,
    totalCommonExpenses,
    totalPersonalExpenses,
    tanvirTotalResponsibility,
    zilamTotalResponsibility,
    tanvirNetExpenseAllTime,
    zilamNetExpenseAllTime,
    tanvirNetAllTime,
    zilamNetAllTime,
    tanvirAllTimeContributions,
    zilamAllTimeContributions,
  };
}

export interface ExpenseFundStatus {
  isPaid: boolean;
  statusText: 'Paid' | 'Unpaid' | 'Partial';
  paidAmount: number;
  unpaidAmount: number;
  sourceLabel: string;
  sourceType: 'total-fund' | 'tanvir-rana' | 'zilam-jahid';
}

/**
 * Calculates payment coverage status for a specific expense.
 * For Total Fund expenses:
 * - Marked as 'Paid' as long as the expense is covered by the total fund contributions.
 * - If the cost crosses the member's/fund contribution amount, the crossing portion is marked as 'Unpaid' (or Partial).
 */
export function getExpenseFundStatus(
  expense: Expense,
  allExpenses: Expense[],
  allContributions: Contribution[],
  monthId: string
): ExpenseFundStatus {
  if (expense.paidBy !== 'total-fund') {
    return {
      isPaid: true,
      statusText: 'Paid',
      paidAmount: expense.amount,
      unpaidAmount: 0,
      sourceLabel: expense.paidBy === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid',
      sourceType: expense.paidBy,
    };
  }

  // Filter contributions and expenses for this month
  const monthContributions = allContributions.filter((c) => c.monthId === monthId);
  const totalFundAvailable = monthContributions.reduce(
    (sum, c) => roundCurrency(sum + c.amount),
    0
  );

  // Chronologically sort fund expenses (earliest first) to compute coverage
  const fundExpenses = allExpenses
    .filter((e) => e.monthId === monthId && e.paidBy === 'total-fund')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''));

  let cumulativeBefore = 0;
  for (const fe of fundExpenses) {
    if (fe.id === expense.id) {
      break;
    }
    cumulativeBefore = roundCurrency(cumulativeBefore + fe.amount);
  }

  const cumulativeAfter = roundCurrency(cumulativeBefore + expense.amount);

  if (cumulativeAfter <= totalFundAvailable) {
    return {
      isPaid: true,
      statusText: 'Paid',
      paidAmount: expense.amount,
      unpaidAmount: 0,
      sourceLabel: 'Total Fund',
      sourceType: 'total-fund',
    };
  } else if (cumulativeBefore >= totalFundAvailable) {
    return {
      isPaid: false,
      statusText: 'Unpaid',
      paidAmount: 0,
      unpaidAmount: expense.amount,
      sourceLabel: 'Total Fund (Crossed)',
      sourceType: 'total-fund',
    };
  } else {
    const paidAmount = Math.max(0, roundCurrency(totalFundAvailable - cumulativeBefore));
    const unpaidAmount = roundCurrency(expense.amount - paidAmount);
    return {
      isPaid: false,
      statusText: 'Partial',
      paidAmount,
      unpaidAmount,
      sourceLabel: 'Total Fund (Crossed)',
      sourceType: 'total-fund',
    };
  }
}
