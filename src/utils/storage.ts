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
    deletedExpenseIds: [],
    deletedContributionIds: [],
    deletedCategoryIds: [],
  };
}

/**
 * Intelligent non-destructive merge: guarantees no user-input data (expenses,
 * deposits, categories, settings, months) is ever lost when system updates,
 * feature updates, or multi-device syncs occur.
 */
export function mergeDatabases(local: AppDatabase, remote: AppDatabase): AppDatabase {
  const deletedExpenseIds = new Set([
    ...(local.deletedExpenseIds || []),
    ...(remote.deletedExpenseIds || []),
  ]);
  const deletedContributionIds = new Set([
    ...(local.deletedContributionIds || []),
    ...(remote.deletedContributionIds || []),
  ]);
  const deletedCategoryIds = new Set([
    ...(local.deletedCategoryIds || []),
    ...(remote.deletedCategoryIds || []),
  ]);

  // Merge expenses by ID, preserving whichever is newer and never losing unique expenses
  const expenseMap = new Map<string, Expense>();
  for (const e of local.expenses || []) {
    if (!deletedExpenseIds.has(e.id)) {
      expenseMap.set(e.id, e);
    }
  }
  for (const re of remote.expenses || []) {
    if (deletedExpenseIds.has(re.id)) continue;
    const existing = expenseMap.get(re.id);
    if (!existing) {
      expenseMap.set(re.id, re);
    } else {
      const exTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const reTime = new Date(re.updatedAt || re.createdAt || 0).getTime();
      if (reTime >= exTime) {
        expenseMap.set(re.id, re);
      }
    }
  }

  // Merge contributions by ID
  const contributionMap = new Map<string, Contribution>();
  for (const c of local.contributions || []) {
    if (!deletedContributionIds.has(c.id)) {
      contributionMap.set(c.id, c);
    }
  }
  for (const rc of remote.contributions || []) {
    if (deletedContributionIds.has(rc.id)) continue;
    const existing = contributionMap.get(rc.id);
    if (!existing) {
      contributionMap.set(rc.id, rc);
    } else {
      const exTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const rcTime = new Date(rc.updatedAt || rc.createdAt || 0).getTime();
      if (rcTime >= exTime) {
        contributionMap.set(rc.id, rc);
      }
    }
  }

  // Merge months
  const monthMap = new Map<string, MessMonth>();
  for (const m of local.months || []) {
    monthMap.set(m.id, m);
  }
  for (const rm of remote.months || []) {
    const existing = monthMap.get(rm.id);
    if (!existing) {
      monthMap.set(rm.id, rm);
    } else {
      // Keep finalized status if either finalized
      if (rm.status === 'finalized' || !existing.name) {
        monthMap.set(rm.id, rm);
      }
    }
  }
  let mergedMonths = Array.from(monthMap.values());
  if (mergedMonths.length === 0) {
    mergedMonths = [...INITIAL_MONTHS];
  }

  // Merge categories (all defaults + all custom)
  const categoryMap = new Map<string, Category>();
  for (const dc of DEFAULT_CATEGORIES) {
    categoryMap.set(dc.id, dc);
  }
  for (const lc of local.categories || []) {
    if (!deletedCategoryIds.has(lc.id)) {
      categoryMap.set(lc.id, lc);
    }
  }
  for (const rc of remote.categories || []) {
    if (!deletedCategoryIds.has(rc.id)) {
      categoryMap.set(rc.id, rc);
    }
  }

  // Merge settings: preserve user settings over defaults
  const base = DEFAULT_APP_SETTINGS;
  const lSet = local.settings || base;
  const rSet = remote.settings || base;

  const mergedSettings: AppSettings = {
    appName: (rSet.appName && rSet.appName.trim()) || (lSet.appName && lSet.appName.trim()) || base.appName,
    appSubtitle: rSet.appSubtitle !== undefined ? rSet.appSubtitle : lSet.appSubtitle !== undefined ? lSet.appSubtitle : base.appSubtitle,
    messAddress: rSet.messAddress !== undefined ? rSet.messAddress : lSet.messAddress !== undefined ? lSet.messAddress : '',
    contactNumber: rSet.contactNumber !== undefined ? rSet.contactNumber : lSet.contactNumber !== undefined ? lSet.contactNumber : '',
    currencySymbol: (rSet.currencySymbol && rSet.currencySymbol.trim()) || (lSet.currencySymbol && lSet.currencySymbol.trim()) || base.currencySymbol,
    notes: rSet.notes !== undefined ? rSet.notes : lSet.notes !== undefined ? lSet.notes : '',
    auth: {
      enabled: rSet.auth?.enabled !== undefined ? rSet.auth.enabled : lSet.auth?.enabled !== undefined ? lSet.auth.enabled : base.auth.enabled,
      requirePin: rSet.auth?.requirePin !== undefined ? rSet.auth.requirePin : lSet.auth?.requirePin !== undefined ? lSet.auth.requirePin : base.auth.requirePin,
      tanvirPin: rSet.auth?.tanvirPin || lSet.auth?.tanvirPin || base.auth.tanvirPin,
      zilamPin: rSet.auth?.zilamPin || lSet.auth?.zilamPin || base.auth.zilamPin,
    },
  };

  // Merge audit logs (union by ID, sorted by timestamp descending)
  const auditMap = new Map<string, AuditLog>();
  for (const log of local.auditLogs || []) {
    auditMap.set(log.id, log);
  }
  for (const rlog of remote.auditLogs || []) {
    auditMap.set(rlog.id, rlog);
  }
  const mergedAuditLogs = Array.from(auditMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    version: Math.max(local.version || 1, remote.version || 1),
    months: mergedMonths,
    categories: Array.from(categoryMap.values()),
    expenses: Array.from(expenseMap.values()),
    contributions: Array.from(contributionMap.values()),
    auditLogs: mergedAuditLogs,
    settings: mergedSettings,
    deletedExpenseIds: Array.from(deletedExpenseIds),
    deletedContributionIds: Array.from(deletedContributionIds),
    deletedCategoryIds: Array.from(deletedCategoryIds),
    updatedAt: new Date().toISOString(),
  };
}

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDatabase();
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<AppDatabase>;

    // Non-destructive preservation: never wipe user-entered data
    const months = Array.isArray(parsed.months) && parsed.months.length > 0 ? parsed.months : INITIAL_MONTHS;
    const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES;
    const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    const contributions = Array.isArray(parsed.contributions) ? parsed.contributions : [];
    const auditLogs = Array.isArray(parsed.auditLogs) ? parsed.auditLogs : INITIAL_AUDIT_LOGS;

    const settings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...(parsed.settings || {}),
      auth: {
        ...DEFAULT_APP_SETTINGS.auth,
        ...(parsed.settings?.auth || {}),
      },
    };

    const loaded: AppDatabase = {
      version: parsed.version || 1,
      months,
      categories,
      expenses,
      contributions,
      auditLogs,
      settings,
      deletedExpenseIds: parsed.deletedExpenseIds || [],
      deletedContributionIds: parsed.deletedContributionIds || [],
      deletedCategoryIds: parsed.deletedCategoryIds || [],
      updatedAt: parsed.updatedAt,
    };

    return loaded;
  } catch (err) {
    console.error('Failed to load database from localStorage, recovering initial database structure', err);
    return getInitialDatabase();
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
    settings: parsed.settings ? {
      ...DEFAULT_APP_SETTINGS,
      ...parsed.settings,
      auth: {
        ...DEFAULT_APP_SETTINGS.auth,
        ...(parsed.settings.auth || {}),
      },
    } : DEFAULT_APP_SETTINGS,
    deletedExpenseIds: parsed.deletedExpenseIds || [],
    deletedContributionIds: parsed.deletedContributionIds || [],
    deletedCategoryIds: parsed.deletedCategoryIds || [],
    updatedAt: parsed.updatedAt || new Date().toISOString(),
  };
}
