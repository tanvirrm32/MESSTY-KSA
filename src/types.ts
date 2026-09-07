export interface Member {
  id: 'tanvir-rana' | 'zilam-jahid';
  name: string;
  shortName: string;
  avatarColor: string;
}

export const MEMBERS: Member[] = [
  {
    id: 'tanvir-rana',
    name: 'Tanvir Rana',
    shortName: 'Tanvir',
    avatarColor: 'emerald',
  },
  {
    id: 'zilam-jahid',
    name: 'Zilam Jahid',
    shortName: 'Zilam',
    avatarColor: 'blue',
  },
];

export type ExpenseType = 'common' | 'personal';
export type PaymentMethod = 'Cash' | 'Bank' | 'Other';
export type MonthStatus = 'active' | 'finalized';

export interface Category {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface SplitSetting {
  tanvirPercent: number; // e.g. 50
  zilamPercent: number;  // e.g. 50
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  monthId: string; // YYYY-MM
  categoryId: string;
  description: string;
  amount: number;
  paidBy: 'tanvir-rana' | 'zilam-jahid' | 'total-fund';
  expenseType: ExpenseType;
  personalFor?: 'tanvir-rana' | 'zilam-jahid'; // whose personal expense this is
  splitRatio: SplitSetting;
  tanvirShare: number; // calculated decimal-safe
  zilamShare: number;  // calculated decimal-safe
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: 'tanvir-rana' | 'zilam-jahid' | 'guest';
  createdByName?: string;
  updatedBy?: 'tanvir-rana' | 'zilam-jahid' | 'guest';
  updatedByName?: string;
  linkedContributionId?: string;
  autoContribute?: boolean;
}

export interface Contribution {
  id: string;
  date: string; // YYYY-MM-DD
  monthId: string; // YYYY-MM
  memberId: 'tanvir-rana' | 'zilam-jahid';
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: 'tanvir-rana' | 'zilam-jahid' | 'guest';
  createdByName?: string;
  updatedBy?: 'tanvir-rana' | 'zilam-jahid' | 'guest';
  updatedByName?: string;
  linkedExpenseId?: string;
  isAutoExpense?: boolean;
}

export interface MemberMonthlyStats {
  memberId: 'tanvir-rana' | 'zilam-jahid';
  name: string;
  // Opening balance from previous finalized month
  openingBalance: number;
  // Total money contributed/deposited (Direct + Auto Bazaar)
  totalContributions: number;
  // Direct cash/bank contributions
  directContributions: number;
  // Auto-contributions from bazaar expenses
  autoContributions: number;
  // Total actual money paid out-of-pocket for expenses
  totalExpensesPaid: number;
  // Common expenses paid by this member
  commonExpensesPaid: number;
  // Personal expenses paid by this member
  personalExpensesPaid: number;
  // Member's calculated share of common expenses
  commonExpenseShare: number;
  // Member's personal expenses responsibility
  personalExpenseResponsibility: number;
  // Total expense responsibility = commonExpenseShare + personalExpenseResponsibility
  totalExpenseResponsibility: number;
  // Amount paid on behalf of the other member
  amountPaidOnBehalfOfOther: number;
  // Amount owed to the other member
  amountOwedToOther: number;
  // Net expense position = totalExpensesPaid - totalExpenseResponsibility
  // If positive: member overpaid (receivable)
  // If negative: member underpaid (owed)
  netExpensePosition: number;
  // Total ledger balance = openingBalance + directContributions + netExpensePosition
  // (which is identical to openingBalance + totalContributions - totalExpenseResponsibility)
  currentAccountBalance: number;
}

export interface MonthlySettlementSummary {
  monthId: string;
  monthName: string;
  status: MonthStatus;
  finalizedAt?: string | null;
  totalExpenses: number;
  totalCommonExpenses: number;
  commonExpensePerMember: number;
  totalPersonalExpenses: number;
  totalContributions: number;
  directContributions: number;
  autoContributions: number;
  fundExpensesPaid: number;
  remainingFund: number;
  tanvirStats: MemberMonthlyStats;
  zilamStats: MemberMonthlyStats;
  // The settlement verdict
  // Who should pay whom
  settlementPayer: 'tanvir-rana' | 'zilam-jahid' | null;
  settlementReceiver: 'tanvir-rana' | 'zilam-jahid' | null;
  settlementAmount: number;
  settlementMessage: string;
  isBalanced: boolean;
}

export interface MessMonth {
  id: string; // e.g. '2026-09'
  name: string; // e.g. 'September 2026'
  year: number;
  monthNumber: number; // 1-12
  status: MonthStatus;
  finalizedAt?: string | null;
  openingBalance: {
    'tanvir-rana': number;
    'zilam-jahid': number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'FINALIZE' | 'REOPEN' | 'BACKUP_RESTORE' | 'CLEAR';
  entityType: 'Expense' | 'Contribution' | 'Category' | 'Month' | 'System';
  entityId: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  performedBy?: 'tanvir-rana' | 'zilam-jahid' | 'guest' | 'system';
  performedByName?: string;
}

export interface AuthSettings {
  enabled: boolean;
  requirePin: boolean;
  tanvirPin: string;
  zilamPin: string;
}

export interface AppSettings {
  appName: string;
  appSubtitle: string;
  messAddress?: string;
  contactNumber?: string;
  currencySymbol: string;
  notes?: string;
  auth: AuthSettings;
}

export interface AppDatabase {
  version: number;
  months: MessMonth[];
  categories: Category[];
  expenses: Expense[];
  contributions: Contribution[];
  auditLogs: AuditLog[];
  settings?: AppSettings;
  deletedExpenseIds?: string[];
  deletedContributionIds?: string[];
  deletedCategoryIds?: string[];
  updatedAt?: string;
}
