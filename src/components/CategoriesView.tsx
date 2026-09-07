import React, { useState, useMemo } from 'react';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Receipt,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { Category } from '../types';
import { formatCurrency } from '../utils/calcEngine';

export const CategoriesView: React.FC = () => {
  const { currentMonth, db, addCategory, updateCategory, deleteCategory } = useMess();

  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [reassignTargetCatId, setReassignTargetCatId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Month-filtered expenses for category metrics
  const monthExpenses = useMemo(
    () => db.expenses.filter((e) => e.monthId === currentMonth.id),
    [db.expenses, currentMonth.id]
  );

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    const totals = new Map<string, number>();

    for (const exp of monthExpenses) {
      counts.set(exp.categoryId, (counts.get(exp.categoryId) || 0) + 1);
      totals.set(exp.categoryId, (totals.get(exp.categoryId) || 0) + exp.amount);
    }

    return { counts, totals };
  }, [monthExpenses]);

  const handleStartAdd = () => {
    setNewCatName('');
    setNewCatDesc('');
    setIsAdding(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }

    const id = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (db.categories.some((c) => c.id === id)) {
      setErrorMsg('A category with a similar name already exists.');
      return;
    }

    addCategory({
      id,
      name: newCatName.trim(),
      description: newCatDesc.trim() || undefined,
      isDefault: false,
    });

    setIsAdding(false);
    setNewCatName('');
    setNewCatDesc('');
    setErrorMsg(null);
    setSuccessMsg(`Category "${newCatName.trim()}" created successfully.`);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingName(cat.name);
    setEditingDesc(cat.description || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveEdit = (catId: string) => {
    if (!editingName.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }

    updateCategory(catId, {
      name: editingName.trim(),
      description: editingDesc.trim() || undefined,
    });

    setEditingCatId(null);
    setErrorMsg(null);
    setSuccessMsg('Category updated successfully.');
  };

  const handleStartDelete = (cat: Category) => {
    if (db.categories.length <= 1) {
      setErrorMsg('At least one category is required. You cannot delete the only remaining category.');
      return;
    }

    const others = db.categories.filter((c) => c.id !== cat.id);
    setDeletingCat(cat);
    setReassignTargetCatId(others[0]?.id || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingCat) return;

    if (db.categories.length <= 1) {
      setErrorMsg('Cannot delete category. At least one category is required.');
      setDeletingCat(null);
      return;
    }

    // Check all expenses in database that use this category
    const linkedExpenses = db.expenses.filter((e) => e.categoryId === deletingCat.id);

    if (linkedExpenses.length > 0) {
      if (!reassignTargetCatId || reassignTargetCatId === deletingCat.id) {
        setErrorMsg('Please select a target category to reassign existing transactions.');
        return;
      }

      const ok = deleteCategory(deletingCat.id, reassignTargetCatId);
      if (ok) {
        const targetName =
          db.categories.find((c) => c.id === reassignTargetCatId)?.name || 'another category';
        setSuccessMsg(
          `Category "${deletingCat.name}" was deleted. ${linkedExpenses.length} transaction(s) were reassigned to "${targetName}".`
        );
        setDeletingCat(null);
        setErrorMsg(null);
      } else {
        setErrorMsg('Could not delete category. Please try again.');
      }
    } else {
      const ok = deleteCategory(deletingCat.id);
      if (ok) {
        setSuccessMsg(`Category "${deletingCat.name}" was deleted successfully.`);
        setDeletingCat(null);
        setErrorMsg(null);
      } else {
        setErrorMsg('Could not delete category. Please try again.');
      }
    }
  };

  // Helper info for the currently deleting category
  const linkedExpensesCount = deletingCat
    ? db.expenses.filter((e) => e.categoryId === deletingCat.id).length
    : 0;
  const availableTargetCategories = deletingCat
    ? db.categories.filter((c) => c.id !== deletingCat.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Expense Categories
          </h2>
          <p className="text-xs text-slate-500">
            Manage cost categories and view spending in <span className="font-semibold text-slate-700">{currentMonth.name}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartAdd}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Category
        </button>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline Add Category Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveNew}
          className="bg-white p-3.5 rounded-xl border border-blue-300 ring-1 ring-blue-500/20 shadow-sm space-y-2.5"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              New Expense Category
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Category Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Snacks & Beverages"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief description of what belongs here"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1.5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save Category
            </button>
          </div>
        </form>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {db.categories.map((cat) => {
          const isEditing = editingCatId === cat.id;
          const count = categoryStats.counts.get(cat.id) || 0;
          const total = categoryStats.totals.get(cat.id) || 0;

          return (
            <div
              key={cat.id}
              className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editingDesc}
                      onChange={(e) => setEditingDesc(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingCatId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1 text-emerald-600 hover:text-emerald-700 rounded cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{cat.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {cat.description || 'Standard mess category'}
                        </p>
                      </div>

                      {cat.isDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 shrink-0">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          This Month
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Entries
                        </span>
                        <span className="font-semibold text-slate-700">{count} txns</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartDelete(cat)}
                      disabled={db.categories.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title={
                        db.categories.length <= 1
                          ? 'At least one category is required'
                          : 'Delete Category'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Category Modal with Reassignment Options */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-full shrink-0 ${
                  linkedExpensesCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                }`}
              >
                {linkedExpensesCount > 0 ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Category "{deletingCat.name}"?
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDeletingCat(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {linkedExpensesCount === 0 ? (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    This category currently has no associated transactions in the system. Are you sure you want to permanently delete it?
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-3">
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Category In Use ({linkedExpensesCount} transactions)
                      </p>
                      <p className="mt-1 text-amber-800">
                        There are <strong>{linkedExpensesCount}</strong> transaction(s) assigned to <strong>"{deletingCat.name}"</strong> across mess history.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Move linked transactions to:
                      </label>
                      <select
                        value={reassignTargetCatId}
                        onChange={(e) => setReassignTargetCatId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-blue-500 outline-hidden bg-white text-slate-800 font-medium"
                      >
                        {availableTargetCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Existing expenses will be automatically recategorized to preserve balance sheet integrity.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingCat(null)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {linkedExpensesCount > 0 ? 'Reassign & Delete' : 'Delete Category'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
