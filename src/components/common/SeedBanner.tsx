import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { Database, Sparkles, Check, RefreshCw } from 'lucide-react';

interface SeedBannerProps {
  onSeeded?: () => void;
}

export function SeedBanner({ onSeeded }: SeedBannerProps) {
  const { user, role } = useAuth();
  const { success, error } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Restrict administrative seeding exclusively to authorized administrators
  if (dismissed || !user || role !== 'admin') return null;

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const res = await apiFetch<{ success: boolean; message: string; tasksCount: number; shopsCount: number }>('/api/seed', {
        method: 'POST',
      });
      success(res.message || 'Seeded 5 civic tasks and 4 partner shops!');
      if (onSeeded) onSeeded();
    } catch (err: any) {
      error(err.message || 'Failed to seed sample tasks and shops.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-2 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-medium text-slate-300">
            <strong className="text-white">Quick-Start:</strong> Initialize realistic civic tasks (gardens, tutoring, food pantry) and local partner storefronts.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md shadow-xs transition-colors disabled:opacity-50"
          >
            {isSeeding ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Seeding Database...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span>Seed Sample Tasks &amp; Shops</span>
              </>
            )}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
