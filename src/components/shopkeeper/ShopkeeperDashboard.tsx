import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { db } from '../../lib/firebase.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { PartnerShop, CivicTransaction } from '../../lib/types.ts';
import { handleFirestoreError, OperationType } from '../../lib/error-handler.ts';
import { 
  Store, 
  QrCode, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  User, 
  Clock, 
  ArrowRight,
  Edit3,
  X
} from 'lucide-react';

export function ShopkeeperDashboard() {
  const { user, profile } = useAuth();
  const { success, error } = useToast();

  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<PartnerShop | null>(null);
  const [transactions, setTransactions] = useState<CivicTransaction[]>([]);
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

  // Edit Shop Modal
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editShopName, setEditShopName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editOffer, setEditOffer] = useState('');
  const [editPoints, setEditPoints] = useState<number>(100);

  // Scanner container ref
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Real-time listener for shops owned by this shopkeeper
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
        if (list.length > 0 && !selectedShop) {
          setSelectedShop(list[0]);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'partnerShops');
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for redemptions/transactions
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

  // QR Scanner initialization
  useEffect(() => {
    if (scannerActive) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Scanned successfully!
          scanner.clear();
          setScannerActive(false);
          validateCode(decodedText);
        },
        (errorMessage) => {
          // scanning frame ignored
        }
      );

      scannerRef.current = scanner;

      return () => {
        try {
          scanner.clear();
        } catch {}
      };
    }
  }, [scannerActive]);

  // Validate Code
  const validateCode = async (codeToValidate: string) => {
    const trimmed = codeToValidate.trim();
    if (!trimmed) {
      error('Please enter a redemption code.');
      return;
    }

    try {
      setIsValidating(true);
      const res = await apiFetch<{
        valid: boolean;
        session: any;
      }>('/api/redemption/validate', {
        method: 'POST',
        body: JSON.stringify({ code: trimmed }),
      });

      if (res?.session) {
        setVerifiedSession(res.session);
        success(`Valid QR code! Verify ${res.session.studentName}'s reward.`);
      }
    } catch (err: any) {
      error(err.message || 'Invalid or expired redemption code.');
      setVerifiedSession(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Confirm Point Deduction (Atomic Transaction)
  const handleConfirmRedemption = async () => {
    if (!verifiedSession) return;

    try {
      setIsConfirming(true);
      const res = await apiFetch<{
        success: boolean;
        details: {
          pointsDeducted: number;
          remainingBalance: number;
          studentName: string;
          offerTitle: string;
        };
      }>('/api/redemption/confirm', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: verifiedSession.id,
          code: verifiedSession.code,
        }),
      });

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      success(
        `Redemption confirmed! ${res.details.pointsDeducted} points deducted. Offer applied for ${res.details.studentName}.`
      );
      setVerifiedSession(null);
      setManualCode('');
    } catch (err: any) {
      error(err.message || 'Failed to complete point deduction.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    try {
      await apiFetch('/api/merchant/update', {
        method: 'POST',
        body: JSON.stringify({
          shopId: selectedShop.id,
          shopName: editShopName,
          address: editAddress,
          discountOffer: editOffer,
          pointsCost: editPoints,
          status: selectedShop.status,
        }),
      });
      success('Shop details and discount offer updated!');
      setIsEditingShop(false);
    } catch (err: any) {
      error(err.message || 'Failed to update shop details.');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Store Header / Profile */}
      {selectedShop ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{selectedShop.shopName}</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active Merchant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{selectedShop.address}</p>
              
              <div className="mt-3 flex items-center gap-3">
                <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800">
                  <span className="text-slate-500 font-medium mr-1.5">Current Offer:</span>
                  <strong className="font-semibold text-emerald-800">{selectedShop.discountOffer}</strong>
                  <span className="ml-2 font-mono text-slate-600 font-bold tabular-nums">
                    ({selectedShop.pointsCost} pts)
                  </span>
                </div>

                <button
                  onClick={() => {
                    setEditShopName(selectedShop.shopName);
                    setEditAddress(selectedShop.address);
                    setEditOffer(selectedShop.discountOffer);
                    setEditPoints(selectedShop.pointsCost);
                    setIsEditingShop(true);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Offer</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Redemptions Honored
            </span>
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {transactions.length}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900">
          <h3 className="text-base font-bold">No partner storefront linked yet</h3>
          <p className="text-xs mt-1">
            If you submitted a shopkeeper enrollment, an administrator must review and approve your application.
          </p>
        </div>
      )}

      {/* REDEMPTION SCANNER & VERIFICATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: QR Scanner & Manual Input */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <span>Validate Student QR Code</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scan the single-use token from the student's phone or enter the 8-character redemption code
            </p>
          </div>

          {/* Camera Scanner Toggle */}
          <div>
            {scannerActive ? (
              <div className="space-y-3">
                <div id="qr-reader-container" className="rounded-xl overflow-hidden border border-slate-200" />
                <button
                  onClick={() => setScannerActive(false)}
                  className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Close Camera Scanner
                </button>
              </div>
            ) : (
              <button
                onClick={() => setScannerActive(true)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Open Device Camera Scanner</span>
              </button>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">
              or enter code manually
            </span>
          </div>

          {/* Manual Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              validateCode(manualCode);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="e.g. CT-8294-XK"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 text-sm font-mono tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 uppercase"
            />
            <button
              type="submit"
              disabled={isValidating || !manualCode.trim()}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : 'Verify'}
            </button>
          </form>
        </div>

        {/* Right: Verification & Confirmation Dialog */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Redemption Verification Pre-Check
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative server check guarantees points are available and not previously spent
            </p>

            {verifiedSession ? (
              <div className="mt-4 p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    <div>
                      <span className="text-xs text-emerald-800 block">Student Volunteer</span>
                      <strong className="text-sm text-slate-900 font-bold">{verifiedSession.studentName}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-800 block">Current Balance</span>
                    <strong className="text-sm font-mono text-emerald-900 font-bold tabular-nums">
                      {verifiedSession.studentBalance} pts
                    </strong>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <span className="text-slate-500 font-semibold block">Requested Offer:</span>
                  <p className="font-bold text-slate-900 text-sm">{verifiedSession.offerTitle}</p>
                </div>

                <div className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-emerald-200 font-semibold">
                  <span className="text-slate-700">Points to Deduct:</span>
                  <span className="text-rose-700 font-mono text-sm tabular-nums">
                    -{verifiedSession.pointsCost} pts
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Session Code: <code className="font-mono">{verifiedSession.code}</code></span>
                </div>
              </div>
            ) : (
              <div className="mt-8 p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-slate-700">No active code verified yet</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Scan a student's QR token to preview their reward and deduct points safely.
                </p>
              </div>
            )}
          </div>

          {verifiedSession && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setVerifiedSession(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRedemption}
                disabled={isConfirming}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {isConfirming ? 'Processing Atomic Deduction...' : 'Confirm & Apply Discount'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* TRANSACTION HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Redemption History</h3>
            <p className="text-xs text-slate-500">
              Audit log of student rewards honored by this storefront
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums">
            Total Deductions: {transactions.reduce((acc, t) => acc + (t.pointsDeducted || 0), 0)} pts
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No completed redemptions for this shop yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Offer Applied</th>
                  <th className="px-4 py-3">Points Deducted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Idempotency Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(txn.timestamp).toLocaleDateString()} {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{txn.studentName || txn.studentId}</td>
                    <td className="px-4 py-3">{txn.offerTitle}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700 tabular-nums">
                      -{txn.pointsDeducted} pts
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        Completed
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                      {txn.idempotencyKey}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT OFFER MODAL */}
      {isEditingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Update Shop &amp; Offer</h3>
              <button onClick={() => setIsEditingShop(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateShop} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name</label>
                <input
                  type="text"
                  required
                  value={editShopName}
                  onChange={e => setEditShopName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Store Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Offer Description</label>
                <input
                  type="text"
                  required
                  value={editOffer}
                  onChange={e => setEditOffer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Points Cost</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPoints}
                  onChange={e => setEditPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingShop(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
