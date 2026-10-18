import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { Store, X } from 'lucide-react';

interface MerchantApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MerchantApplyModal({ isOpen, onClose }: MerchantApplyModalProps) {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [shopName, setShopName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Cafe & Bakery');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [proposedOffer, setProposedOffer] = useState('');
  const [proposedPoints, setProposedPoints] = useState<number>(120);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      error('Please sign in first to submit a merchant application.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch('/api/merchant/apply', {
        method: 'POST',
        body: JSON.stringify({
          shopName,
          businessCategory,
          address,
          description,
          proposedOffer,
          proposedPoints: Number(proposedPoints),
        }),
      });

      success('Application submitted! Platform administrators will review your storefront.');
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merchant-apply-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-700" />
            <h3 id="merchant-apply-title" className="text-base font-bold text-slate-900">Partner Merchant Application</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
            aria-label="Close application modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Welcome to the CivicTask Partner Network. Connect with verified student volunteers who want to spend their earned civic points at your local business.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="merchant-shop-name" className="block text-xs font-semibold text-slate-800 mb-1">Store / Business Name</label>
            <input
              id="merchant-shop-name"
              type="text"
              required
              placeholder="e.g. Blue Heron Books & Coffee"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="merchant-category" className="block text-xs font-semibold text-slate-800 mb-1">Business Sector</label>
              <select
                id="merchant-category"
                value={businessCategory}
                onChange={e => setBusinessCategory(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Cafe & Bakery">Cafe &amp; Bakery</option>
                <option value="Bookstore">Bookstore</option>
                <option value="Local Produce & Groceries">Local Produce &amp; Groceries</option>
                <option value="Bike Repair & Sports">Bike Repair &amp; Sports</option>
                <option value="Art & Crafts">Art &amp; Crafts</option>
                <option value="Other Neighborhood Service">Other Neighborhood Service</option>
              </select>
            </div>

            <div>
              <label htmlFor="merchant-points" className="block text-xs font-semibold text-slate-800 mb-1">Points Cost</label>
              <input
                id="merchant-points"
                type="number"
                min="1"
                required
                value={proposedPoints}
                onChange={e => setProposedPoints(parseInt(e.target.value) || 0)}
                className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="merchant-address" className="block text-xs font-semibold text-slate-800 mb-1">Physical Storefront Address</label>
            <input
              id="merchant-address"
              type="text"
              required
              placeholder="e.g. 520 Main Street, Suite 101"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="merchant-offer" className="block text-xs font-semibold text-slate-800 mb-1">Proposed Student Discount or Reward</label>
            <input
              id="merchant-offer"
              type="text"
              required
              placeholder="e.g. 15% off any drink or $5 book voucher"
              value={proposedOffer}
              onChange={e => setProposedOffer(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="merchant-description" className="block text-xs font-semibold text-slate-800 mb-1">Store Overview</label>
            <textarea
              id="merchant-description"
              rows={2}
              required
              placeholder="Tell us a little about your local shop..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
