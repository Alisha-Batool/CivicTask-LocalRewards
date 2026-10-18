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
import { LoginPage } from './components/auth/LoginPage.tsx';
import { UnauthorizedPage } from './components/common/UnauthorizedPage.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { DemoGuideModal } from './components/common/DemoGuideModal.tsx';
import { MerchantApplyModal } from './components/merchant/MerchantApplyModal.tsx';
import { 
  GraduationCap, 
  Store, 
  ShieldAlert, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

function AppContent() {
  const { user, profile, role, loading } = useAuth();
  const { path, navigate } = useRouter();
  const { error } = useToast();

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMerchantApplyOpen, setIsMerchantApplyOpen] = useState(false);

  // Initial connection test
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Determine current high-level section from path
  const isStudentRoute = path.startsWith('/student');
  const isMerchantRoute = path.startsWith('/merchant');
  const isAdminRoute = path.startsWith('/admin');
  const isLoginRoute = path === '/login';
  const isUnauthorizedRoute = path === '/unauthorized';

  // Sub-route extractor (e.g. '/student/discover' -> 'discover')
  const getSubRoute = (basePrefix: string) => {
    const after = path.slice(basePrefix.length);
    const sub = after.replace(/^\//, '').split('/')[0];
    return sub || 'dashboard';
  };

  // Enforce Strict Role-Based Route Protection and URL Access Control
  useEffect(() => {
    if (loading) return;

    // 1. Unauthenticated users attempting to access any protected role route
    if (!user && (isStudentRoute || isMerchantRoute || isAdminRoute)) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`, { replace: true });
      return;
    }

    // 2. Authenticated users on /login -> auto-redirect to their assigned dashboard
    if (user && isLoginRoute) {
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'shopkeeper') {
        navigate('/merchant/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
      return;
    }

    // 3. Strict Role Isolation: Block access if user manually enters another role's URL
    if (user && role) {
      if (role === 'student') {
        if (isAdminRoute || isMerchantRoute) {
          error('Access denied: You are signed in as a Student and cannot access merchant or administrative portals.');
          navigate('/student/dashboard', { replace: true });
          return;
        }
      } else if (role === 'shopkeeper') {
        if (isAdminRoute || isStudentRoute) {
          error('Access denied: You are signed in as a Merchant and cannot access student or administrative portals.');
          navigate('/merchant/dashboard', { replace: true });
          return;
        }
      } else if (role === 'admin') {
        if (isStudentRoute || isMerchantRoute) {
          error('Redirected to Admin Dashboard: Administration tasks are managed from the Admin Moderation panel.');
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      }
    }
  }, [user, role, loading, path, isStudentRoute, isMerchantRoute, isAdminRoute, isLoginRoute, navigate, error]);

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
        onOpenAuth={() => navigate('/login')}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* User Context Banner (Displays Authenticated Role with Single Authorized Link) */}
      {user && (
        <div className="bg-white border-b border-slate-200 py-2.5 px-4 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Signed in as <strong className="text-slate-900">{profile?.email || user.email}</strong>
                {' · '}Authorized Role:{' '}
                <span className={`capitalize font-bold px-2 py-0.5 rounded text-[11px] ${
                  role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  role === 'shopkeeper' ? 'bg-blue-100 text-blue-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {role === 'shopkeeper' ? 'Merchant' : role || 'student'}
                </span>
              </span>
            </div>

            {/* Direct Link to Only Authorized Dashboard */}
            <div>
              {role === 'admin' ? (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className={`min-h-[32px] px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isAdminRoute ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
                  <span>Admin Moderation Panel</span>
                </button>
              ) : role === 'shopkeeper' ? (
                <button
                  onClick={() => navigate('/merchant/dashboard')}
                  className={`min-h-[32px] px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isMerchantRoute ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-blue-700" />
                  <span>Merchant Portal</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/student/dashboard')}
                  className={`min-h-[32px] px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isStudentRoute ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Student Hub</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ROUTE: /login */}
        {isLoginRoute && <LoginPage />}

        {/* ROUTE: /unauthorized */}
        {isUnauthorizedRoute && (
          <UnauthorizedPage 
            requiredRole={
              path.includes('admin') ? 'admin' : path.includes('merchant') ? 'merchant' : 'student'
            }
            onOpenMerchantApply={() => setIsMerchantApplyOpen(true)}
          />
        )}

        {/* ROUTE: /student/* (Restricted strictly to Student role) */}
        {isStudentRoute && (
          role === 'student' ? (
            <StudentInterface 
              subRoute={getSubRoute('/student')} 
              onOpenMerchantApply={() => setIsMerchantApplyOpen(true)} 
            />
          ) : (
            <UnauthorizedPage 
              requiredRole="student" 
              message="Student dashboard access is restricted to verified student accounts."
            />
          )
        )}

        {/* ROUTE: /merchant/* (Restricted strictly to Merchant role) */}
        {isMerchantRoute && (
          role === 'shopkeeper' ? (
            <MerchantInterface subRoute={getSubRoute('/merchant')} />
          ) : (
            <UnauthorizedPage 
              requiredRole="merchant" 
              message="Merchant portal access requires an administrator-approved partner business account. Student accounts cannot access merchant operations."
              onOpenMerchantApply={() => setIsMerchantApplyOpen(true)}
            />
          )
        )}

        {/* ROUTE: /admin/* (Restricted strictly to Admin role) */}
        {isAdminRoute && (
          role === 'admin' ? (
            <AdminInterface subRoute={getSubRoute('/admin')} />
          ) : (
            <UnauthorizedPage 
              requiredRole="admin" 
              message="Administrator privileges required. Administrative credentials must be provisioned through trusted server configuration, never client-side elevation."
            />
          )
        )}

        {/* ROUTE: / (Public Landing Page) */}
        {!isStudentRoute && !isMerchantRoute && !isAdminRoute && !isLoginRoute && !isUnauthorizedRoute && (
          <div className="space-y-12">
            <LandingHero
              onOpenAuth={() => navigate('/login')}
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
              isAuthenticated={!!user}
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
            {(!user || role === 'student') && (
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
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
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
