import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useRouter, Link } from '../../context/RouterContext.tsx';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export function PasswordResetPage() {
  const { sendPasswordReset } = useAuth();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Please enter your email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordReset(email.trim());
      setSent(true);
      success('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      error(err.message || 'Failed to send reset email. Verify your email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mx-auto text-center focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg outline-none">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            CT
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            CivicTask
          </span>
        </Link>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Reset Your Password
        </h1>
        <p className="mt-1.5 text-center text-xs text-slate-600">
          Enter the email associated with your account and we will send a recovery link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10 space-y-6">
          
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Recovery Email Dispatched</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account exists for <strong className="text-slate-900">{email}</strong>, you will receive an email with instructions to securely reset your credentials.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:text-emerald-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-800 mb-1">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@university.edu"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-700 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Link...' : 'Send Recovery Link'}</span>
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
