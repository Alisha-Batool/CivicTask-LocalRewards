import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Coins, Store, Users } from 'lucide-react';

interface LandingHeroProps {
  onOpenAuth: () => void;
  onOpenGuide: () => void;
  onSelectTab: (tab: string) => void;
  isAuthenticated: boolean;
}

export function LandingHero({ onOpenAuth, onOpenGuide, onSelectTab, isAuthenticated }: LandingHeroProps) {
  return (
    <div className="space-y-16 py-4">
      
      {/* Hero Section Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Left Column Text */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Civic Action &amp; Local Impact</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance">
            Verified civic service meets neighborhood rewards.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
            CivicTask bridges student volunteers who complete verified community service tasks with local independent merchants offering discounts and rewards.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onSelectTab('tasks')}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 group"
            >
              <span>Explore Opportunities</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={onOpenGuide}
              className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 shadow-xs transition-colors"
            >
              How It Works
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80 text-slate-600">
            <div>
              <span className="font-bold text-slate-900 text-sm block">100% Verified</span>
              <span className="text-xs text-slate-500">Admin proof audit</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Atomic QR Tokens</span>
              <span className="text-xs text-slate-500">Zero double-spending</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Local First</span>
              <span className="text-xs text-slate-500">Supporting merchants</span>
            </div>
          </div>
        </div>

        {/* Right Column Image Banner */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-xl bg-slate-100 group">
            <img
              src="/src/assets/images/civic_hero_community_1792220538777.jpg"
              alt="Diverse students volunteering in community garden planting"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 min-h-[380px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Community Impact in Action
              </span>
              <p className="text-sm font-semibold mt-1">
                Urban tree planting &amp; food sovereignty initiative in Northside Park
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 3 Pillars / Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            1. Earn for Real Service
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pick from curated, high-need local tasks: park restoration, youth reading mentorship, food bank sorting, and watershed cleanups. Upload proof to receive points.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            2. Verified Transparency
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Administrators review submitted evidence in a real-time moderation queue. Upon approval, points are credited atomically with an immutable ledger entry.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            3. Local Reward Redemption
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Generate a short-lived single-use QR token to spend at participating neighborhood cafes, bookshops, bike workshops, and farmers markets.
          </p>
        </div>
      </div>

    </div>
  );
}
