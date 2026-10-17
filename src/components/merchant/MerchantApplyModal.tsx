import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { Store, X, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Partner Merchant Application</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Welcome to the CivicTask Partner Network. Connect with verified student volunteers who want to spend their earned civic points at your local business.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Business Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Blue Heron Books & Coffee"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Sector</label>
              <select
                value={businessCategory}
                onChange={e => setBusinessCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Points Cost</label>
              <input
                type="number"
                min="1"
                required
                value={proposedPoints}
                onChange={e => setProposedPoints(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Storefront Address</label>
            <input
              type="text"
              required
              placeholder="e.g. 520 Main Street, Suite 101"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Student Discount or Reward</label>
            <input
              type="text"
              required
              placeholder="e.g. Free pour-over coffee or $5 off any purchase"
              value={proposedOffer}
              onChange={e => setProposedOffer(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Overview</label>
            <textarea
              rows={2}
              required
              placeholder="Tell us a little about your local shop..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl"
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
