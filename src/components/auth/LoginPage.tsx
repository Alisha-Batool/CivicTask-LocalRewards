import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useRouter } from '../../context/RouterContext.tsx';
import { Lock, Mail, User, ShieldCheck, ArrowRight, Store, GraduationCap, ShieldAlert, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { 
    user, 
    role, 
    loading, 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    sendPasswordReset 
  } = useAuth();
  const { success, error } = useToast();
  const { navigate, searchParams } = useRouter();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-redirect if already signed in and role resolved
  useEffect(() => {
    if (!loading && user && role) {
      const redirectParam = searchParams.get('redirect');
      if (redirectParam && redirectParam.startsWith('/')) {
        // If the redirect path matches their role or is authorized, use it
        if (
          (role === 'student' && redirectParam.startsWith('/student')) ||
          (role === 'shopkeeper' && redirectParam.startsWith('/merchant')) ||
          (role === 'admin')
        ) {
          navigate(redirectParam, { replace: true });
          return;
        }
      }

      // Default role redirection
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'shopkeeper') {
        navigate('/merchant/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [user, role, loading, navigate, searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      success('Successfully signed in with Google!');
    } catch (err: any) {
      error(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Please enter your email address.');
      return;
    }

    if (mode === 'reset') {
      try {
        setIsSubmitting(true);
        await sendPasswordReset(email);
        success('Password reset email sent! Check your inbox.');
        setMode('signin');
      } catch (err: any) {
        error(err.message || 'Failed to send password reset email.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password) {
      error('Please enter your password.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      error('Please enter your full name.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        success('Welcome back!');
      } else {
        // Note: Public signups are strictly student role only
        await signUpWithEmail(email, password, displayName);
        success('Student account created! Welcome to CivicTask.');
      }
    } catch (err: any) {
      error(err.message || 'Authentication error. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold tracking-wide">
          Authenticating credentials &amp; resolving permissions...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {mode === 'signin' ? 'Sign in to CivicTask' : mode === 'signup' ? 'Create Student Account' : 'Reset Password'}
        </h1>
        <p className="text-xs text-slate-600 max-w-xs mx-auto">
          {mode === 'signin' 
            ? 'Access your role-specific dashboard: Student, Merchant, or Administrator'
            : mode === 'signup'
            ? 'Join student volunteers in your community to complete verified tasks and earn discounts'
            : 'Enter your email to receive a password reset link'}
        </p>
      </div>

      {/* Role Navigation Explanation */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
        <div className="p-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
          <GraduationCap className="w-3.5 h-3.5 text-emerald-700 mx-auto mb-1" />
          <span className="font-bold text-slate-900 block">Student</span>
          <span className="text-slate-500">Public signup</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
          <Store className="w-3.5 h-3.5 text-blue-700 mx-auto mb-1" />
          <span className="font-bold text-slate-900 block">Merchant</span>
          <span className="text-slate-500">Admin approved</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
          <ShieldAlert className="w-3.5 h-3.5 text-purple-700 mx-auto mb-1" />
          <span className="font-bold text-slate-900 block">Admin</span>
          <span className="text-slate-500">Privileged only</span>
        </div>
      </div>

      {mode !== 'reset' && (
        <>
          {/* Google 1-Click Auth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full min-h-[44px] flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-300 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-500 uppercase tracking-wider font-medium">
              or with email
            </span>
          </div>
        </>
      )}

      {/* Form */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="login-fullname" className="block text-xs font-semibold text-slate-800 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="login-fullname"
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Jordan Miller"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-700"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-800 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@university.edu"
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-700"
            />
          </div>
        </div>

        {mode !== 'reset' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-800">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-xs text-emerald-800 font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-700"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting 
            ? 'Authenticating...' 
            : mode === 'signin' 
            ? 'Sign In & Enter Dashboard' 
            : mode === 'signup' 
            ? 'Create Student Account' 
            : 'Send Reset Link'}
        </button>
      </form>

      {/* Mode Switches */}
      <div className="text-center text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
        {mode === 'signin' ? (
          <div>
            <span>New student volunteer? </span>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="text-emerald-800 font-bold hover:underline"
            >
              Register here
            </button>
          </div>
        ) : (
          <div>
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-emerald-800 font-bold hover:underline"
            >
              Sign in
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <span>
          Public registration automatically provisions a verified Student account. Merchant privileges require business enrollment review by municipal administrators.
        </span>
      </div>

    </div>
  );
}
