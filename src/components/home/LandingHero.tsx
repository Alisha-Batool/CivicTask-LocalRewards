import React, { useState } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Coins, Store, Users, MapPin } from 'lucide-react';

interface LandingHeroProps {
  onOpenAuth: () => void;
  onOpenGuide: () => void;
  onSelectTab: (tab: string) => void;
  isAuthenticated: boolean;
}

export function LandingHero({ onOpenAuth, onOpenGuide, onSelectTab, isAuthenticated }: LandingHeroProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="space-y-16 py-4">
      
      {/* Hero Section Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        
        {/* Left Column Text */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Unboxed natural kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Civic Action &amp; Neighborhood Rewards</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance">
              Verified civic service meets neighborhood rewards.
            </h1>

            <p className="text-base sm:text-lg text-slate-700 leading-relaxed max-w-xl">
              CivicTask bridges student volunteers who complete verified community service tasks with local independent merchants offering discounts and rewards.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onSelectTab('tasks')}
                className="min-h-[44px] px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              >
                <span>Explore Opportunities</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={onOpenGuide}
                className="min-h-[44px] px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
              >
                How It Works
              </button>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-slate-700">
            <div>
              <span className="font-bold text-slate-900 text-sm block">100% Verified</span>
              <span className="text-xs text-slate-600">Admin proof audit</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Atomic Tokens</span>
              <span className="text-xs text-slate-600">Zero double-spending</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Local First</span>
              <span className="text-xs text-slate-600">Supporting merchants</span>
            </div>
          </div>
        </div>

        {/* Right Column Image Banner with zero-broken-image fallback container */}
        <div className="lg:col-span-5 flex">
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 group flex flex-col justify-end min-h-[340px] sm:min-h-[400px]">
            {!imageError ? (
              <img
                src="/src/assets/images/civic_hero_community_1792220538777.jpg"
                alt="Diverse students volunteering in community garden planting"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <Sparkles className="w-12 h-12 text-emerald-400 mb-3" />
                <h3 className="text-lg font-bold text-white">Community Volunteers</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">Building stronger neighborhoods through verified service</p>
              </div>
            )}
            
            {/* Measured Scrim for WCAG AA text contrast */}
            <div className="relative z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-6 text-white space-y-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 block">
                Community Impact in Action
              </span>
              <p className="text-sm font-semibold text-slate-100">
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
