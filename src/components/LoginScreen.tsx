import React, { useState } from 'react';
import { Building2, ShieldCheck, KeyRound, ArrowRight, UserCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useMess } from '../context/MessContext';

export const LoginScreen: React.FC = () => {
  const { appSettings, loginMember, continueAsGuest } = useMess();

  const [selectedMember, setSelectedMember] = useState<'tanvir-rana' | 'zilam-jahid' | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requirePin = appSettings.auth.requirePin;

  const handleMemberSelect = (memberId: 'tanvir-rana' | 'zilam-jahid') => {
    setSelectedMember(memberId);
    setPin('');
    setErrorMessage(null);

    // If PIN is not required, log in immediately
    if (!requirePin) {
      loginMember(memberId);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const result = loginMember(selectedMember, pin);
    if (!result.success) {
      setErrorMessage(result.error || 'Invalid PIN code');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Background subtle styling */}
      <div className="w-full max-w-md mx-auto">
        {/* App Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4 ring-4 ring-slate-800">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {appSettings.appName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
            {appSettings.appSubtitle || 'Monthly Mess Cost & Settlement Management'}
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
          {!selectedMember || !requirePin ? (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                    Select Member Login
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose who is accessing the mess account
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-700/60 text-slate-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Profile Selection Cards */}
              <div className="space-y-3.5">
                {/* Tanvir Rana */}
                <button
                  type="button"
                  onClick={() => handleMemberSelect('tanvir-rana')}
                  className="w-full p-4 rounded-xl bg-slate-850 hover:bg-slate-700/70 border border-slate-700 hover:border-emerald-500/60 flex items-center justify-between transition-all group cursor-pointer text-left shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                      TR
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100 text-sm group-hover:text-emerald-300 transition-colors">
                        Tanvir Rana
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Mess Member 1 • 50% Ledger
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-emerald-400 font-medium">
                    <span>{requirePin ? 'Enter PIN' : 'Log In'}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>

                {/* Zilam Jahid */}
                <button
                  type="button"
                  onClick={() => handleMemberSelect('zilam-jahid')}
                  className="w-full p-4 rounded-xl bg-slate-850 hover:bg-slate-700/70 border border-slate-700 hover:border-blue-500/60 flex items-center justify-between transition-all group cursor-pointer text-left shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                      ZJ
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100 text-sm group-hover:text-blue-300 transition-colors">
                        Zilam Jahid
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Mess Member 2 • 50% Ledger
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-blue-400 font-medium">
                    <span>{requirePin ? 'Enter PIN' : 'Log In'}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              </div>

              {/* Guest / Bypass Option */}
              <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Continue in View-Only Mode
                </button>
                <span className="text-[11px] text-slate-500">
                  Settings customizable anytime
                </span>
              </div>
            </div>
          ) : (
            /* PIN Entry View */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      selectedMember === 'tanvir-rana'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    }`}
                  >
                    {selectedMember === 'tanvir-rana' ? 'TR' : 'ZJ'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedMember === 'tanvir-rana' ? 'Tanvir Rana' : 'Zilam Jahid'}
                    </h3>
                    <p className="text-[11px] text-slate-400">Enter your 4-digit PIN</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setPin('');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Change Member
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter Your Private 4-Digit PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    autoFocus
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPin(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest text-white placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span className="text-slate-400">🔒 Confidential credential</span>
                  <span className="text-slate-500">Only accessible by this member</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    selectedMember === 'tanvir-rana'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Authenticate & Enter Mess Ledger</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <p>Controlled via Settings: Customize App Name, PIN codes & login requirements.</p>
        </div>
      </div>
    </div>
  );
};
