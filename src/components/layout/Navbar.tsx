import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Sparkles, Coins, LogOut, User as UserIcon, ShieldAlert, Store, GraduationCap } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenGuide: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export function Navbar({ onOpenAuth, onOpenGuide, currentTab, onSelectTab }: NavbarProps) {
  const { user, profile, role, pointsBalance, signOutUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                CT
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-none">
                  CivicTask
                </span>
                <span className="text-xs text-slate-500 font-medium">Small actions. Real impact.</span>
              </div>
            </button>
          </div>

          {/* Zone 2: 4–5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => onSelectTab('tasks')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'tasks' ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600' : ''
              }`}
            >
              Opportunities
            </button>
            <button
              onClick={() => onSelectTab('rewards')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'rewards' ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600' : ''
              }`}
            >
              Local Rewards
            </button>
            {user && (
              <button
                onClick={() => onSelectTab('dashboard')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
                  currentTab === 'dashboard' ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600' : ''
                }`}
              >
                {role === 'admin' ? 'Admin Portal' : role === 'shopkeeper' ? 'Merchant Portal' : 'Student Hub'}
              </button>
            )}
            <button
              onClick={onOpenGuide}
              className="text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>How It Works</span>
            </button>
          </nav>

          {/* Zone 3: 1 primary action or user lockup */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Live Points Counter */}
                <div 
                  onClick={() => onSelectTab('dashboard')}
                  className="cursor-pointer flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums"
                  title="Your current verified points balance"
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{pointsBalance.toLocaleString()} pts</span>
                </div>

                {/* Role badge */}
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {role === 'admin' ? (
                    <>
                      <ShieldAlert className="w-3 h-3 text-purple-600" />
                      <span>Admin</span>
                    </>
                  ) : role === 'shopkeeper' ? (
                    <>
                      <Store className="w-3 h-3 text-blue-600" />
                      <span>Merchant</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-3 h-3 text-emerald-600" />
                      <span>Student</span>
                    </>
                  )}
                </span>

                {/* User Name & Sign Out */}
                <div className="flex items-center gap-2">
                  <span className="hidden lg:inline text-xs font-medium text-slate-700 max-w-[120px] truncate">
                    {profile?.name || user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={signOutUser}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
