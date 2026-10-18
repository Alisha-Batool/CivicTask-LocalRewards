import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRouter, Link } from '../../context/RouterContext.tsx';
import { ShieldAlert, ArrowRight, LogOut, Home } from 'lucide-react';

export function UnauthorizedPage() {
  const { user, profile, role, signOutUser } = useAuth();
  const { navigate, searchParams } = useRouter();

  const attemptedRole = searchParams.get('required') || 'authorized role';

  const getDashboardPath = () => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'shopkeeper') return '/merchant/dashboard';
    return '/student/dashboard';
  };

  const getDashboardLabel = () => {
    if (role === 'admin') return 'Admin Dashboard';
    if (role === 'shopkeeper') return 'Merchant Dashboard';
    return 'Student Hub';
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">
            Access Restricted
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have the required permissions to view this portal.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Signed in account:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[200px]">{user?.email || 'Authenticated User'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Your Authoritative Role:</span>
            <span className="capitalize font-bold text-emerald-800">{role || 'student'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Portal Requirement:</span>
            <span className="capitalize font-bold text-rose-800">{attemptedRole}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-normal">
          CivicTask enforces strict role boundaries independently in Firestore Security Rules and server API tokens. Client route tampering is forbidden.
        </p>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={() => navigate(getDashboardPath(), { replace: true })}
            className="w-full min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
          >
            <span>Return to {getDashboardLabel()}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={signOutUser}
            className="w-full min-h-[40px] py-2 px-4 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out &amp; Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
