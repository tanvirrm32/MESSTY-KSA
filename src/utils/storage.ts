import { AppDatabase, Category, Expense, Contribution, MessMonth, AuditLog, AppSettings } from '../types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'MESSTY-KSA',
  appSubtitle: 'Living Cost Management',
  messAddress: '',
  contactNumber: '',
  currencySymbol: 'SAR',
  notes: '',
  auth: {
    enabled: true,
    requirePin: true,
    tanvirPin: '1234',
    zilamPin: '1234',
  },
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-grocery', name: 'Grocery', isDefault: true },
  { id: 'cat-food', name: 'Food', isDefault: true },
  { id: 'cat-rice', name: 'Rice', isDefault: true },
  { id: 'cat-vegetables', name: 'Vegetables', isDefault: true },
  { id: 'cat-meat', name: 'Meat', isDefault: true },
  { id: 'cat-fish', name: 'Fish', isDefault: true },
  { id: 'cat-electricity', name: 'Electricity', isDefault: true },
  { id: 'cat-gas', name: 'Gas', isDefault: true },
  { id: 'cat-water', name: 'Water', isDefault: true },
  { id: 'cat-internet', name: 'Internet', isDefault: true },
  { id: 'cat-cleaning', name: 'Cleaning', isDefault: true },
  { id: 'cat-rent', name: 'House Rent', isDefault: true },
  { id: 'cat-transport', name: 'Transportation', isDefault: true },
  { id: 'cat-other', name: 'Other', isDefault: true },
];

export const INITIAL_MONTHS: MessMonth[] = [
  {
    id: '2026-09',
    name: 'September 2026',
    year: 2026,
    monthNumber: 9,
    status: 'active',
    finalizedAt: null,
    openingBalance: {
      'tanvir-rana': 0,
      'zilam-jahid': 0,
    },
  },
];

export const SAMPLE_EXPENSE_IDS = new Set(['EXP-1001', 'EXP-1002', 'EXP-1003', 'EXP-1004']);
export const SAMPLE_CONTRIBUTION_IDS = new Set(['CON-1001', 'CON-1002']);

export const INITIAL_CONTRIBUTIONS: Contribution[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-09-01T10:00:00.000Z',
    action: 'CREATE',
    entityType: 'System',
    entityId: 'SYSTEM',
    description: 'Mess ledger system initialized for Tanvir Rana & Zilam Jahid',
  },
];

const STORAGE_KEY = 'monthly_mess_management_db_v1';

export function getInitialDatabase(): AppDatabase {
  return {
    version: 1,
    months: INITIAL_MONTHS,
    categories: DEFAULT_CATEGORIES,
    expenses: INITIAL_EXPENSES,
    contributions: INITIAL_CONTRIBUTIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    settings: DEFAULT_APP_SETTINGS,
  };
}

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDatabase();
      saveDatabase(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppDatabase;
    // ensure required fields exist
    if (!parsed.expenses || !parsed.contributions || !parsed.months) {
      const initial = getInitialDatabase();
      saveDatabase(initial);
      return initial;
    }
    // Preserve user settings without force-overwriting custom values
    if (!parsed.settings) {
      parsed.settings = DEFAULT_APP_SETTINGS;
    } else {
      parsed.settings = {
        ...DEFAULT_APP_SETTINGS,
        ...parsed.settings,
        auth: {
          ...DEFAULT_APP_SETTINGS.auth,
          ...(parsed.settings.auth || {}),
        },
      };
    }

    // Permanently remove sample demo expenses and contributions if present in storage
    parsed.expenses = (parsed.expenses || []).filter((e) => !SAMPLE_EXPENSE_IDS.has(e.id));
    parsed.contributions = (parsed.contributions || []).filter(
      (c) => !SAMPLE_CONTRIBUTION_IDS.has(c.id) && !SAMPLE_EXPENSE_IDS.has(c.linkedExpenseId || '')
    );

    saveDatabase(parsed);
    return parsed;
  } catch (err) {
    console.error('Failed to load database from localStorage, initializing default', err);
    const initial = getInitialDatabase();
    return initial;
  }
}

export function syncExistingBazaarContributions(db: AppDatabase): AppDatabase {
  let hasChanges = false;
  const newContributions = [...db.contributions];
  const newExpenses = db.expenses.map((expense) => {
    // Check if a contribution already exists for this expense
    const existingCon = newContributions.find(
      (c) =>
        c.linkedExpenseId === expense.id ||
        (expense.linkedContributionId && c.id === expense.linkedContributionId)
    );
    if (!existingCon && expense.paidBy !== 'total-fund' && expense.autoContribute !== false) {
      hasChanges = true;
      const conId = expense.linkedContributionId || `CON-AUTO-${expense.id.slice(-6)}`;
      const category = db.categories.find((c) => c.id === expense.categoryId);
      const newCon: Contribution = {
        id: conId,
        date: expense.date,
        monthId: expense.monthId,
        memberId: expense.paidBy,
        amount: expense.amount,
        paymentMethod: 'Cash',
        reference: `Bazaar: ${expense.description}`,
        notes: `Auto-credited from bazaar expense (${category?.name || 'Bazaar'})`,
        createdAt: expense.createdAt || new Date().toISOString(),
        linkedExpenseId: expense.id,
        isAutoExpense: true,
      };
      newContributions.unshift(newCon);
      return {
        ...expense,
        linkedContributionId: conId,
        autoContribute: true,
      };
    }
    return expense;
  });

  if (!hasChanges) return db;
  return {
    ...db,
    expenses: newExpenses,
    contributions: newContributions,
  };
}

export function saveDatabase(db: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save database to localStorage', err);
  }
}

export function exportDatabaseJSON(db: AppDatabase): string {
  return JSON.stringify(db, null, 2);
}

export function importDatabaseJSON(jsonString: string): AppDatabase {
  const parsed = JSON.parse(jsonString);
  if (!parsed.months || !parsed.expenses || !parsed.contributions) {
    throw new Error('Invalid database backup format. Required entities missing.');
  }
  return {
    version: parsed.version || 1,
    months: parsed.months,
    categories: parsed.categories || DEFAULT_CATEGORIES,
    expenses: parsed.expenses,
    contributions: parsed.contributions,
    auditLogs: parsed.auditLogs || [],
  };
}
