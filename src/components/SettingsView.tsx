import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Lock,
  Tags,
  Database,
  Save,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  LogOut,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Cloud,
} from 'lucide-react';
import { useMess } from '../context/MessContext';
import { exportDatabaseJSON } from '../utils/exportUtils';
import { CategoriesView } from './CategoriesView';

type SettingsTab = 'details' | 'login' | 'categories' | 'backup';

interface SettingsViewProps {
  initialTab?: SettingsTab;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'details' }) => {
  const {
    db,
    appSettings,
    updateAppSettings,
    updateAuthPreferences,
    changeMemberPin,
    currentUser,
    logoutMember,
    restoreFromBackup,
    firebaseSyncStatus,
    lastSyncedAt,
    forceSyncToFirebase,
  } = useMess();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync if initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form State for App Branding & Details
  const [appName, setAppName] = useState(appSettings.appName || 'MessManager');
  const [appSubtitle, setAppSubtitle] = useState(appSettings.appSubtitle || '');
  const [messAddress, setMessAddress] = useState(appSettings.messAddress || '');
  const [contactNumber, setContactNumber] = useState(appSettings.contactNumber || '');
  const [currencySymbol, setCurrencySymbol] = useState(appSettings.currencySymbol || 'SAR');
  const [notes, setNotes] = useState(appSettings.notes || '');

  // Form State for Authentication Controls (shared between both members)
  const [authEnabled, setAuthEnabled] = useState(appSettings.auth?.enabled ?? true);
  const [requirePin, setRequirePin] = useState(appSettings.auth?.requirePin ?? true);

  // Tanvir Private PIN Form
  const [tanvirCurrentPin, setTanvirCurrentPin] = useState('');
  const [tanvirNewPin, setTanvirNewPin] = useState('');
  const [tanvirConfirmPin, setTanvirConfirmPin] = useState('');
  const [showTanvirNewPin, setShowTanvirNewPin] = useState(false);

  // Zilam Private PIN Form
  const [zilamCurrentPin, setZilamCurrentPin] = useState('');
  const [zilamNewPin, setZilamNewPin] = useState('');
  const [zilamConfirmPin, setZilamConfirmPin] = useState('');
  const [showZilamNewPin, setShowZilamNewPin] = useState(false);

  // Audit filter
  const [auditAuthorFilter, setAuditAuthorFilter] = useState<'all' | 'tanvir-rana' | 'zilam-jahid'>('all');

  // Status & Feedback Messages
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File input ref for data restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save App Details
  const handleSaveAppDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setStatusMsg({ type: 'error', text: 'App name cannot be empty.' });
      return;
    }

    updateAppSettings({
      appName: appName.trim(),
      appSubtitle: appSubtitle.trim(),
      messAddress: messAddress.trim(),
      contactNumber: contactNumber.trim(),
      currencySymbol: currencySymbol.trim() || 'SAR',
      notes: notes.trim(),
    });

    setStatusMsg({
      type: 'success',
      text: `App details updated successfully! Name: "${appName.trim()}"`,
    });
  };

  // Save Shared Auth Preferences (Enable login / Require PIN)
  const handleSaveAuthPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    updateAuthPreferences({
      enabled: authEnabled,
      requirePin: requirePin,
    });
    setStatusMsg({
      type: 'success',
      text: 'Login system preferences updated successfully.',
    });
  };

  // Tanvir changes his own PIN securely
  const handleChangeTanvirPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanvirCurrentPin.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your current 4-digit PIN.' });
      return;
    }
    if (tanvirNewPin.trim() !== tanvirConfirmPin.trim()) {
      setStatusMsg({ type: 'error', text: 'New PIN and Confirmation PIN do not match.' });
      return;
    }
    const res = changeMemberPin('tanvir-rana', tanvirCurrentPin, tanvirNewPin);
    if (res.success) {
      setTanvirCurrentPin('');
      setTanvirNewPin('');
      setTanvirConfirmPin('');
      setStatusMsg({ type: 'success', text: 'Tanvir Rana: Your PIN has been updated securely.' });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update PIN.' });
    }
  };

  // Zilam changes his own PIN securely
  const handleChangeZilamPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zilamCurrentPin.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your current 4-digit PIN.' });
      return;
    }
    if (zilamNewPin.trim() !== zilamConfirmPin.trim()) {
      setStatusMsg({ type: 'error', text: 'New PIN and Confirmation PIN do not match.' });
      return;
    }
    const res = changeMemberPin('zilam-jahid', zilamCurrentPin, zilamNewPin);
    if (res.success) {
      setZilamCurrentPin('');
      setZilamNewPin('');
      setZilamConfirmPin('');
      setStatusMsg({ type: 'success', text: 'Zilam Jahid: Your PIN has been updated securely.' });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update PIN.' });
    }
  };

  // Backup & Restore handlers
  const handleDownloadBackup = () => {
    exportDatabaseJSON(db);
    setStatusMsg({ type: 'success', text: 'Database backup downloaded successfully.' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const success = restoreFromBackup(content);
      if (success) {
        setStatusMsg({ type: 'success', text: 'Database restored successfully from backup file.' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to restore database. Invalid JSON format.' });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Settings & System Control
          </h2>
          <p className="text-xs text-slate-500">
            Control login authentication, customize app branding, manage expense categories, and backup data.
          </p>
        </div>

        {/* Current Active User Session Status */}
        <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-right pl-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Active User
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {currentUser === 'tanvir-rana'
                ? 'Tanvir Rana'
                : currentUser === 'zilam-jahid'
                ? 'Zilam Jahid'
                : 'Guest / Viewer'}
            </span>
          </div>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              currentUser === 'tanvir-rana'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : currentUser === 'zilam-jahid'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {currentUser === 'tanvir-rana' ? 'TR' : currentUser === 'zilam-jahid' ? 'ZJ' : 'G'}
          </div>
          {currentUser && (
            <button
              type="button"
              onClick={logoutMember}
              title="Log Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2.5 border transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-2xs gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'details'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>App Name & Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('login')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'login'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Tanvir & Zilam Login</span>
          {authEnabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Expense Categories</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-mono">
            {db.categories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data, Backup & Audit</span>
        </button>
      </div>

      {/* TAB 1: APP NAME & DETAILS */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="mb-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Customize App Name & Mess Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These details are displayed on the top header, sidebar, login screen, and in all printable financial reports.
              </p>
            </div>

            <form onSubmit={handleSaveAppDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    App / Mess Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g., Tanvir & Zilam Mess, MessManager"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Appears on the main page header and browser tab title.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={appSubtitle}
                    onChange={(e) => setAppSubtitle(e.target.value)}
                    placeholder="e.g., Monthly Mess Cost & Settlement"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Secondary description under the main title.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Mess Address / Room Details
                  </label>
                  <input
                    type="text"
                    value={messAddress}
                    onChange={(e) => setMessAddress(e.target.value)}
                    placeholder="e.g., Flat 4B, Building 12, Riyadh, KSA"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    placeholder="SAR, BDT, USD"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Contact Phone / Reference
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g., +966 50 000 0000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Mess Notes & Guidelines
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Monthly contribution to be paid by 5th of every month. Bazaar expenses recorded with receipts."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save App Details</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-blue-400 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Live Brand Preview
              </div>

              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {appName || 'MessManager'}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {appSubtitle || 'Monthly Mess Cost & Settlement'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-750/70 text-[11px] space-y-1.5 text-slate-300 font-mono">
                  {messAddress && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{messAddress}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Currency: <strong className="text-slate-200">{currencySymbol}</strong></span>
                    <span>Members: <strong className="text-slate-200">2 (TR & ZJ)</strong></span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                Changes saved here will automatically update the browser window title, sidebar header, printed PDF statements, and Excel exports.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TANVIR & ZILAM LOGIN SYSTEM */}
      {activeTab === 'login' && (
        <div className="space-y-6">
          {/* Master Controls Form */}
          <form onSubmit={handleSaveAuthPreferences} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Member Login System & Access Controls
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Both Tanvir Rana and Zilam Jahid have full permission to configure login requirements and general mess settings.
                </p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Login Preferences</span>
              </button>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Enable Login Screen */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Enable Member Login Screen
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When enabled, users will see the login screen to choose their profile (Tanvir Rana or Zilam Jahid) before entering the ledger.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={authEnabled}
                    onChange={(e) => setAuthEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Require PIN / Password */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Require 4-Digit PIN for Login
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    If enabled, each member must enter their private 4-digit PIN code. If disabled, members can switch with 1 click.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={requirePin}
                    onChange={(e) => setRequirePin(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </form>

          {/* Privacy Notice Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-amber-900">
                Strict Credential Privacy & Isolation Enforced
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                As per privacy policy, neither member can view or modify the other member&apos;s PIN. Each member can only change their own PIN while logged into their personal session.
              </p>
            </div>
          </div>

          {/* Individual Member PIN Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tanvir Rana Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-sm">
                    TR
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Tanvir Rana</h4>
                    <p className="text-[11px] text-slate-500">Mess Member 1 (50% Shared Ratio)</p>
                  </div>
                </div>
                {currentUser === 'tanvir-rana' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Active Session
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Protected Account
                  </span>
                )}
              </div>

              {currentUser === 'tanvir-rana' ? (
                /* Self-service PIN change for Tanvir */
                <form onSubmit={handleChangeTanvirPin} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Change My 4-Digit PIN
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Authenticated as Tanvir
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Current PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={tanvirCurrentPin}
                      onChange={(e) => setTanvirCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center tracking-widest text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        New PIN (4 Digits)
                      </label>
                      <input
                        type={showTanvirNewPin ? 'text' : 'password'}
                        maxLength={4}
                        required
                        value={tanvirNewPin}
                        onChange={(e) => setTanvirNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center tracking-widest text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Confirm New PIN
                      </label>
                      <input
                        type={showTanvirNewPin ? 'text' : 'password'}
                        maxLength={4}
                        required
                        value={tanvirConfirmPin}
                        onChange={(e) => setTanvirConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center tracking-widest text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTanvirNewPin(!showTanvirNewPin)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showTanvirNewPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showTanvirNewPin ? 'Hide PIN' : 'Reveal PIN'}</span>
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                    >
                      Update My PIN
                    </button>
                  </div>
                </form>
              ) : (
                /* Locked view for Zilam or Guest */
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-800">
                    Confidential Credentials
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Tanvir Rana&apos;s PIN is strictly private. {currentUser === 'zilam-jahid' ? 'Zilam Jahid' : 'Other users'} cannot view or edit Tanvir&apos;s credentials.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={logoutMember}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Log in as Tanvir to change his PIN
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Zilam Jahid Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center font-bold text-sm">
                    ZJ
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Zilam Jahid</h4>
                    <p className="text-[11px] text-slate-500">Mess Member 2 (50% Shared Ratio)</p>
                  </div>
                </div>
                {currentUser === 'zilam-jahid' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    Active Session
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Protected Account
                  </span>
                )}
              </div>

              {currentUser === 'zilam-jahid' ? (
                /* Self-service PIN change for Zilam */
                <form onSubmit={handleChangeZilamPin} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Change My 4-Digit PIN
                    </span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Authenticated as Zilam
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Current PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={zilamCurrentPin}
                      onChange={(e) => setZilamCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center tracking-widest text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        New PIN (4 Digits)
                      </label>
                      <input
                        type={showZilamNewPin ? 'text' : 'password'}
                        maxLength={4}
                        required
                        value={zilamNewPin}
                        onChange={(e) => setZilamNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center tracking-widest text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Confirm New PIN
                      </label>
                      <input
                        type={showZilamNewPin ? 'text' : 'password'}
                        maxLength={4}
                        required
                        value={zilamConfirmPin}
                        onChange={(e) => setZilamConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center tracking-widest text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowZilamNewPin(!showZilamNewPin)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showZilamNewPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showZilamNewPin ? 'Hide PIN' : 'Reveal PIN'}</span>
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                    >
                      Update My PIN
                    </button>
                  </div>
                </form>
              ) : (
                /* Locked view for Tanvir or Guest */
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-800">
                    Confidential Credentials
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Zilam Jahid&apos;s PIN is strictly private. {currentUser === 'tanvir-rana' ? 'Tanvir Rana' : 'Other users'} cannot view or edit Zilam&apos;s credentials.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={logoutMember}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 underline cursor-pointer"
                    >
                      Log in as Zilam to change his PIN
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Session Actions */}
          <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              <span>Ready to switch accounts or lock session?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={logoutMember}
                className="px-4 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold cursor-pointer transition-colors"
              >
                Log Out Current Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES MANAGEMENT (EMBEDDED) */}
      {activeTab === 'categories' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tags className="w-5 h-5 text-blue-600" />
              Manage Expense Categories
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, rename, customize, and safely delete categories with expense reassignment.
            </p>
          </div>
          <CategoriesView />
        </div>
      )}

      {/* TAB 4: DATA, BACKUP & AUDIT */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Firebase Cloud Connection Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Firebase Firestore Cloud Database</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        firebaseSyncStatus === 'connected'
                          ? 'bg-emerald-100 text-emerald-800'
                          : firebaseSyncStatus === 'syncing'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          firebaseSyncStatus === 'connected'
                            ? 'bg-emerald-500'
                            : firebaseSyncStatus === 'syncing'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-rose-500'
                        }`}
                      />
                      {firebaseSyncStatus === 'connected'
                        ? 'Live Connected'
                        : firebaseSyncStatus === 'syncing'
                        ? 'Syncing...'
                        : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    All expenses, member deposits, monthly settlements, categories, and settings are saved in real time to your Google Firebase Cloud Firestore.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Firebase Project: <code className="text-slate-600 font-mono">still-filament-cmln4</code>
                    {lastSyncedAt && <span> • Last synced: {lastSyncedAt}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await forceSyncToFirebase();
                      setStatusMsg({ type: 'success', text: 'All data successfully synced to Firebase Cloud!' });
                    } catch {
                      setStatusMsg({ type: 'error', text: 'Failed to sync to Firebase. Please check connection.' });
                    }
                  }}
                  disabled={firebaseSyncStatus === 'syncing'}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${firebaseSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>{firebaseSyncStatus === 'syncing' ? 'Syncing...' : 'Sync Cloud Now'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Backup & Restore Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Backup Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Export Complete Backup</h3>
                  <p className="text-xs text-slate-500">
                    Download all expenses, contributions, months, and categories as a single JSON file.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup File (.json)</span>
                </button>
              </div>
            </div>

            {/* Restore Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Restore from Backup</h3>
                  <p className="text-xs text-slate-500">
                    Upload a previously exported backup file to restore database contents.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Select JSON File to Restore</span>
                </button>
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Audit Trail & Change History ({db.auditLogs.length})
                </h3>
              </div>

              {/* Author Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuditAuthorFilter('all')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    auditAuthorFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({db.auditLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditAuthorFilter('tanvir-rana')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                    auditAuthorFilter === 'tanvir-rana'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Tanvir Rana
                </button>
                <button
                  type="button"
                  onClick={() => setAuditAuthorFilter('zilam-jahid')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                    auditAuthorFilter === 'zilam-jahid'
                      ? 'bg-white text-blue-800 shadow-xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Zilam Jahid
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-3">Updated By</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {db.auditLogs
                    .filter((log) => {
                      if (auditAuthorFilter === 'all') return true;
                      if (log.performedBy) {
                        return log.performedBy === auditAuthorFilter;
                      }
                      // Fallback check against description text
                      const desc = log.description.toLowerCase();
                      if (auditAuthorFilter === 'tanvir-rana') {
                        return desc.includes('tanvir') || desc.includes('tr');
                      }
                      if (auditAuthorFilter === 'zilam-jahid') {
                        return desc.includes('zilam') || desc.includes('zj');
                      }
                      return false;
                    })
                    .slice(0, 100)
                    .map((log) => {
                      const isTanvir =
                        log.performedBy === 'tanvir-rana' ||
                        (!log.performedBy && log.description.toLowerCase().includes('tanvir'));
                      const isZilam =
                        log.performedBy === 'zilam-jahid' ||
                        (!log.performedBy && log.description.toLowerCase().includes('zilam'));

                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2 px-4 text-slate-500 whitespace-nowrap font-mono text-[10px]">
                            {log.timestamp.replace('T', ' ').slice(0, 19)}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {isTanvir ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Tanvir Rana
                              </span>
                            ) : isZilam ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Zilam Jahid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                System / Shared
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.action.includes('CREATE') || log.action.includes('ADD')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.action.includes('UPDATE')
                                  ? 'bg-blue-100 text-blue-800'
                                  : log.action.includes('DELETE') || log.action.includes('CLEAR')
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 uppercase text-[10px] font-mono">
                            {log.entityType || 'System'}
                          </td>
                          <td className="py-2 px-4 text-slate-700 font-sans text-xs">
                            {log.description}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
