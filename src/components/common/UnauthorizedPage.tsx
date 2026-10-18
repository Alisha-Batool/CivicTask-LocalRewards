import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRouter } from '../../context/RouterContext.tsx';
import { ShieldAlert, ArrowLeft, GraduationCap, Store, ShieldCheck, Home } from 'lucide-react';

interface UnauthorizedPageProps {
  requiredRole?: 'student' | 'merchant' | 'admin';
  message?: string;
  onOpenMerchantApply?: () => void;
}

export function UnauthorizedPage({ requiredRole, message, onOpenMerchantApply }: UnauthorizedPageProps) {
  const { user, role, signOutUser } = useAuth();
  const { navigate } = useRouter();

  const handleReturnHome = () => {
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else if (role === 'shopkeeper') {
      navigate('/merchant/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="max-w-lg mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Unauthorized Access Blocked
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
          {message || 'You do not have the required security credentials to access this protected portal.'}
        </p>
      </div>

      {user && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 text-left space-y-1.5 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Authenticated Account:</span>
            <span className="font-bold text-slate-900 truncate max-w-[180px]">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Assigned Role:</span>
            <span className="font-bold text-emerald-800 capitalize">{role || 'Student'}</span>
          </div>
          {requiredRole && (
            <div className="flex justify-between">
              <span className="text-slate-500">Required Role:</span>
              <span className="font-bold text-rose-700 capitalize">{requiredRole}</span>
            </div>
          )}
        </div>
      )}

      {/* Role specific guidance */}
      {requiredRole === 'merchant' && role === 'student' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 text-left space-y-2">
          <span className="font-bold flex items-center gap-1.5">
            <Store className="w-4 h-4 text-blue-700" />
            <span>Are you a neighborhood business owner?</span>
          </span>
          <p className="text-blue-800 leading-relaxed">
            Merchant accounts require review and activation by a municipal administrator. You can submit your business details for enrollment.
          </p>
          {onOpenMerchantApply && (
            <button
              onClick={onOpenMerchantApply}
              className="mt-1 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs"
            >
              Enroll My Business &rarr;
            </button>
          )}
        </div>
      )}

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleReturnHome}
          className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to My Dashboard</span>
        </button>

        <button
          onClick={signOutUser}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
        >
          Sign in with Another Account
        </button>
      </div>

    </div>
  );
}
