import React, { useEffect } from 'react';
import { X, ArrowRight, Award } from 'lucide-react';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export function DemoGuideModal({ isOpen, onClose, onSelectTab }: DemoGuideModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      step: '01',
      title: 'Admin Creates Civic Task',
      actor: 'Admin',
      color: 'bg-purple-50 text-purple-900 border-purple-200',
      description: 'The administrator publishes verified volunteer initiatives (e.g., community garden planting, literacy tutoring) with clear positive integer point rewards.',
      actionLabel: 'Explore Admin Tasks',
      tabTarget: 'dashboard',
    },
    {
      step: '02',
      title: 'Student Submits Proof',
      actor: 'Student',
      color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      description: 'Students complete local community service and upload verified image proof (JPEG, PNG, WebP) or signed HTTPS coordinator links with a reflective description.',
      actionLabel: 'Browse Opportunities',
      tabTarget: 'tasks',
    },
    {
      step: '03',
      title: 'Admin Reviews & Awards Points Atomically',
      actor: 'Admin',
      color: 'bg-amber-50 text-amber-900 border-amber-200',
      description: 'Admin evaluates evidence in the real-time moderation queue. Upon approval, a Firestore atomic transaction increments student balance and writes an immutable ledger entry.',
      actionLabel: 'View Moderation Queue',
      tabTarget: 'dashboard',
    },
    {
      step: '04',
      title: 'Student Generates QR Redemption',
      actor: 'Student',
      color: 'bg-blue-50 text-blue-900 border-blue-200',
      description: 'Student selects a discount from a participating local shop. The server creates a cryptographically high-entropy, short-lived single-use code displayed as a QR token.',
      actionLabel: 'View Local Rewards',
      tabTarget: 'rewards',
    },
    {
      step: '05',
      title: 'Shopkeeper Scans & Deducts Points Atomically',
      actor: 'Merchant',
      color: 'bg-rose-50 text-rose-900 border-rose-200',
      description: 'Shopkeeper scans the QR code (or enters fallback code). Server verifies offer validity and balance, and confirms points deduction atomically with zero double-spending.',
      actionLabel: 'Open Merchant Scanner',
      tabTarget: 'dashboard',
    },
    {
      step: '06',
      title: 'Audit Ledger & Impact Record',
      actor: 'Audit & Transparency',
      color: 'bg-slate-100 text-slate-900 border-slate-200',
      description: 'Every point credit and debit is permanently registered with actor IDs and idempotency keys, giving complete civic accountability.',
      actionLabel: 'Audit Ledger',
      tabTarget: 'dashboard',
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 id="guide-modal-title" className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>CivicTask Protocol &amp; Judging Demo Guide</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              End-to-end verified civic service reward lifecycle
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
            aria-label="Close guide modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {steps.map((s) => (
            <div
              key={s.step}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white shadow-xs"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-slate-500 tabular-nums">
                    {s.step}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {s.title}
                  </h3>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${s.color}`}>
                  {s.actor}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {s.description}
              </p>
              <button
                onClick={() => {
                  onSelectTab(s.tabTarget);
                  onClose();
                }}
                className="min-h-[36px] text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 group focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 outline-none"
              >
                <span>{s.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span>Protected by Firebase Rules &amp; Atomic Transactions</span>
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
          >
            Got it, Let's Explore
          </button>
        </div>

      </div>
    </div>
  );
}
