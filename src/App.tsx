import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { testFirestoreConnection } from './lib/firebase.ts';
import { Navbar } from './components/layout/Navbar.tsx';
import { SeedBanner } from './components/common/SeedBanner.tsx';
import { LandingHero } from './components/home/LandingHero.tsx';
import { StudentDashboard } from './components/student/StudentDashboard.tsx';
import { ShopkeeperDashboard } from './components/shopkeeper/ShopkeeperDashboard.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { DemoGuideModal } from './components/common/DemoGuideModal.tsx';
import { MerchantApplyModal } from './components/merchant/MerchantApplyModal.tsx';
import { 
  GraduationCap, 
  Store, 
  ShieldAlert, 
  Coins, 
  Sparkles, 
  ExternalLink,
  Layers
} from 'lucide-react';

function AppContent() {
  const { user, profile, role, loading } = useAuth();
  
  // Navigation tab state: 'home' | 'tasks' | 'rewards' | 'dashboard'
  const [currentTab, setCurrentTab] = useState<string>('home');
  
  // In demo mode, allow evaluator to switch which role dashboard they are previewing
  const [viewRole, setViewRole] = useState<'student' | 'shopkeeper' | 'admin'>('student');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMerchantApplyOpen, setIsMerchantApplyOpen] = useState(false);

  // Sync default viewRole with user's authoritative role
  useEffect(() => {
    if (role) {
      setViewRole(role);
    }
  }, [role]);

  // Initial connection test
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Evaluator Quick-Start Seed Banner */}
      <SeedBanner onSeeded={() => setCurrentTab('tasks')} />

      {/* 3-Zone Top Navigation Bar */}
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      {/* Role View Switcher (when on Dashboard) */}
      {user && currentTab === 'dashboard' && (
        <div className="bg-white border-b border-slate-200 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Signed in as <strong className="text-slate-900">{profile?.email || user.email}</strong>
                {' '}(Authoritative Role: <span className="capitalize font-semibold text-emerald-800">{role || 'student'}</span>)
              </span>
            </div>

            {/* Evaluator Persona Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-500 px-2">Preview Role:</span>
              <button
                onClick={() => setViewRole('student')}
                className={`px-3 py-1 font-semibold rounded-md transition-all flex items-center gap-1 ${
                  viewRole === 'student' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Hub</span>
              </button>
              <button
                onClick={() => setViewRole('shopkeeper')}
                className={`px-3 py-1 font-semibold rounded-md transition-all flex items-center gap-1 ${
                  viewRole === 'shopkeeper' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Merchant Scanner</span>
              </button>
              <button
                onClick={() => setViewRole('admin')}
                className={`px-3 py-1 font-semibold rounded-md transition-all flex items-center gap-1 ${
                  viewRole === 'admin' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Moderation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Landing View */}
        {currentTab === 'home' && (
          <div className="space-y-12">
            <LandingHero
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenGuide={() => setIsGuideOpen(true)}
              onSelectTab={setCurrentTab}
              isAuthenticated={!!user}
            />

            {/* Live student preview component */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Current Volunteer Initiatives</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Explore active community tasks in your neighborhood</p>
                </div>
                <button
                  onClick={() => setCurrentTab('tasks')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View All Tasks &rarr;
                </button>
              </div>
              <StudentDashboard onOpenMerchantApply={() => setIsMerchantApplyOpen(true)} />
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {currentTab === 'tasks' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-bold text-slate-900">Civic Service Opportunities</h1>
              <p className="text-xs text-slate-500 mt-1">
                Complete verified community tasks to earn points for discounts at local shops
              </p>
            </div>
            <StudentDashboard onOpenMerchantApply={() => setIsMerchantApplyOpen(true)} />
          </div>
        )}

        {/* Rewards Tab */}
        {currentTab === 'rewards' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-bold text-slate-900">Local Partner Rewards</h1>
              <p className="text-xs text-slate-500 mt-1">
                Participating independent neighborhood shops accepting CivicTask points
              </p>
            </div>
            <StudentDashboard onOpenMerchantApply={() => setIsMerchantApplyOpen(true)} />
          </div>
        )}

        {/* Role Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {!user ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center max-w-md mx-auto shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                  <Coins className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Sign in to access your portal</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sign in with Google or Email to submit evidence, track verified hours, generate QR tokens, or manage partner redemptions.
                </p>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Sign In with Google or Email
                </button>
              </div>
            ) : viewRole === 'admin' ? (
              <AdminDashboard />
            ) : viewRole === 'shopkeeper' ? (
              <ShopkeeperDashboard />
            ) : (
              <StudentDashboard onOpenMerchantApply={() => setIsMerchantApplyOpen(true)} />
            )}
          </div>
        )}

      </main>

      {/* Clean Accessible Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">CivicTask</span>
            <span>·</span>
            <span>Small actions. Real impact.</span>
            <span>·</span>
            <span>Verified Community Service</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button onClick={() => setIsGuideOpen(true)} className="hover:text-slate-900">
              Protocol Lifecycle
            </button>
            <button onClick={() => setIsMerchantApplyOpen(true)} className="hover:text-slate-900">
              Merchant Enrollment
            </button>
            <span className="text-slate-400">Firebase Firestore &amp; Auth</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <DemoGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} onSelectTab={setCurrentTab} />
      <MerchantApplyModal isOpen={isMerchantApplyOpen} onClose={() => setIsMerchantApplyOpen(false)} />

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
