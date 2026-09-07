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

  // Determine who should pay whom to equalize their total financial positions:
  // Account Balance = Opening Balance + Direct Deposits + Net Expense Position
  // (Identical to Opening Balance + Total Contributions - Total Expense Responsibility)
  const netBalanceDifference = roundCurrency(tanvirStats.currentAccountBalance - zilamStats.currentAccountBalance);
  let settlementPayer: 'tanvir-rana' | 'zilam-jahid' | null = null;
  let settlementReceiver: 'tanvir-rana' | 'zilam-jahid' | null = null;
  let settlementAmount = 0;
  let settlementMessage = 'Settlement Complete — Accounts are fully balanced.';
  let isBalanced = true;

  // Using strict threshold to ignore floating point epsilon
  if (netBalanceDifference > 0.005) {
    // Tanvir has higher equity / overpaid; Zilam pays Tanvir half the difference to equalize
    settlementPayer = 'zilam-jahid';
    settlementReceiver = 'tanvir-rana';
    settlementAmount = roundCurrency(netBalanceDifference / 2);
    settlementMessage = `Zilam Jahid should pay Tanvir Rana ${formatCurrency(settlementAmount)}.`;
    isBalanced = false;
  } else if (netBalanceDifference < -0.005) {
    // Zilam has higher equity / overpaid; Tanvir pays Zilam half the difference to equalize
    settlementPayer = 'tanvir-rana';
    settlementReceiver = 'zilam-jahid';
    settlementAmount = roundCurrency(Math.abs(netBalanceDifference) / 2);
    settlementMessage = `Tanvir Rana should pay Zilam Jahid ${formatCurrency(settlementAmount)}.`;
    isBalanced = false;
  }

  // Total fund used is the total mess expenses incurred for this month
  const fundExpensesPaid = totalExpenses;
  const remainingFund = roundCurrency(totalContributions - totalExpenses);

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
