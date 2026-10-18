import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { db } from '../../lib/firebase.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useRouter } from '../../context/RouterContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { PartnerShop, CivicTransaction, ShopkeeperApplication } from '../../lib/types.ts';
import { handleFirestoreError, OperationType } from '../../lib/error-handler.ts';
import { 
  Store, 
  QrCode, 
  Camera, 
  CheckCircle2, 
  Coins, 
  Clock, 
  Edit3, 
  X, 
  ShieldCheck, 
  Receipt,
  LayoutDashboard,
  Tag,
  History,
  Building2,
  Settings,
  AlertCircle,
  TrendingUp,
  Search,
  ExternalLink,
  ChevronRight,
  LogOut,
  Sparkles,
  Calendar,
  MapPin,
  RefreshCw,
  Plus
} from 'lucide-react';

interface MerchantInterfaceProps {
  subRoute?: string;
}

export function MerchantInterface({ subRoute = 'dashboard' }: MerchantInterfaceProps) {
  const { user, profile, signOutUser } = useAuth();
  const { success, error } = useToast();
  const { path, navigate } = useRouter();

  // Primary state
  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<PartnerShop | null>(null);
  const [transactions, setTransactions] = useState<CivicTransaction[]>([]);
  const [myApplications, setMyApplications] = useState<ShopkeeperApplication[]>([]);
  const [loadingShops, setLoadingShops] = useState<boolean>(true);

  // Scanner state
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Verified session preview before confirmation
  const [verifiedSession, setVerifiedSession] = useState<{
    id: string;
    code: string;
    studentName: string;
    studentId: string;
    studentBalance: number;
    shopId: string;
    shopName: string;
    offerTitle: string;
    pointsCost: number;
    expiresAt: string;
  } | null>(null);

  // Successful redemption modal
  const [completedTransaction, setCompletedTransaction] = useState<{
    transactionId: string;
    pointsDeducted: number;
    remainingBalance: number;
    shopName: string;
    offerTitle: string;
    studentName: string;
  } | null>(null);

  // Edit Shop modal
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editShopName, setEditShopName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editOffer, setEditOffer] = useState('');
  const [editPoints, setEditPoints] = useState<number>(100);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [isSavingShop, setIsSavingShop] = useState(false);

  // Search filter for history
  const [historySearch, setHistorySearch] = useState('');

  // Scanner DOM ref
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Determine active view from subRoute or path
  const activeNav = subRoute || (
    path.includes('/business') ? 'business' :
    path.includes('/offers') ? 'offers' :
    path.includes('/redeem') || path.includes('/scan') ? 'redeem' :
    path.includes('/history') ? 'history' :
    path.includes('/profile') ? 'profile' :
    path.includes('/settings') ? 'settings' :
    'dashboard'
  );

  // Global escape key listener
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isEditingShop) setIsEditingShop(false);
      if (scannerActive) setScannerActive(false);
      if (verifiedSession) setVerifiedSession(null);
      if (completedTransaction) setCompletedTransaction(null);
    }
  }, [isEditingShop, scannerActive, verifiedSession, completedTransaction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Real-time listener for shops owned by this merchant
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'partnerShops'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: PartnerShop[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as PartnerShop);
        });
        setShops(list);
        setLoadingShops(false);
        if (list.length > 0 && !selectedShop) {
          setSelectedShop(list[0]);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'partnerShops');
        setLoadingShops(false);
      }
    );
    return () => unsubscribe();
  }, [user, selectedShop]);

  // Real-time listener for merchant applications
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'shopkeeperApplications'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ShopkeeperApplication[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as ShopkeeperApplication);
        });
        setMyApplications(list);
      },
      (err) => {
        console.warn('Applications listener note:', err);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for transactions for selected shop
  useEffect(() => {
    if (!selectedShop) return;
    const q = query(collection(db, 'transactions'), where('shopId', '==', selectedShop.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CivicTransaction[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CivicTransaction);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      }
    );
    return () => unsubscribe();
  }, [selectedShop]);

  // Calculate Metrics
  const totalRedemptions = transactions.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const redemptionsToday = transactions.filter(t => t.timestamp.startsWith(todayStr)).length;
  const activeOffersCount = shops.filter(s => s.status === 'active').length;
  const expiredOrInactiveOffersCount = shops.filter(s => s.status === 'inactive').length;
  const totalPointsRedeemed = transactions.reduce((acc, t) => acc + (t.pointsDeducted || 0), 0);

  // Group by offer for top redeemed
  const offerCounts = transactions.reduce((acc, t) => {
    const key = t.offerTitle || 'Store Discount';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostRedeemedOffers = Object.entries(offerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Format manual code input
  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.startsWith('CT')) {
      val = val.slice(2);
    }
    if (val.length > 6) val = val.slice(0, 6);
    
    let formatted = 'CT-';
    if (val.length <= 3) {
      formatted += val;
    } else {
      formatted += val.slice(0, 3) + '-' + val.slice(3);
    }
    setManualCode(formatted);
  };

  // Validate Code Handler
  const handleValidateCode = async (codeToValidate: string) => {
    if (!codeToValidate || codeToValidate.length < 8) {
      error('Please enter a valid 6-character code (e.g. CT-ABC-123).');
      return;
    }

    try {
      setIsValidating(true);
      const res = await apiFetch<{
        valid: boolean;
        session: any;
      }>('/api/redemption/validate', {
        method: 'POST',
        body: JSON.stringify({ code: codeToValidate.trim().toUpperCase() }),
      });

      if (res?.valid && res.session) {
        setVerifiedSession(res.session);
        setScannerActive(false);
        success('Valid student redemption token verified!');
      } else {
        error('Invalid or expired redemption token.');
      }
    } catch (err: any) {
      error(err.message || 'Validation failed. Code may be expired, used, or unauthorized.');
    } finally {
      setIsValidating(false);
    }
  };

  // Confirm Point Deduction Handler
  const handleConfirmRedemption = async () => {
    if (!verifiedSession) return;

    try {
      setIsConfirming(true);
      const res = await apiFetch<{
        success: boolean;
        details: any;
      }>('/api/redemption/confirm', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: verifiedSession.id,
          code: verifiedSession.code,
        }),
      });

      if (res?.success) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
        setCompletedTransaction(res.details);
        setVerifiedSession(null);
        setManualCode('');
        success('Redemption confirmed! Points successfully debited from student wallet.');
      }
    } catch (err: any) {
      error(err.message || 'Failed to complete transaction.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Camera QR Scanner Controller
  useEffect(() => {
    if (scannerActive) {
      const scanner = new Html5QrcodeScanner(
        'merchant-qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleValidateCode(decodedText);
          scanner.clear().catch(console.error);
        },
        () => {
          // Frame scan error - ignore to keep scanning
        }
      );

      scannerRef.current = scanner;
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scannerActive]);

  // Open Edit Shop
  const handleOpenEditShop = (shop: PartnerShop) => {
    setEditShopName(shop.shopName);
    setEditAddress(shop.address);
    setEditOffer(shop.discountOffer);
    setEditPoints(shop.pointsCost);
    setEditStatus(shop.status);
    setIsEditingShop(true);
  };

  // Save Shop Updates
  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    try {
      setIsSavingShop(true);
      await apiFetch('/api/merchant/update', {
        method: 'POST',
        body: JSON.stringify({
          shopId: selectedShop.id,
          shopName: editShopName.trim(),
          address: editAddress.trim(),
          discountOffer: editOffer.trim(),
          pointsCost: Number(editPoints),
          status: editStatus,
        }),
      });

      setSelectedShop(prev => prev ? ({
        ...prev,
        shopName: editShopName.trim(),
        address: editAddress.trim(),
        discountOffer: editOffer.trim(),
        pointsCost: Number(editPoints),
        status: editStatus,
      }) : null);

      success('Shop details & offer updated successfully!');
      setIsEditingShop(false);
    } catch (err: any) {
      error(err.message || 'Failed to update shop details.');
    } finally {
      setIsSavingShop(false);
    }
  };

  // Navigation Items
  const merchantNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/merchant/dashboard' },
    { id: 'business', label: 'My Business', icon: Building2, href: '/merchant/business' },
    { id: 'offers', label: 'Manage Offers', icon: Tag, href: '/merchant/offers' },
    { id: 'redeem', label: 'Redeem Rewards', icon: QrCode, href: '/merchant/redeem' },
    { id: 'history', label: 'Redemption History', icon: History, href: '/merchant/history' },
    { id: 'profile', label: 'Business Profile', icon: Store, href: '/merchant/profile' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/merchant/settings' },
  ];

  // Filtered transactions for history tab
  const filteredTransactions = transactions.filter(t => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      (t.studentName || '').toLowerCase().includes(q) ||
      (t.offerTitle || '').toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">

      {/* Merchant Top Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">
                {selectedShop?.shopName || 'Merchant Operations Portal'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Verified Merchant
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authorized Storefront · {selectedShop?.address || user?.email}
            </p>
          </div>
        </div>

        {/* Shop Switcher if merchant has multiple stores */}
        {shops.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Select Store:</span>
            <select
              value={selectedShop?.id || ''}
              onChange={(e) => {
                const s = shops.find(x => x.id === e.target.value);
                if (s) setSelectedShop(s);
              }}
              className="bg-slate-800 text-white text-xs rounded-lg px-3 py-1.5 border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.shopName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => navigate('/merchant/redeem')}
          className="min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Student QR</span>
        </button>
      </div>

      {/* Role Navigation Menu */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Merchant portal navigation">
          {merchantNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-200' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* VIEW 1: MERCHANT DASHBOARD */}
      {activeNav === 'dashboard' && (
        <div className="space-y-6">

          {/* 6 Key Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Redemptions
              </span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums block">
                {totalRedemptions}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Lifetime verified</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Redemptions Today
              </span>
              <span className="text-2xl font-extrabold text-blue-700 font-mono tabular-nums block">
                {redemptionsToday}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Since midnight</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Active Offers
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums block">
                {activeOffersCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Live in marketplace</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Expired Offers
              </span>
              <span className="text-2xl font-extrabold text-slate-600 font-mono tabular-nums block">
                {expiredOrInactiveOffersCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Paused or inactive</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Points Accepted
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {totalPointsRedeemed.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-blue-700">pts</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Debited from civic students</span>
            </div>
          </div>

          {/* 2-Column Split: Most Frequently Redeemed & Quick Scanner Callout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left 2 Cols: Most Frequently Redeemed + Recent Transactions */}
            <div className="lg:col-span-2 space-y-6">

              {/* Frequently Redeemed Offers */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-700" />
                  <span>Most Frequently Redeemed Offers</span>
                </h3>

                {mostRedeemedOffers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">No redemptions recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {mostRedeemedOffers.map(([offerTitle, count], idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800">{offerTitle}</span>
                        </div>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {count} redemptions
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Transactions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-slate-700" />
                    <span>Recent In-Store Transactions</span>
                  </h3>
                  <button
                    onClick={() => navigate('/merchant/history')}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                  >
                    View All &rarr;
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                    No transactions recorded yet for this storefront.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3">Offer Applied</th>
                          <th className="py-2.5 px-3">Points Debited</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.slice(0, 5).map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {tx.studentName || 'Student'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{tx.offerTitle}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              -{tx.pointsDeducted} pts
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">
                              {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Completed
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Right 1 Col: Redemption Terminal Card */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">POS Redemption Scanner</h3>
                  <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                    Scan student QR tokens directly with your tablet or phone camera, or enter the 6-character redemption code manually.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/merchant/redeem')}
                  className="w-full min-h-[44px] bg-white text-blue-950 font-bold text-xs rounded-xl shadow-xs hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-blue-700" />
                  <span>Launch POS Scanner</span>
                </button>
              </div>

              {/* Current Active Storefront Card */}
              {selectedShop && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Storefront Details
                    </span>
                    <button
                      onClick={() => handleOpenEditShop(selectedShop)}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedShop.shopName}</h4>
                  <p className="text-xs text-slate-600">{selectedShop.discountOffer}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>Points Cost:</span>
                    <span className="font-bold text-slate-900">{selectedShop.pointsCost} pts</span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: MY BUSINESS */}
      {activeNav === 'business' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Authorized Business Storefronts</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage registered locations authorized for your merchant credentials
              </p>
            </div>
            {selectedShop && (
              <button
                onClick={() => handleOpenEditShop(selectedShop)}
                className="min-h-[38px] px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Storefront</span>
              </button>
            )}
          </div>

          {shops.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
              <Store className="w-12 h-12 text-blue-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Approved Business Found</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your merchant account does not currently have an active storefront linked. If you recently applied, an administrator must approve your application before merchant features are unlocked.
              </p>
              {myApplications.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1">
                  <span className="font-bold">Application Status: {myApplications[0].status.toUpperCase()}</span>
                  <p>Submitted for: {myApplications[0].shopName}</p>
                  {myApplications[0].adminNotes && <p className="italic">Admin Note: {myApplications[0].adminNotes}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shops.map(shop => (
                <div key={shop.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {shop.category || 'Retail Partner'}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{shop.shopName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{shop.address}</span>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      shop.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {shop.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {shop.description || 'Community partner offering verified student rewards.'}
                  </p>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <span className="font-semibold text-slate-700 block">Current Featured Offer:</span>
                    <p className="text-slate-900 font-bold">{shop.discountOffer}</p>
                    <span className="text-blue-700 font-mono font-bold block">
                      Cost: {shop.pointsCost} civic points
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Store ID: <code className="font-mono">{shop.id}</code></span>
                    <button
                      onClick={() => handleOpenEditShop(shop)}
                      className="text-blue-700 font-bold hover:underline"
                    >
                      Configure Offer &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: MANAGE OFFERS */}
      {activeNav === 'offers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Manage Reward Offers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure discount details, required points balance, and active storefront status
              </p>
            </div>
            {selectedShop && (
              <button
                onClick={() => handleOpenEditShop(selectedShop)}
                className="min-h-[38px] px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Update Offer</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Offer Title</th>
                    <th className="py-3 px-4">Storefront</th>
                    <th className="py-3 px-4">Points Required</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shops.map(shop => (
                    <tr key={shop.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{shop.discountOffer}</span>
                        <span className="text-[11px] text-slate-500">{shop.address}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{shop.shopName}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 tabular-nums">
                        {shop.pointsCost} pts
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          shop.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {shop.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditShop(shop)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: REDEEM REWARDS (SCANNER & MANUAL CODE) */}
      {(activeNav === 'redeem' || activeNav === 'scan') && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">In-Store Reward Redemption Terminal</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scan student's single-use QR code or enter manual code. System performs atomic validation on server before points deduction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Camera QR Scanner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-700" />
                    <span>Camera QR Scanner</span>
                  </h3>
                  <p className="text-xs text-slate-500">Scan student's ephemeral session token</p>
                </div>
                {scannerActive && (
                  <button
                    onClick={() => setScannerActive(false)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Close Camera
                  </button>
                )}
              </div>

              {!scannerActive ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    Position student's mobile screen in front of your camera. Tokens expire after 15 minutes.
                  </p>
                  <button
                    onClick={() => setScannerActive(true)}
                    className="min-h-[44px] px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera Scanner</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div id="merchant-qr-reader" className="overflow-hidden rounded-xl border border-slate-200" />
                  <p className="text-[11px] text-center text-slate-500">
                    Align QR code inside square viewport to auto-verify
                  </p>
                </div>
              )}
            </div>

            {/* Manual Code Fallback */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-700" />
                  <span>Manual Code Fallback</span>
                </h3>
                <p className="text-xs text-slate-500">
                  If student camera or screen is damaged, enter the 6-character code
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleValidateCode(manualCode);
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="manual-code-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Redemption Code (Format: CT-XXX-XXX)
                  </label>
                  <input
                    id="manual-code-input"
                    type="text"
                    value={manualCode}
                    onChange={handleCodeInputChange}
                    placeholder="CT-9AB-4K2"
                    maxLength={10}
                    className="w-full min-h-[44px] px-3.5 py-2 text-base font-mono font-bold tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-700 text-center uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isValidating || manualCode.length < 8}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying with Server...</span>
                    </>
                  ) : (
                    <span>Validate Code</span>
                  )}
                </button>
              </form>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  Anti-fraud protection: Codes can only be redeemed once and cannot be replayed. Balance is verified atomically.
                </span>
              </div>
            </div>

          </div>

          {/* Verification Modal / Confirmation Cue */}
          {verifiedSession && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold text-sm">Valid Redemption Token</span>
                    </div>
                    <button
                      onClick={() => setVerifiedSession(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100 space-y-1">
                      <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
                        Offer to apply
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{verifiedSession.offerTitle}</h4>
                      <p className="text-slate-600">Store: {verifiedSession.shopName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Student</span>
                        <span className="font-bold text-slate-900 block truncate">{verifiedSession.studentName}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Points Cost</span>
                        <span className="font-mono font-bold text-blue-700 block tabular-nums">
                          {verifiedSession.pointsCost} pts
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600">Student Balance:</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {verifiedSession.studentBalance} pts
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVerifiedSession(null)}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRedemption}
                      disabled={isConfirming}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isConfirming ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Deducting...</span>
                        </>
                      ) : (
                        <span>Confirm Deduction</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completed Transaction Dialog */}
          {completedTransaction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Discount Successfully Applied!</h3>
                <p className="text-xs text-slate-600">
                  {completedTransaction.pointsDeducted} points deducted from {completedTransaction.studentName}'s account. Provide the customer with their discount.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction ID:</span>
                    <span className="font-bold text-slate-900">{completedTransaction.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Offer:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">{completedTransaction.offerTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student Remaining:</span>
                    <span className="font-bold text-slate-900">{completedTransaction.remainingBalance} pts</span>
                  </div>
                </div>

                <button
                  onClick={() => setCompletedTransaction(null)}
                  className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW 5: REDEMPTION HISTORY */}
      {activeNav === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Redemption History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete verifiable audit log of student points redeemed at your business
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search transactions..."
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-1">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No redemption records found</p>
                <p className="text-slate-400">Transactions processed via QR scan will appear here in real-time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Offer Applied</th>
                      <th className="py-3 px-4">Points Debited</th>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{tx.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{tx.studentName || 'Student'}</td>
                        <td className="py-3 px-4 text-slate-700">{tx.offerTitle}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">-{tx.pointsDeducted} pts</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 6: BUSINESS PROFILE */}
      {activeNav === 'profile' && selectedShop && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Business Profile</h2>
              <p className="text-xs text-slate-500">Verified storefront information displayed to civic students</p>
            </div>
            <button
              onClick={() => handleOpenEditShop(selectedShop)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Business Name</span>
                <span className="text-sm font-bold text-slate-900">{selectedShop.shopName}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Category</span>
                <span className="text-sm font-semibold text-slate-800">{selectedShop.category || 'Retail Partner'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block font-semibold mb-0.5">Operating Street Address</span>
              <span className="text-slate-900">{selectedShop.address}</span>
            </div>

            <div>
              <span className="text-slate-500 block font-semibold mb-0.5">Description</span>
              <p className="text-slate-700 leading-relaxed">{selectedShop.description || 'Verified local merchant.'}</p>
            </div>

            <div>
              <span className="text-slate-500 block font-semibold mb-0.5">Linked Merchant Account</span>
              <span className="font-mono text-slate-600">{user?.email}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 7: SETTINGS */}
      {activeNav === 'settings' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Merchant Settings &amp; Security</h2>
            <p className="text-xs text-slate-500">Account session and operational preferences</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Server-Side Validation Enforced</span>
              <p className="text-slate-600 leading-relaxed">
                All reward redemptions are verified against cryptographically hashed session tokens with atomic balance debits to prevent token replay or concurrent fraud.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={signOutUser}
                className="w-full min-h-[44px] px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Merchant Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STOREFRONT MODAL */}
      {isEditingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Edit Storefront &amp; Reward Offer</h3>
                <button
                  onClick={() => setIsEditingShop(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveShop} className="space-y-4">
                <div>
                  <label htmlFor="edit-shop-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Name
                  </label>
                  <input
                    id="edit-shop-name"
                    type="text"
                    required
                    value={editShopName}
                    onChange={e => setEditShopName(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="edit-address" className="block text-xs font-semibold text-slate-700 mb-1">
                    Physical Address
                  </label>
                  <input
                    id="edit-address"
                    type="text"
                    required
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="edit-offer" className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Offer (e.g. Free espresso + pastry, $10 off)
                  </label>
                  <input
                    id="edit-offer"
                    type="text"
                    required
                    value={editOffer}
                    onChange={e => setEditOffer(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-points" className="block text-xs font-semibold text-slate-700 mb-1">
                      Required Points
                    </label>
                    <input
                      id="edit-points"
                      type="number"
                      required
                      min={10}
                      max={5000}
                      value={editPoints}
                      onChange={e => setEditPoints(Number(e.target.value))}
                      className="w-full min-h-[40px] px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-status" className="block text-xs font-semibold text-slate-700 mb-1">
                      Offer Status
                    </label>
                    <select
                      id="edit-status"
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Paused)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingShop(false)}
                    className="min-h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingShop}
                    className="min-h-[40px] px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-60"
                  >
                    {isSavingShop ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
