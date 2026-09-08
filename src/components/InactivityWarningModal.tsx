import React from 'react';
import { Clock, ShieldAlert, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { useMess } from '../context/MessContext';

export const InactivityWarningModal: React.FC = () => {
  const { inactivityRemainingSeconds, resetInactivityTimer, logoutMember } = useMess();

  if (inactivityRemainingSeconds === null || inactivityRemainingSeconds <= 0) {
    return null;
  }

  // Format mm:ss
  const minutes = Math.floor(inactivityRemainingSeconds / 60);
  const seconds = inactivityRemainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onMouseMove={resetInactivityTimer}
      onTouchStart={resetInactivityTimer}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-amber-300 text-slate-800 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-400 to-amber-400 animate-pulse" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock className="w-6 h-6 animate-spin-slow" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Inactivity Warning • সতর্কতা
              </span>
              <span className="font-mono font-black text-rose-600 text-lg">
                {formattedTime}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mt-1.5">
              অটো লগআউট সতর্কবার্তা
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              বিগত ৯ মিনিট ধরে কোনো কার্যক্রম লক্ষ্য করা যায়নি। অ্যাকাউন্টের সুরক্ষার্থে আর{' '}
              <strong className="text-rose-600 font-bold">{inactivityRemainingSeconds} সেকেন্ডের</strong>{' '}
              মধ্যে স্বয়ংক্রিয়ভাবে লগআউট হয়ে যাবে।
            </p>
            <p className="text-[11px] text-slate-500 mt-1 italic">
              মাউস নাড়ালে, স্ক্রিনে টাচ করলে বা নিচের বাটনে ক্লিক করলে সেশন চলমান থাকবে।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={logoutMember}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 order-2 sm:order-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>এখনই লগআউট করুন</span>
          </button>

          <button
            type="button"
            onClick={resetInactivityTimer}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>লগইন বজায় রাখুন (Stay Logged In)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
