import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  syncDatabaseToFirebase,
  subscribeToFirebaseMess,
} from '../firebase';
import {
  AppDatabase,
  MessMonth,
  Expense,
  Contribution,
  Category,
  AuditLog,
  MonthlySettlementSummary,
  SplitSetting,
  AppSettings,
  AuthSettings,
  Member,
  MEMBERS,
} from '../types';
import {
  loadDatabase,
  saveDatabase,
  getInitialDatabase,
  exportDatabaseJSON,
  importDatabaseJSON,
  syncExistingBazaarContributions,
  DEFAULT_APP_SETTINGS,
} from '../utils/storage';
import {
  calculateMonthlySettlement,
  calculateExpenseShares,
  roundCurrency,
} from '../utils/calcEngine';

export type AppNavTab =
  | 'dashboard'
  | 'transactions'
  | 'contributions'
  | 'members'
  | 'settlement'
  | 'reports'
  | 'categories'
  | 'history'
  | 'settings';

interface MessContextType {
  db: AppDatabase;
  currentMonthId: string;
  setCurrentMonthId: (id: string) => void;
  currentMonth: MessMonth;
  currentSettlement: MonthlySettlementSummary;
  allSettlements: Map<string, MonthlySettlementSummary>;
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  selectedMemberId: 'tanvir-rana' | 'zilam-jahid';
  setSelectedMemberId: (id: 'tanvir-rana' | 'zilam-jahid') => void;

  // Expense operations
  addExpense: (expenseData: {
    date: string;
    monthId: string;
    categoryId: string;
    description: string;
    amount: number;
    paidBy: 'tanvir-rana' | 'zilam-jahid' | 'total-fund';
    expenseType: 'common' | 'personal';
    personalFor?: 'tanvir-rana' | 'zilam-jahid';
    splitRatio?: SplitSetting;
    notes?: string;
    autoContribute?: boolean;
  }) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Contribution operations
  addContribution: (contributionData: {
    date: string;
    monthId: string;
    memberId: 'tanvir-rana' | 'zilam-jahid';
    amount: number;
    paymentMethod: 'Cash' | 'Bank' | 'Other';
    reference?: string;
    notes?: string;
  }) => void;
  updateContribution: (id: string, updates: Partial<Contribution>) => void;
  deleteContribution: (id: string) => void;
  syncBazaarExpensesToContributions: () => void;

  // Month operations
  createMonth: (year: number, monthNumber: number) => string;
  finalizeMonth: (monthId: string) => void;
  reopenMonth: (monthId: string) => void;
  deleteMonth: (monthId: string) => boolean;

  // Category operations
  addCategory: (categoryOrName: string | (Omit<Category, 'id'> & { id?: string })) => void;
  updateCategory: (id: string, categoryOrName: string | Partial<Category>) => void;
  deleteCategory: (id: string, reassignToCategoryId?: string) => boolean;

  // Backup & Reset
  exportBackup: () => string;
  restoreBackup: (jsonString: string) => boolean;
  restoreFromBackup: (jsonString: string) => boolean;
  resetToSampleData: () => void;
  resetToDefaultData: () => void;
  clearAllData: () => void;

  // App Settings & Details
  appSettings: AppSettings;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  updateAuthSettings: (updates: Partial<AuthSettings>) => void;
  updateAuthPreferences: (prefs: { enabled?: boolean; requirePin?: boolean }) => void;

  // Authentication & Login System
  currentUser: 'tanvir-rana' | 'zilam-jahid' | 'guest' | null;
  activeMember: Member | null;
  loginMember: (memberId: 'tanvir-rana' | 'zilam-jahid', pin?: string) => { success: boolean; error?: string };
  logoutMember: () => void;
  switchMember: (memberId: 'tanvir-rana' | 'zilam-jahid') => void;
  switchMemberWithPin: (memberId: 'tanvir-rana' | 'zilam-jahid', pin: string) => { success: boolean; error?: string };
  changeMemberPin: (memberId: 'tanvir-rana' | 'zilam-jahid', currentPin: string, newPin: string) => { success: boolean; error?: string };
  continueAsGuest: () => void;

  // Cloud / Firebase Live Sync
  firebaseSyncStatus: 'connected' | 'syncing' | 'error' | 'offline';
  lastSyncedAt: string | null;
  forceSyncToFirebase: () => Promise<void>;

  // Modals state
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: (open: boolean) => void;
  editingExpense: Expense | null;
  setEditingExpense: (expense: Expense | null) => void;

  isContributionModalOpen: boolean;
  setIsContributionModalOpen: (open: boolean) => void;
  editingContribution: Contribution | null;
  setEditingContribution: (contribution: Contribution | null) => void;
}

const MessContext = createContext<MessContextType | undefined>(undefined);

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [currentMonthId, setCurrentMonthId] = useState<string>(() => {
    // Default to the latest active month or first month
    const activeMonths = db.months.filter((m) => m.status === 'active');
    if (activeMonths.length > 0) {
      return activeMonths[activeMonths.length - 1].id;
    }
    return db.months[db.months.length - 1]?.id || '2026-09';
  });

  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<'tanvir-rana' | 'zilam-jahid'>('tanvir-rana');

  // App Settings & Details
  const appSettings = useMemo<AppSettings>(() => {
    return {
      ...DEFAULT_APP_SETTINGS,
      ...(db.settings || {}),
      auth: {
        ...DEFAULT_APP_SETTINGS.auth,
        ...(db.settings?.auth || {}),
      },
    };
  }, [db.settings]);

  // Authentication & Session
  const SESSION_USER_KEY = 'mess_current_logged_in_user';
  const [currentUser, setCurrentUser] = useState<'tanvir-rana' | 'zilam-jahid' | 'guest' | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_USER_KEY);
      if (saved === 'tanvir-rana' || saved === 'zilam-jahid' || saved === 'guest') {
        return saved;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const activeMember = useMemo(() => {
    if (currentUser === 'tanvir-rana' || currentUser === 'zilam-jahid') {
      return MEMBERS.find((m) => m.id === currentUser) || null;
    }
    return null;
  }, [currentUser]);

  const getCurrentAuthor = (): { id: 'tanvir-rana' | 'zilam-jahid' | 'guest'; name: string } => {
    if (currentUser === 'zilam-jahid') {
      return { id: 'zilam-jahid', name: 'Zilam Jahid' };
    }
    if (currentUser === 'guest') {
      return { id: 'guest', name: 'Guest User' };
    }
    return { id: 'tanvir-rana', name: 'Tanvir Rana' };
  };

  // Keep document title synced with custom app name
  useEffect(() => {
    if (appSettings.appName) {
      document.title = `${appSettings.appName} • ${appSettings.appSubtitle || 'Mess Ledger'}`;
    }
  }, [appSettings.appName, appSettings.appSubtitle]);

  // If user logs in/switches, keep selectedMemberId aligned
  useEffect(() => {
    if (currentUser === 'tanvir-rana' || currentUser === 'zilam-jahid') {
      setSelectedMemberId(currentUser);
    }
  }, [currentUser]);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);

  // Cloud / Firebase Live State
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState<'connected' | 'syncing' | 'error' | 'offline'>('connected');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isRemoteIncoming = useRef<boolean>(false);

  // Listen for real-time changes from Firebase Firestore
  useEffect(() => {
    let isMounted = true;
    setFirebaseSyncStatus('syncing');

    const unsubscribe = subscribeToFirebaseMess(
      (remoteData) => {
        if (!isMounted) return;
        if (remoteData && Array.isArray(remoteData.months) && remoteData.months.length > 0) {
          isRemoteIncoming.current = true;
          setDb(remoteData);
          setFirebaseSyncStatus('connected');
          setLastSyncedAt(new Date().toLocaleTimeString());
          setTimeout(() => {
            isRemoteIncoming.current = false;
          }, 400);
        } else {
          // Document empty in Firebase, seed with current local data
          syncDatabaseToFirebase(db)
            .then(() => {
              if (isMounted) {
                setFirebaseSyncStatus('connected');
                setLastSyncedAt(new Date().toLocaleTimeString());
              }
            })
            .catch((err) => {
              console.error('[Firebase] Initial seed error:', err);
              if (isMounted) setFirebaseSyncStatus('error');
            });
        }
      },
      (error) => {
        console.error('[Firebase] Realtime sync error:', error);
        if (isMounted) setFirebaseSyncStatus('error');
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Sync to localStorage & Firebase
  useEffect(() => {
    saveDatabase(db);

    if (!isRemoteIncoming.current) {
      setFirebaseSyncStatus('syncing');
      const timer = setTimeout(() => {
        syncDatabaseToFirebase(db)
          .then(() => {
            setFirebaseSyncStatus('connected');
            setLastSyncedAt(new Date().toLocaleTimeString());
          })
          .catch((err) => {
            console.error('[Firebase] Auto-sync failed:', err);
            setFirebaseSyncStatus('error');
          });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [db]);

  const forceSyncToFirebase = async () => {
    try {
      setFirebaseSyncStatus('syncing');
      await syncDatabaseToFirebase(db);
      setFirebaseSyncStatus('connected');
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setFirebaseSyncStatus('error');
      throw err;
    }
  };

  // Cleanup August 2026 if present
  useEffect(() => {
    if (db.months.some((m) => m.id === '2026-08')) {
      setDb((prev) => ({
        ...prev,
        months: prev.months.filter((m) => m.id !== '2026-08'),
        expenses: prev.expenses.filter((e) => e.monthId !== '2026-08'),
        contributions: prev.contributions.filter((c) => c.monthId !== '2026-08'),
      }));
      if (currentMonthId === '2026-08') {
        setCurrentMonthId('2026-09');
      }
    }
  }, [db.months, currentMonthId]);

  // Current active month object
  const currentMonth = useMemo(() => {
    const found = db.months.find((m) => m.id === currentMonthId);
    if (found) return found;
    // Fallback if deleted or invalid
    if (db.months.length > 0) return db.months[0];
    const fallback: MessMonth = {
      id: '2026-09',
      name: 'September 2026',
      year: 2026,
      monthNumber: 9,
      status: 'active',
      openingBalance: { 'tanvir-rana': 0, 'zilam-jahid': 0 },
    };
    return fallback;
  }, [db.months, currentMonthId]);

  // Settlements map for all months
  const allSettlements = useMemo(() => {
    const map = new Map<string, MonthlySettlementSummary>();
    for (const m of db.months) {
      map.set(m.id, calculateMonthlySettlement(m, db.expenses, db.contributions));
    }
    return map;
  }, [db.months, db.expenses, db.contributions]);

  // Current month's settlement summary
  const currentSettlement = useMemo(() => {
    return allSettlements.get(currentMonth.id) || calculateMonthlySettlement(currentMonth, db.expenses, db.contributions);
  }, [allSettlements, currentMonth, db.expenses, db.contributions]);

  // Add Expense (with automatic bazaar contribution support)
  const addExpense = (expenseData: {
    date: string;
    monthId: string;
    categoryId: string;
    description: string;
    amount: number;
    paidBy: 'tanvir-rana' | 'zilam-jahid' | 'total-fund';
    expenseType: 'common' | 'personal';
    personalFor?: 'tanvir-rana' | 'zilam-jahid';
    splitRatio?: SplitSetting;
    notes?: string;
    autoContribute?: boolean;
  }) => {
    const splitRatio = expenseData.splitRatio || { tanvirPercent: 50, zilamPercent: 50 };
    const { tanvirShare, zilamShare } = calculateExpenseShares(
      expenseData.amount,
      expenseData.expenseType,
      expenseData.paidBy,
      expenseData.personalFor,
      splitRatio
    );

    const now = new Date().toISOString();
    const id = `EXP-${Date.now().toString().slice(-6)}`;
    const shouldAutoContribute = expenseData.paidBy !== 'total-fund' && expenseData.autoContribute !== false;
    const conId = shouldAutoContribute ? `CON-AUTO-${Date.now().toString().slice(-6)}` : undefined;
    const author = getCurrentAuthor();

    const newExpense: Expense = {
      id,
      date: expenseData.date,
      monthId: expenseData.monthId,
      categoryId: expenseData.categoryId,
      description: expenseData.description.trim(),
      amount: roundCurrency(expenseData.amount),
      paidBy: expenseData.paidBy,
      expenseType: expenseData.expenseType,
      personalFor: expenseData.personalFor,
      splitRatio,
      tanvirShare,
      zilamShare,
      notes: expenseData.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
      createdBy: author.id,
      createdByName: author.name,
      updatedBy: author.id,
      updatedByName: author.name,
      linkedContributionId: conId,
      autoContribute: shouldAutoContribute,
    };

    const auditLogExpense: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: now,
      action: 'CREATE',
      entityType: 'Expense',
      entityId: id,
      description: `[${author.name}] Added expense "${newExpense.description}" of SAR ${newExpense.amount.toFixed(2)} (Paid by ${
        newExpense.paidBy === 'total-fund' ? 'Total Fund' : newExpense.paidBy === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'
      })`,
      newValue: JSON.stringify(newExpense),
      performedBy: author.id,
      performedByName: author.name,
    };

    let newContribution: Contribution | null = null;
    let auditLogContribution: AuditLog | null = null;

    if (shouldAutoContribute && conId && newExpense.paidBy !== 'total-fund') {
      const category = db.categories.find((c) => c.id === expenseData.categoryId);
      newContribution = {
        id: conId,
        date: newExpense.date,
        monthId: newExpense.monthId,
        memberId: newExpense.paidBy,
        amount: newExpense.amount,
        paymentMethod: 'Cash',
        reference: `Bazaar: ${newExpense.description}`,
        notes: `Auto-credited from bazaar expense (${category?.name || 'Bazaar'})`,
        createdAt: now,
        updatedAt: now,
        createdBy: author.id,
        createdByName: author.name,
        updatedBy: author.id,
        updatedByName: author.name,
        linkedExpenseId: id,
        isAutoExpense: true,
      };

      auditLogContribution = {
        id: `LOG-${(Date.now() + 1).toString().slice(-6)}`,
        timestamp: now,
        action: 'CREATE',
        entityType: 'Contribution',
        entityId: conId,
        description: `[${author.name}] Auto-recorded deposit of SAR ${newContribution.amount.toFixed(2)} from bazaar expense for ${
          newContribution.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'
        }`,
        newValue: JSON.stringify(newContribution),
        performedBy: author.id,
        performedByName: author.name,
      };
    }

    setDb((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      contributions: newContribution ? [newContribution, ...prev.contributions] : prev.contributions,
      auditLogs: [
        auditLogExpense,
        ...(auditLogContribution ? [auditLogContribution] : []),
        ...prev.auditLogs,
      ],
    }));
  };

  // Update Expense (synchronizing linked contribution)
  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setDb((prev) => {
      const existing = prev.expenses.find((e) => e.id === id);
      if (!existing) return prev;

      const author = getCurrentAuthor();
      const updatedAmount = updates.amount !== undefined ? roundCurrency(updates.amount) : existing.amount;
      const updatedType = updates.expenseType || existing.expenseType;
      const updatedPaidBy = updates.paidBy || existing.paidBy;
      const updatedPersonalFor = updates.personalFor !== undefined ? updates.personalFor : existing.personalFor;
      const updatedSplit = updates.splitRatio || existing.splitRatio;

      const { tanvirShare, zilamShare } = calculateExpenseShares(
        updatedAmount,
        updatedType,
        updatedPaidBy,
        updatedPersonalFor,
        updatedSplit
      );

      const now = new Date().toISOString();
      const shouldAutoContribute =
        updatedPaidBy !== 'total-fund' &&
        (updates.autoContribute !== undefined ? updates.autoContribute : existing.autoContribute !== false);
      const existingCon = prev.contributions.find(
        (c) => c.linkedExpenseId === id || (existing.linkedContributionId && c.id === existing.linkedContributionId)
      );

      let updatedContributions = prev.contributions;
      let linkedContributionId = existing.linkedContributionId;

      if (shouldAutoContribute && updatedPaidBy !== 'total-fund') {
        const category = prev.categories.find((c) => c.id === (updates.categoryId || existing.categoryId));
        const catName = category?.name || 'Bazaar';
        const desc = (updates.description || existing.description).trim();
        const expenseDate = updates.date || existing.date;
        const expenseMonthId = updates.monthId || existing.monthId;

        if (existingCon) {
          const updatedCon: Contribution = {
            ...existingCon,
            date: expenseDate,
            monthId: expenseMonthId,
            memberId: updatedPaidBy as 'tanvir-rana' | 'zilam-jahid',
            amount: updatedAmount,
            reference: `Bazaar: ${desc}`,
            notes: `Auto-credited from bazaar expense (${catName})`,
            updatedAt: now,
            updatedBy: author.id,
            updatedByName: author.name,
          };
          updatedContributions = prev.contributions.map((c) => (c.id === existingCon.id ? updatedCon : c));
          linkedContributionId = existingCon.id;
        } else {
          linkedContributionId = `CON-AUTO-${Date.now().toString().slice(-6)}`;
          const newCon: Contribution = {
            id: linkedContributionId,
            date: expenseDate,
            monthId: expenseMonthId,
            memberId: updatedPaidBy as 'tanvir-rana' | 'zilam-jahid',
            amount: updatedAmount,
            paymentMethod: 'Cash',
            reference: `Bazaar: ${desc}`,
            notes: `Auto-credited from bazaar expense (${catName})`,
            createdAt: now,
            updatedAt: now,
            createdBy: author.id,
            createdByName: author.name,
            updatedBy: author.id,
            updatedByName: author.name,
            linkedExpenseId: id,
            isAutoExpense: true,
          };
          updatedContributions = [newCon, ...prev.contributions];
        }
      } else {
        if (existingCon) {
          updatedContributions = prev.contributions.filter((c) => c.id !== existingCon.id);
          linkedContributionId = undefined;
        }
      }

      const updatedExpense: Expense = {
        ...existing,
        ...updates,
        amount: updatedAmount,
        expenseType: updatedType,
        paidBy: updatedPaidBy,
        personalFor: updatedPersonalFor,
        splitRatio: updatedSplit,
        tanvirShare,
        zilamShare,
        updatedAt: now,
        updatedBy: author.id,
        updatedByName: author.name,
        linkedContributionId,
        autoContribute: shouldAutoContribute,
      };

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'UPDATE',
        entityType: 'Expense',
        entityId: id,
        description: `[${author.name}] Updated expense "${existing.description}" (SAR ${existing.amount.toFixed(2)} → SAR ${updatedAmount.toFixed(2)})`,
        previousValue: JSON.stringify(existing),
        newValue: JSON.stringify(updatedExpense),
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === id ? updatedExpense : e)),
        contributions: updatedContributions,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  // Delete Expense (cleaning up linked contribution)
  const deleteExpense = (id: string) => {
    setDb((prev) => {
      const existing = prev.expenses.find((e) => e.id === id);
      if (!existing) return prev;

      const author = getCurrentAuthor();
      const now = new Date().toISOString();
      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'DELETE',
        entityType: 'Expense',
        entityId: id,
        description: `[${author.name}] Deleted expense "${existing.description}" (Amount: SAR ${existing.amount.toFixed(2)})`,
        previousValue: JSON.stringify(existing),
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
        contributions: prev.contributions.filter(
          (c) => c.linkedExpenseId !== id && (!existing.linkedContributionId || c.id !== existing.linkedContributionId)
        ),
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  // Add Contribution
  const addContribution = (contributionData: {
    date: string;
    monthId: string;
    memberId: 'tanvir-rana' | 'zilam-jahid';
    amount: number;
    paymentMethod: 'Cash' | 'Bank' | 'Other';
    reference?: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const id = `CON-${Date.now().toString().slice(-6)}`;
    const author = getCurrentAuthor();

    const newContribution: Contribution = {
      id,
      date: contributionData.date,
      monthId: contributionData.monthId,
      memberId: contributionData.memberId,
      amount: roundCurrency(contributionData.amount),
      paymentMethod: contributionData.paymentMethod,
      reference: contributionData.reference?.trim() || '',
      notes: contributionData.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
      createdBy: author.id,
      createdByName: author.name,
      updatedBy: author.id,
      updatedByName: author.name,
    };

    const auditLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: now,
      action: 'CREATE',
      entityType: 'Contribution',
      entityId: id,
      description: `[${author.name}] Recorded deposit of SAR ${newContribution.amount.toFixed(2)} for ${
        newContribution.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'
      } (${newContribution.paymentMethod})`,
      newValue: JSON.stringify(newContribution),
      performedBy: author.id,
      performedByName: author.name,
    };

    setDb((prev) => ({
      ...prev,
      contributions: [newContribution, ...prev.contributions],
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  // Update Contribution (syncing linked expense if any)
  const updateContribution = (id: string, updates: Partial<Contribution>) => {
    setDb((prev) => {
      const existing = prev.contributions.find((c) => c.id === id);
      if (!existing) return prev;

      const author = getCurrentAuthor();
      const now = new Date().toISOString();
      const updatedAmount = updates.amount !== undefined ? roundCurrency(updates.amount) : existing.amount;
      const updatedMemberId = updates.memberId || existing.memberId;

      const updatedContribution: Contribution = {
        ...existing,
        ...updates,
        amount: updatedAmount,
        memberId: updatedMemberId,
        updatedAt: now,
        updatedBy: author.id,
        updatedByName: author.name,
      };

      let updatedExpenses = prev.expenses;
      if (existing.linkedExpenseId) {
        const linkedExp = prev.expenses.find((e) => e.id === existing.linkedExpenseId);
        if (linkedExp) {
          const { tanvirShare, zilamShare } = calculateExpenseShares(
            updatedAmount,
            linkedExp.expenseType,
            updatedMemberId,
            linkedExp.personalFor,
            linkedExp.splitRatio
          );
          updatedExpenses = prev.expenses.map((e) =>
            e.id === linkedExp.id
              ? {
                  ...e,
                  amount: updatedAmount,
                  paidBy: updatedMemberId,
                  date: updates.date || e.date,
                  monthId: updates.monthId || e.monthId,
                  tanvirShare,
                  zilamShare,
                  updatedAt: now,
                  updatedBy: author.id,
                  updatedByName: author.name,
                }
              : e
          );
        }
      }

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'UPDATE',
        entityType: 'Contribution',
        entityId: id,
        description: `[${author.name}] Updated deposit for ${existing.memberId === 'tanvir-rana' ? 'Tanvir' : 'Zilam'} (SAR ${existing.amount.toFixed(2)} → SAR ${updatedAmount.toFixed(2)})`,
        previousValue: JSON.stringify(existing),
        newValue: JSON.stringify(updatedContribution),
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        contributions: prev.contributions.map((c) => (c.id === id ? updatedContribution : c)),
        expenses: updatedExpenses,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  // Delete Contribution (disconnecting linked expense)
  const deleteContribution = (id: string) => {
    setDb((prev) => {
      const existing = prev.contributions.find((c) => c.id === id);
      if (!existing) return prev;

      const author = getCurrentAuthor();
      const now = new Date().toISOString();
      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'DELETE',
        entityType: 'Contribution',
        entityId: id,
        description: `[${author.name}] Deleted deposit of SAR ${existing.amount.toFixed(2)} from ${
          existing.memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'
        }`,
        previousValue: JSON.stringify(existing),
        performedBy: author.id,
        performedByName: author.name,
      };

      let updatedExpenses = prev.expenses;
      if (existing.linkedExpenseId) {
        updatedExpenses = prev.expenses.map((e) =>
          e.id === existing.linkedExpenseId ? { ...e, linkedContributionId: undefined, autoContribute: false } : e
        );
      }

      return {
        ...prev,
        contributions: prev.contributions.filter((c) => c.id !== id),
        expenses: updatedExpenses,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  // Sync existing bazaar expenses to contributions
  const syncBazaarExpensesToContributions = () => {
    setDb((prev) => syncExistingBazaarContributions(prev));
  };

  // Create Month
  const createMonth = (year: number, monthNumber: number): string => {
    const padMonth = monthNumber.toString().padStart(2, '0');
    const monthId = `${year}-${padMonth}`;
    const name = `${MONTH_NAMES[monthNumber - 1]} ${year}`;

    // Check if month already exists
    if (db.months.some((m) => m.id === monthId)) {
      setCurrentMonthId(monthId);
      return monthId;
    }

    // Calculate opening balances from the latest previous month's closing balances
    const sortedMonths = [...db.months].sort((a, b) => a.id.localeCompare(b.id));
    const latestMonth = sortedMonths[sortedMonths.length - 1];
    let openingTanvir = 0;
    let openingZilam = 0;

    if (latestMonth) {
      const prevSettlement = calculateMonthlySettlement(latestMonth, db.expenses, db.contributions);
      openingTanvir = prevSettlement.tanvirStats.currentAccountBalance;
      openingZilam = prevSettlement.zilamStats.currentAccountBalance;
    }

    const newMonth: MessMonth = {
      id: monthId,
      name,
      year,
      monthNumber,
      status: 'active',
      finalizedAt: null,
      openingBalance: {
        'tanvir-rana': roundCurrency(openingTanvir),
        'zilam-jahid': roundCurrency(openingZilam),
      },
    };

    const now = new Date().toISOString();
    const author = getCurrentAuthor();
    const auditLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: now,
      action: 'CREATE',
      entityType: 'Month',
      entityId: monthId,
      description: `[${author.name}] Created new mess billing month "${name}"`,
      performedBy: author.id,
      performedByName: author.name,
    };

    setDb((prev) => ({
      ...prev,
      months: [...prev.months, newMonth].sort((a, b) => a.id.localeCompare(b.id)),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    setCurrentMonthId(monthId);
    return monthId;
  };

  // Finalize Month
  const finalizeMonth = (monthId: string) => {
    setDb((prev) => {
      const month = prev.months.find((m) => m.id === monthId);
      if (!month) return prev;

      const author = getCurrentAuthor();
      const now = new Date().toISOString();
      const updatedMonths = prev.months.map((m) =>
        m.id === monthId ? { ...m, status: 'finalized' as const, finalizedAt: now } : m
      );

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'FINALIZE',
        entityType: 'Month',
        entityId: monthId,
        description: `[${author.name}] Finalized and locked month "${month.name}" with confirmed settlement calculations.`,
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        months: updatedMonths,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  // Reopen Month
  const reopenMonth = (monthId: string) => {
    setDb((prev) => {
      const month = prev.months.find((m) => m.id === monthId);
      if (!month) return prev;

      const author = getCurrentAuthor();
      const now = new Date().toISOString();
      const updatedMonths = prev.months.map((m) =>
        m.id === monthId ? { ...m, status: 'active' as const, finalizedAt: null } : m
      );

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'REOPEN',
        entityType: 'Month',
        entityId: monthId,
        description: `[${author.name}] Reopened month "${month.name}" for transaction adjustments.`,
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        months: updatedMonths,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  // Delete Month
  const deleteMonth = (monthId: string): boolean => {
    if (db.months.length <= 1) {
      return false;
    }
    const monthToDelete = db.months.find((m) => m.id === monthId);
    if (!monthToDelete) return false;

    const author = getCurrentAuthor();
    const now = new Date().toISOString();

    setDb((prev) => {
      const remainingMonths = prev.months.filter((m) => m.id !== monthId);
      const remainingExpenses = prev.expenses.filter((e) => e.monthId !== monthId);
      const remainingContributions = prev.contributions.filter((c) => c.monthId !== monthId);

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'DELETE',
        entityType: 'Month',
        entityId: monthId,
        description: `[${author.name}] Deleted month "${monthToDelete.name}" (${monthId}) from history.`,
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        months: remainingMonths,
        expenses: remainingExpenses,
        contributions: remainingContributions,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });

    if (currentMonthId === monthId) {
      const remaining = db.months.filter((m) => m.id !== monthId);
      if (remaining.length > 0) {
        setCurrentMonthId(remaining[remaining.length - 1].id);
      }
    }

    return true;
  };

  // Categories CRUD
  const addCategory = (categoryOrName: string | (Omit<Category, 'id'> & { id?: string })) => {
    let name = '';
    let description: string | undefined = undefined;
    let customId: string | undefined = undefined;
    let isDefault = false;

    if (typeof categoryOrName === 'string') {
      name = categoryOrName;
    } else if (categoryOrName && typeof categoryOrName === 'object') {
      name = categoryOrName.name || '';
      description = categoryOrName.description;
      customId = categoryOrName.id;
      isDefault = !!categoryOrName.isDefault;
    }

    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) return;

    const id =
      customId && customId.trim()
        ? customId.trim()
        : `cat-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newCat: Category = {
      id,
      name: trimmed,
      description: description?.trim() || undefined,
      isDefault,
    };

    setDb((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));
  };

  const updateCategory = (id: string, categoryOrName: string | Partial<Category>) => {
    let name: string | undefined = undefined;
    let description: string | undefined = undefined;

    if (typeof categoryOrName === 'string') {
      name = categoryOrName;
    } else if (categoryOrName && typeof categoryOrName === 'object') {
      name = categoryOrName.name;
      description = categoryOrName.description;
    }

    const trimmed = typeof name === 'string' ? name.trim() : undefined;
    if (trimmed !== undefined && !trimmed) return;

    setDb((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          name: trimmed !== undefined ? trimmed : c.name,
          description:
            description !== undefined ? (description.trim() || undefined) : c.description,
        };
      }),
    }));
  };

  const deleteCategory = (id: string, reassignToCategoryId?: string): boolean => {
    if (db.categories.length <= 1) {
      return false;
    }

    const linkedExpenses = db.expenses.filter((e) => e.categoryId === id);
    if (linkedExpenses.length > 0) {
      if (!reassignToCategoryId || reassignToCategoryId === id) {
        return false;
      }
      setDb((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.categoryId === id ? { ...e, categoryId: reassignToCategoryId } : e
        ),
        categories: prev.categories.filter((c) => c.id !== id),
      }));
      return true;
    }

    setDb((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
    return true;
  };

  // Backup & Reset
  const exportBackup = () => {
    return exportDatabaseJSON(db);
  };

  const restoreBackup = (jsonString: string): boolean => {
    try {
      const imported = importDatabaseJSON(jsonString);
      setDb(imported);
      if (imported.months.length > 0) {
        setCurrentMonthId(imported.months[imported.months.length - 1].id);
      }
      return true;
    } catch (err) {
      console.error('Restore error', err);
      return false;
    }
  };

  const resetToSampleData = () => {
    const initial = getInitialDatabase();
    setDb(initial);
    setCurrentMonthId('2026-09');
  };

  const clearAllData = () => {
    const emptyDb: AppDatabase = {
      ...getInitialDatabase(),
      expenses: [],
      contributions: [],
      auditLogs: [
        {
          id: `LOG-${Date.now().toString().slice(-6)}`,
          timestamp: new Date().toISOString(),
          action: 'CLEAR',
          entityType: 'System',
          entityId: 'DATABASE',
          description: 'All expense and contribution records were cleared.',
        },
      ],
    };
    setDb(emptyDb);
  };

  const updateAppSettings = (updates: Partial<AppSettings>) => {
    const author = getCurrentAuthor();
    const now = new Date().toISOString();
    setDb((prev) => {
      const currentSettings = prev.settings || DEFAULT_APP_SETTINGS;
      const newSettings: AppSettings = {
        ...currentSettings,
        ...updates,
        auth: {
          ...currentSettings.auth,
          ...(updates.auth || {}),
        },
      };

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'UPDATE',
        entityType: 'System',
        entityId: 'SETTINGS',
        description: `[${author.name}] Updated mess settings and details (App Name: "${newSettings.appName}")`,
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        settings: newSettings,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  const updateAuthSettings = (updates: Partial<AuthSettings>) => {
    const author = getCurrentAuthor();
    const now = new Date().toISOString();
    setDb((prev) => {
      const currentSettings = prev.settings || DEFAULT_APP_SETTINGS;
      const newAuth: AuthSettings = {
        ...currentSettings.auth,
        ...updates,
      };
      const newSettings: AppSettings = {
        ...currentSettings,
        auth: newAuth,
      };

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'UPDATE',
        entityType: 'System',
        entityId: 'AUTH_SETTINGS',
        description: `[${author.name}] Updated login system settings`,
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        settings: newSettings,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  const updateAuthPreferences = (prefs: { enabled?: boolean; requirePin?: boolean }) => {
    const author = getCurrentAuthor();
    const now = new Date().toISOString();
    setDb((prev) => {
      const currentSettings = prev.settings || DEFAULT_APP_SETTINGS;
      const newAuth: AuthSettings = {
        ...currentSettings.auth,
        ...(prefs.enabled !== undefined ? { enabled: prefs.enabled } : {}),
        ...(prefs.requirePin !== undefined ? { requirePin: prefs.requirePin } : {}),
      };
      const newSettings: AppSettings = {
        ...currentSettings,
        auth: newAuth,
      };

      const desc = prefs.enabled !== undefined
        ? `[${author.name}] ${prefs.enabled ? 'Enabled' : 'Disabled'} Member Login System`
        : `[${author.name}] Set 4-digit PIN security to ${prefs.requirePin ? 'Required' : 'Optional'}`;

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'UPDATE',
        entityType: 'System',
        entityId: 'AUTH_SETTINGS',
        description: desc,
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        settings: newSettings,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  const changeMemberPin = (
    memberId: 'tanvir-rana' | 'zilam-jahid',
    currentPin: string,
    newPin: string
  ): { success: boolean; error?: string } => {
    // Access control: User can ONLY change their own PIN!
    if (currentUser !== memberId) {
      const activeName = currentUser === 'tanvir-rana' ? 'Tanvir Rana' : currentUser === 'zilam-jahid' ? 'Zilam Jahid' : 'Guest';
      const targetName = memberId === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid';
      return {
        success: false,
        error: `Permission Denied: You are currently logged in as ${activeName}. You cannot change ${targetName}'s PIN.`,
      };
    }

    const currentSavedPin =
      memberId === 'tanvir-rana'
        ? (appSettings.auth.tanvirPin || '1234').trim()
        : (appSettings.auth.zilamPin || '1234').trim();

    if (currentPin.trim() !== currentSavedPin) {
      return { success: false, error: 'Current PIN is incorrect.' };
    }

    if (!/^\d{4}$/.test(newPin.trim())) {
      return { success: false, error: 'New PIN must be exactly 4 numeric digits.' };
    }

    if (newPin.trim() === currentPin.trim()) {
      return { success: false, error: 'New PIN must be different from your current PIN.' };
    }

    const author = getCurrentAuthor();
    const now = new Date().toISOString();

    setDb((prev) => {
      const currentSettings = prev.settings || DEFAULT_APP_SETTINGS;
      const newAuth: AuthSettings = {
        ...currentSettings.auth,
        ...(memberId === 'tanvir-rana' ? { tanvirPin: newPin.trim() } : { zilamPin: newPin.trim() }),
      };
      const newSettings: AppSettings = {
        ...currentSettings,
        auth: newAuth,
      };

      const auditLog: AuditLog = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: now,
        action: 'UPDATE',
        entityType: 'System',
        entityId: 'AUTH_PIN',
        description: `[${author.name}] Changed personal login PIN securely`,
        performedBy: author.id,
        performedByName: author.name,
      };

      return {
        ...prev,
        settings: newSettings,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });

    return { success: true };
  };

  const loginMember = (
    memberId: 'tanvir-rana' | 'zilam-jahid',
    pin?: string
  ): { success: boolean; error?: string } => {
    if (appSettings.auth.requirePin) {
      const requiredPin =
        memberId === 'tanvir-rana'
          ? (appSettings.auth.tanvirPin || '1234').trim()
          : (appSettings.auth.zilamPin || '1234').trim();

      if (!pin || pin.trim() !== requiredPin) {
        return { success: false, error: 'Incorrect 4-digit PIN. Please try again.' };
      }
    }

    setCurrentUser(memberId);
    try {
      localStorage.setItem(SESSION_USER_KEY, memberId);
    } catch {
      // ignore
    }
    setSelectedMemberId(memberId);
    return { success: true };
  };

  const logoutMember = () => {
    setDb((prev) => {
      if (!prev.settings?.auth?.enabled) {
        return {
          ...prev,
          settings: {
            ...prev.settings,
            auth: {
              ...(prev.settings?.auth || DEFAULT_APP_SETTINGS.auth),
              enabled: true,
            },
          },
        };
      }
      return prev;
    });
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_USER_KEY);
    } catch {
      // ignore
    }
  };

  const switchMemberWithPin = (
    memberId: 'tanvir-rana' | 'zilam-jahid',
    pin: string
  ): { success: boolean; error?: string } => {
    if (appSettings.auth.requirePin) {
      const requiredPin =
        memberId === 'tanvir-rana'
          ? (appSettings.auth.tanvirPin || '1234').trim()
          : (appSettings.auth.zilamPin || '1234').trim();

      if (!pin || pin.trim() !== requiredPin) {
        return { success: false, error: 'Incorrect 4-digit PIN for this member.' };
      }
    }

    setCurrentUser(memberId);
    try {
      localStorage.setItem(SESSION_USER_KEY, memberId);
    } catch {
      // ignore
    }
    setSelectedMemberId(memberId);
    return { success: true };
  };

  const switchMember = (memberId: 'tanvir-rana' | 'zilam-jahid') => {
    if (appSettings.auth.requirePin && currentUser !== memberId) {
      // Direct unauthorized switch blocked when PIN security is on!
      // Logout to login screen so proper credentials must be provided.
      logoutMember();
      return;
    }

    setCurrentUser(memberId);
    try {
      localStorage.setItem(SESSION_USER_KEY, memberId);
    } catch {
      // ignore
    }
    setSelectedMemberId(memberId);
  };

  const continueAsGuest = () => {
    setCurrentUser('guest');
    try {
      localStorage.setItem(SESSION_USER_KEY, 'guest');
    } catch {
      // ignore
    }
  };

  return (
    <MessContext.Provider
      value={{
        db,
        currentMonthId,
        setCurrentMonthId,
        currentMonth,
        currentSettlement,
        allSettlements,
        activeTab,
        setActiveTab,
        selectedMemberId,
        setSelectedMemberId,
        addExpense,
        updateExpense,
        deleteExpense,
        addContribution,
        updateContribution,
        deleteContribution,
        syncBazaarExpensesToContributions,
        createMonth,
        finalizeMonth,
        reopenMonth,
        deleteMonth,
        addCategory,
        updateCategory,
        deleteCategory,
        exportBackup,
        restoreBackup,
        restoreFromBackup: restoreBackup,
        resetToSampleData,
        resetToDefaultData: resetToSampleData,
        clearAllData,
        appSettings,
        updateAppSettings,
        updateAuthSettings,
        updateAuthPreferences,
        changeMemberPin,
        currentUser,
        activeMember,
        loginMember,
        logoutMember,
        switchMember,
        switchMemberWithPin,
        continueAsGuest,
        isExpenseModalOpen,
        setIsExpenseModalOpen,
        editingExpense,
        setEditingExpense,
        isContributionModalOpen,
        setIsContributionModalOpen,
        editingContribution,
        setEditingContribution,
        firebaseSyncStatus,
        lastSyncedAt,
        forceSyncToFirebase,
      }}
    >
      {children}
    </MessContext.Provider>
  );
};

export const useMess = () => {
  const context = useContext(MessContext);
  if (!context) {
    throw new Error('useMess must be used within a MessProvider');
  }
  return context;
};
