import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider, useToast } from './context/ToastContext.tsx';
import { RouterProvider, useRouter } from './context/RouterContext.tsx';
import { testFirestoreConnection } from './lib/firebase.ts';
import { Navbar } from './components/layout/Navbar.tsx';
import { SeedBanner } from './components/common/SeedBanner.tsx';
import { LandingHero } from './components/home/LandingHero.tsx';
import { StudentInterface } from './components/student/StudentInterface.tsx';
import { MerchantInterface } from './components/merchant/MerchantInterface.tsx';
import { AdminInterface } from './components/admin/AdminInterface.tsx';
import { DemoGuideModal } from './components/common/DemoGuideModal.tsx';
import { MerchantApplyModal } from './components/merchant/MerchantApplyModal.tsx';
import { CivicTaskChatWidget } from './components/chat/CivicTaskChatWidget.tsx';
import { ShieldCheck } from 'lucide-react';

function AppContent() {
  const { user, profile, role, loading, isDemoMode, isGuestMode, switchDemoRole } = useAuth();
  const { path, navigate } = useRouter();

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMerchantApplyOpen, setIsMerchantApplyOpen] = useState(false);

  // Initial connection test
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  const effectivePath = path;
  const isStudentRoute = effectivePath.startsWith('/student');
  const isMerchantRoute = effectivePath.startsWith('/merchant');
  const isAdminRoute = effectivePath.startsWith('/admin');

  // Sub-route extractor (e.g. '/student/discover' -> 'discover')
  const getSubRoute = (basePrefix: string) => {
    const after = effectivePath.slice(basePrefix.length);
    const sub = after.replace(/^\//, '').split('/')[0];
    return sub || 'dashboard';
  };

  // Keep old authentication URLs usable as links without rendering sign-in screens.
  useEffect(() => {
    if (path.startsWith('/demo') || path === '/login' || path === '/signup') {
      navigate('/', { replace: true });
    }
  }, [path, navigate]);

  // Loading Screen while Firebase Auth and Role are resolving
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
          CT
        </div>
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-sm font-bold text-slate-200">Resolving Civic Credentials</h2>
          <p className="text-xs text-slate-400">Verifying authoritative user permissions &amp; role security...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Administrative Quick-Start Seed Banner (Admin Only) */}
      <SeedBanner onSeeded={() => navigate('/admin/tasks')} />

      {/* Role-Specific Navigation Bar */}
      <Navbar
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* User Context Banner */}
      {isGuestMode && (
        <div className="bg-white border-b border-slate-200 py-2.5 px-4 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Guest profile: <strong className="text-slate-900">{profile.name}</strong>
                {' · Dashboard: '}
                <span className={`capitalize font-bold px-2 py-0.5 rounded text-[11px] ${
                  role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  role === 'shopkeeper' ? 'bg-blue-100 text-blue-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {role === 'shopkeeper' ? 'Merchant' : role || 'student'}
                </span>
              </span>
            </div>

            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <span>Preview dashboard</span>
              <select
                value={role}
                onChange={(event) => {
                  const selectedRole = event.target.value as 'student' | 'shopkeeper' | 'admin';
                  switchDemoRole(selectedRole);
                  navigate(
                    selectedRole === 'admin'
                      ? '/admin/dashboard'
                      : selectedRole === 'shopkeeper'
                        ? '/merchant/dashboard'
                        : '/student/dashboard',
                  );
                }}
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800"
                aria-label="Select dashboard profile"
              >
                <option value="student">Student Dashboard</option>
                <option value="shopkeeper">Shopkeeper Dashboard</option>
                <option value="admin">Admin Dashboard</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-950">
        {isDemoMode
          ? 'Local demo: sample data and workflow changes stay in this browser and are not written to Firebase.'
          : 'Guest prototype: Firebase data is shared. Admin and reward writes are blocked for guests; replace the legacy Firestore test bypass before public deployment.'}
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ROUTE: /student/* */}
        {isStudentRoute && (
          <StudentInterface
            subRoute={getSubRoute('/student')}
            onOpenMerchantApply={() => setIsMerchantApplyOpen(true)}
          />
        )}

        {/* ROUTE: /merchant/* */}
        {isMerchantRoute && (
          <MerchantInterface subRoute={getSubRoute('/merchant')} />
        )}

        {/* ROUTE: /admin/* */}
        {isAdminRoute && (
          <AdminInterface subRoute={getSubRoute('/admin')} />
        )}

        {/* ROUTE: / (Public Landing Page) */}
        {(!isStudentRoute && !isMerchantRoute && !isAdminRoute) && (
          <div className="space-y-12">
            <LandingHero
              onOpenGuide={() => setIsGuideOpen(true)}
              onSelectTab={(tab) => {
                if (tab === 'tasks') {
                  if (role === 'admin') navigate('/admin/tasks');
                  else if (role === 'shopkeeper') navigate('/merchant/offers');
                  else navigate('/student/discover');
                } else if (tab === 'rewards') {
                  if (role === 'admin') navigate('/admin/businesses');
                  else if (role === 'shopkeeper') navigate('/merchant/offers');
                  else navigate('/student/offers');
                }
              }}
            />

            {/* Public Community Tasks Preview */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Current Volunteer Initiatives</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Explore active community tasks in your neighborhood</p>
                </div>
                <button
                  onClick={() => {
                    if (role === 'admin') navigate('/admin/tasks');
                    else if (role === 'shopkeeper') navigate('/merchant/dashboard');
                    else navigate('/student/discover');
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View All Tasks &rarr;
                </button>
              </div>
              <StudentInterface 
                subRoute="discover" 
                onOpenMerchantApply={() => setIsMerchantApplyOpen(true)} 
              />
            </div>
          </div>
        )}

      </main>

      {/* Accessible Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">CivicTask</span>
            <span>·</span>
            <span>Verified Community Service &amp; Local Rewards</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button onClick={() => setIsGuideOpen(true)} className="hover:text-slate-900">
              Protocol Lifecycle
            </button>
            {role === 'student' && (
              <button onClick={() => setIsMerchantApplyOpen(true)} className="hover:text-slate-900">
                Merchant Enrollment
              </button>
            )}
            {user && (
              <button 
                onClick={() => {
                  if (role === 'admin') navigate('/admin/dashboard');
                  else if (role === 'shopkeeper') navigate('/merchant/dashboard');
                  else navigate('/student/dashboard');
                }} 
                className="hover:text-slate-900 font-semibold"
              >
                {role === 'admin' ? 'Admin Panel' : role === 'shopkeeper' ? 'Merchant Portal' : 'My Student Hub'}
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DemoGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        onSelectTab={(tab) => {
          if (tab === 'tasks') {
            if (role === 'admin') navigate('/admin/tasks');
            else if (role === 'shopkeeper') navigate('/merchant/offers');
            else navigate('/student/discover');
          } else if (tab === 'rewards') {
            if (role === 'admin') navigate('/admin/businesses');
            else if (role === 'shopkeeper') navigate('/merchant/offers');
            else navigate('/student/offers');
          }
        }} 
      />
      <MerchantApplyModal isOpen={isMerchantApplyOpen} onClose={() => setIsMerchantApplyOpen(false)} />

      {/* Floating CivicTask AI Assistant Chat */}
      <CivicTaskChatWidget />

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
