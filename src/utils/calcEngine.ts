import {
  Expense,
  Contribution,
  MessMonth,
  MonthlySettlementSummary,
  MemberMonthlyStats,
  SplitSetting,
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

  // Net expense position = Actual Paid - Actual Responsibility
  // If positive, member overpaid (should receive)
  // If negative, member underpaid (should pay)
  const tanvirNetExpensePosition = roundCurrency(tanvirPaid - tanvirTotalResponsibility);
  const zilamNetExpensePosition = roundCurrency(zilamPaid - zilamTotalResponsibility);

  const openingTanvir = month.openingBalance?.['tanvir-rana'] ?? 0;
  const openingZilam = month.openingBalance?.['zilam-jahid'] ?? 0;

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
    currentAccountBalance: roundCurrency(openingTanvir + tanvirDirectContributions + tanvirNetExpensePosition),
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
    currentAccountBalance: roundCurrency(openingZilam + zilamDirectContributions + zilamNetExpensePosition),
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

  if (tanvirBal > 0.005 && zilamBal > 0.005) {
    // Both members have positive closing balance: both receive their refund directly from the remaining mess fund
    settlementMessage = `Tanvir receives ${formatCurrency(tanvirBal)} and Zilam receives ${formatCurrency(zilamBal)} from remaining fund.`;
    settlementAmount = remainingFund;
    isBalanced = false;
  } else if (tanvirBal < -0.005 && zilamBal > 0.005) {
    // Tanvir underpaid, Zilam overpaid
    settlementPayer = 'tanvir-rana';
    settlementReceiver = 'zilam-jahid';
    settlementAmount = roundCurrency(Math.abs(tanvirBal));
    settlementMessage = `Tanvir Rana owes ${formatCurrency(settlementAmount)} to fund / Zilam Jahid.`;
    isBalanced = false;
  } else if (zilamBal < -0.005 && tanvirBal > 0.005) {
    // Zilam underpaid, Tanvir overpaid
    settlementPayer = 'zilam-jahid';
    settlementReceiver = 'tanvir-rana';
    settlementAmount = roundCurrency(Math.abs(zilamBal));
    settlementMessage = `Zilam Jahid owes ${formatCurrency(settlementAmount)} to fund / Tanvir Rana.`;
    isBalanced = false;
  } else if (tanvirBal < -0.005 && zilamBal < -0.005) {
    // Both in deficit to the mess fund
    settlementAmount = roundCurrency(Math.abs(remainingFund));
    settlementMessage = `Fund Deficit: Tanvir owes ${formatCurrency(Math.abs(tanvirBal))} & Zilam owes ${formatCurrency(Math.abs(zilamBal))} to fund.`;
    isBalanced = false;
  } else if (tanvirBal > 0.005) {
    settlementReceiver = 'tanvir-rana';
    settlementAmount = tanvirBal;
    settlementMessage = `Tanvir Rana will receive ${formatCurrency(tanvirBal)} from remaining fund.`;
    isBalanced = false;
  } else if (zilamBal > 0.005) {
    settlementReceiver = 'zilam-jahid';
    settlementAmount = zilamBal;
    settlementMessage = `Zilam Jahid will receive ${formatCurrency(zilamBal)} from remaining fund.`;
    isBalanced = false;
  }

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
