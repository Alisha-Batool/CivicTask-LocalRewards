import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRouter } from '../../context/RouterContext.tsx';
import { 
  Sparkles, 
  Coins, 
  LogOut, 
  ShieldAlert, 
  Store, 
  GraduationCap, 
  Menu, 
  X, 
  ChevronRight,
  QrCode,
  FileCheck2,
  ScrollText,
  Building2,
  Tag
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenGuide: () => void;
}

export function Navbar({ onOpenAuth, onOpenGuide }: NavbarProps) {
  const { user, profile, role, pointsBalance, signOutUser } = useAuth();
  const { path, navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (to: string) => {
    navigate(to);
    setMobileMenuOpen(false);
  };

  const isActive = (route: string) => {
    if (route === '/') return path === '/';
    return path.startsWith(route);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 md:gap-8 h-16">
          
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => handleNavigate(
                !user ? '/' : role === 'admin' ? '/admin/dashboard' : role === 'shopkeeper' ? '/merchant/dashboard' : '/student/dashboard'
              )}
              className="flex items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg outline-none"
              aria-label="CivicTask Home"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-xs">
                CT
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
                CivicTask
              </span>
            </button>
          </div>

          {/* Zone 2: Role-Specific Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Main Navigation">
            
            {/* Student Navigation (or unauthenticated visitor) */}
            {(!user || role === 'student') && (
              <>
                <button
                  onClick={() => handleNavigate('/student/discover')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-emerald-600 rounded outline-none ${
                    isActive('/student/discover') ? 'text-emerald-800 font-semibold border-b-2 border-emerald-700' : ''
                  }`}
                >
                  Opportunities
                </button>
                <button
                  onClick={() => handleNavigate('/student/offers')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-emerald-600 rounded outline-none ${
                    isActive('/student/offers') ? 'text-emerald-800 font-semibold border-b-2 border-emerald-700' : ''
                  }`}
                >
                  Local Rewards
                </button>
                {user && (
                  <button
                    onClick={() => handleNavigate('/student/dashboard')}
                    className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-emerald-600 rounded outline-none ${
                      path === '/student/dashboard' ? 'text-emerald-800 font-semibold border-b-2 border-emerald-700' : ''
                    }`}
                  >
                    Student Hub
                  </button>
                )}
              </>
            )}

            {/* Merchant Navigation */}
            {user && role === 'shopkeeper' && (
              <>
                <button
                  onClick={() => handleNavigate('/merchant/dashboard')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-blue-600 rounded outline-none ${
                    path === '/merchant/dashboard' ? 'text-blue-800 font-semibold border-b-2 border-blue-700' : ''
                  }`}
                >
                  Merchant Dashboard
                </button>
                <button
                  onClick={() => handleNavigate('/merchant/redeem')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 rounded outline-none ${
                    isActive('/merchant/redeem') || isActive('/merchant/scan') ? 'text-blue-800 font-semibold border-b-2 border-blue-700' : ''
                  }`}
                >
                  <QrCode className="w-4 h-4 text-blue-700" />
                  <span>POS Scanner</span>
                </button>
                <button
                  onClick={() => handleNavigate('/merchant/offers')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-blue-600 rounded outline-none ${
                    isActive('/merchant/offers') ? 'text-blue-800 font-semibold border-b-2 border-blue-700' : ''
                  }`}
                >
                  Manage Offers
                </button>
                <button
                  onClick={() => handleNavigate('/merchant/history')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-blue-600 rounded outline-none ${
                    isActive('/merchant/history') ? 'text-blue-800 font-semibold border-b-2 border-blue-700' : ''
                  }`}
                >
                  Redemption History
                </button>
              </>
            )}

            {/* Admin Navigation */}
            {user && role === 'admin' && (
              <>
                <button
                  onClick={() => handleNavigate('/admin/dashboard')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-purple-600 rounded outline-none ${
                    path === '/admin/dashboard' ? 'text-purple-800 font-semibold border-b-2 border-purple-700' : ''
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => handleNavigate('/admin/tasks')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-purple-600 rounded outline-none ${
                    isActive('/admin/tasks') ? 'text-purple-800 font-semibold border-b-2 border-purple-700' : ''
                  }`}
                >
                  Task Management
                </button>
                <button
                  onClick={() => handleNavigate('/admin/reviews')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-purple-600 rounded outline-none ${
                    isActive('/admin/reviews') ? 'text-purple-800 font-semibold border-b-2 border-purple-700' : ''
                  }`}
                >
                  <FileCheck2 className="w-4 h-4 text-purple-700" />
                  <span>Submission Reviews</span>
                </button>
                <button
                  onClick={() => handleNavigate('/admin/audit')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 focus-visible:ring-2 focus-visible:ring-purple-600 rounded outline-none ${
                    isActive('/admin/audit') ? 'text-purple-800 font-semibold border-b-2 border-purple-700' : ''
                  }`}
                >
                  Audit Logs
                </button>
              </>
            )}

            <button
              onClick={onOpenGuide}
              className="text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600 rounded outline-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>How It Works</span>
            </button>
          </nav>

          {/* Zone 3: User Lockup or Sign In */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Live Points Counter (Students Only) */}
                {role === 'student' && (
                  <button
                    type="button"
                    onClick={() => handleNavigate('/student/rewards')}
                    className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                    title="Your verified student points balance"
                    aria-label={`Current points balance: ${pointsBalance.toLocaleString()} points`}
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{pointsBalance.toLocaleString()} pts</span>
                  </button>
                )}

                {/* Role indicator badge */}
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border">
                  {role === 'admin' ? (
                    <span className="flex items-center gap-1 text-purple-800 bg-purple-50 border-purple-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
                      <span>Admin</span>
                    </span>
                  ) : role === 'shopkeeper' ? (
                    <span className="flex items-center gap-1 text-blue-800 bg-blue-50 border-blue-200">
                      <Store className="w-3.5 h-3.5 text-blue-700" />
                      <span>Merchant</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 border-emerald-200">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Student</span>
                    </span>
                  )}
                </span>

                {/* User Name & Sign Out */}
                <div className="flex items-center gap-1.5">
                  <span className="hidden lg:inline text-xs font-medium text-slate-700 max-w-[120px] truncate">
                    {profile?.name || user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={signOutUser}
                    className="min-h-[36px] min-w-[36px] p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 outline-none flex items-center justify-center"
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
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              >
                Sign In
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] p-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Accessible Mobile Navigation Drawer (Role-Specific) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          
          {/* Student / Visitor Mobile Links */}
          {(!user || role === 'student') && (
            <>
              <button
                onClick={() => handleNavigate('/student/discover')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/student/discover') ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Civic Opportunities</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/student/offers')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/student/offers') ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Local Rewards</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              {user && (
                <button
                  onClick={() => handleNavigate('/student/dashboard')}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    path === '/student/dashboard' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Student Hub Dashboard</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </>
          )}

          {/* Merchant Mobile Links */}
          {user && role === 'shopkeeper' && (
            <>
              <button
                onClick={() => handleNavigate('/merchant/dashboard')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  path === '/merchant/dashboard' ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Merchant Dashboard</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/merchant/redeem')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/merchant/redeem') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>POS Scanner</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/merchant/offers')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/merchant/offers') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Manage Offers</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/merchant/history')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/merchant/history') ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Redemption History</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </>
          )}

          {/* Admin Mobile Links */}
          {user && role === 'admin' && (
            <>
              <button
                onClick={() => handleNavigate('/admin/dashboard')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  path === '/admin/dashboard' ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Admin Overview</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/admin/tasks')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/admin/tasks') ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Task Management</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/admin/reviews')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/admin/reviews') ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Submission Reviews</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => handleNavigate('/admin/audit')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/admin/audit') ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Audit Logs</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenGuide();
            }}
            className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>How It Works</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </header>
  );
}
