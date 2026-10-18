import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { db } from '../../lib/firebase.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useRouter, Link } from '../../context/RouterContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { CivicTask, TaskSubmission, PartnerShop, PointsLedgerEntry } from '../../lib/types.ts';
import { handleFirestoreError, OperationType } from '../../lib/error-handler.ts';
import { 
  Coins, 
  CheckCircle2, 
  Clock, 
  Award, 
  Search, 
  ArrowUpRight, 
  Upload, 
  Link as LinkIcon, 
  Store, 
  QrCode, 
  MapPin, 
  FileText, 
  AlertCircle,
  X,
  Sparkles,
  RotateCcw,
  User as UserIcon,
  LayoutDashboard,
  Compass,
  Gift,
  History,
  Settings,
  ChevronRight,
  LogOut,
  ExternalLink,
  XCircle,
  TrendingUp,
  Tag
} from 'lucide-react';

interface StudentInterfaceProps {
  subRoute?: string;
  onOpenMerchantApply?: () => void;
}

export function StudentInterface({ subRoute = 'dashboard', onOpenMerchantApply }: StudentInterfaceProps) {
  const { user, profile, pointsBalance, signOutUser, refreshProfile } = useAuth();
  const { success, error } = useToast();
  const { path, navigate } = useRouter();

  // Real-time collections
  const [tasks, setTasks] = useState<CivicTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PointsLedgerEntry[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);

  // Search & Category
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Task Submission Modal State
  const [selectedTask, setSelectedTask] = useState<CivicTask | null>(null);
  const [proofType, setProofType] = useState<'image' | 'link'>('image');
  const [proofUrl, setProofUrl] = useState('');
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Redemption Confirmation Modal State
  const [confirmingShop, setConfirmingShop] = useState<PartnerShop | null>(null);

  // QR Redemption Active Modal State
  const [activeRedemption, setActiveRedemption] = useState<{
    sessionId: string;
    code: string;
    shopName: string;
    offerTitle: string;
    pointsCost: number;
    expiresAt: string;
  } | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(profile?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Derive active view from subRoute or path
  const activeNav = subRoute || (
    path.includes('/discover') ? 'discover' :
    path.includes('/submissions') ? 'submissions' :
    path.includes('/rewards') ? 'rewards' :
    path.includes('/offers') ? 'offers' :
    path.includes('/history') ? 'history' :
    path.includes('/profile') ? 'profile' :
    'dashboard'
  );

  // Global escape key listener
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (confirmingShop) setConfirmingShop(null);
      if (selectedTask) {
        setSelectedTask(null);
        setImagePreview(null);
        setProofUrl('');
      }
      if (activeRedemption) setActiveRedemption(null);
      if (isEditingProfile) setIsEditingProfile(false);
    }
  }, [confirmingShop, selectedTask, activeRedemption, isEditingProfile]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Tasks listener
  useEffect(() => {
    const q = collection(db, 'tasks');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CivicTask[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CivicTask);
        });
        setTasks(list);
        setLoadingTasks(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'tasks');
        setLoadingTasks(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Submissions listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'submissions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TaskSubmission[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as TaskSubmission);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'submissions');
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Partner Shops listener
  useEffect(() => {
    const q = collection(db, 'partnerShops');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: PartnerShop[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as PartnerShop);
        });
        setShops(list.filter(s => s.status === 'active'));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'partnerShops');
      }
    );
    return () => unsubscribe();
  }, []);

  // Points Ledger listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pointsLedger'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: PointsLedgerEntry[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as PointsLedgerEntry);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLedgerEntries(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'pointsLedger');
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Active redemption countdown
  useEffect(() => {
    if (!activeRedemption) return;
    const updateCountdown = () => {
      const exp = new Date(activeRedemption.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((exp - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        setActiveRedemption(null);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeRedemption]);

  // Image file handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      error('Invalid file format. Please upload JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error('Image size exceeds 5 MB maximum limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setProofUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Submit proof handler
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (!proofUrl.trim()) {
      error('Please provide photo evidence or an HTTPS proof link.');
      return;
    }

    if (submissionDescription.trim().length < 10) {
      error('Please provide at least 10 characters describing your service.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch('/api/submissions/create', {
        method: 'POST',
        body: JSON.stringify({
          taskId: selectedTask.id,
          proofType,
          proofUrl,
          description: submissionDescription,
        }),
      });

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      success('Proof submitted! Community administrators will review your evidence.');
      setSelectedTask(null);
      setProofUrl('');
      setImagePreview(null);
      setSubmissionDescription('');
      navigate('/student/submissions');
    } catch (err: any) {
      error(err.message || 'Failed to submit proof. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute QR redemption
  const handleExecuteRedemption = async () => {
    if (!confirmingShop) return;
    const shop = confirmingShop;

    if (pointsBalance < shop.pointsCost) {
      error(`You need ${shop.pointsCost} points for this reward, but have ${pointsBalance}.`);
      setConfirmingShop(null);
      return;
    }

    try {
      setIsGeneratingQr(true);
      const res = await apiFetch<{
        session: {
          id: string;
          code: string;
          shopName: string;
          offerTitle: string;
          pointsCost: number;
          expiresAt: string;
        };
      }>('/api/redemption/create', {
        method: 'POST',
        body: JSON.stringify({
          shopId: shop.id,
          offerId: shop.id,
        }),
      });

      setConfirmingShop(null);
      setActiveRedemption({
        sessionId: res.session.id,
        code: res.session.code,
        shopName: res.session.shopName,
        offerTitle: res.session.offerTitle,
        pointsCost: res.session.pointsCost,
        expiresAt: res.session.expiresAt,
      });
      success('Redemption QR code generated! Present to the shopkeeper.');
    } catch (err: any) {
      error(err.message || 'Failed to generate redemption QR.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Save profile name
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileName.trim()) return;

    try {
      setIsSavingProfile(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: profileName.trim(),
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      success('Profile display name updated!');
      setIsEditingProfile(false);
    } catch (err: any) {
      error(err.message || 'Failed to update profile name.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Metrics
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;
  const estimatedHoursTotal = submissions
    .filter(s => s.status === 'approved')
    .reduce((acc, curr) => {
      const task = tasks.find(t => t.id === curr.taskId);
      return acc + (task?.estimatedHours || 2);
    }, 0);

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    if (t.status !== 'active') return false;
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtered submissions
  const filteredSubmissions = submissions.filter(s => {
    if (submissionFilter === 'all') return true;
    return s.status === submissionFilter;
  });

  // Find next achievable reward
  const sortedShopsByCost = [...shops].sort((a, b) => a.pointsCost - b.pointsCost);
  const nextAchievableReward = sortedShopsByCost.find(s => s.pointsCost > pointsBalance) || sortedShopsByCost[0];

  const studentNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/student/dashboard' },
    { id: 'discover', label: 'Discover Tasks', icon: Compass, href: '/student/discover' },
    { id: 'submissions', label: 'My Submissions', icon: FileText, href: '/student/submissions' },
    { id: 'rewards', label: 'My Points & Rewards', icon: Coins, href: '/student/rewards' },
    { id: 'offers', label: 'Local Offers', icon: Store, href: '/student/offers' },
    { id: 'history', label: 'Redemption History', icon: History, href: '/student/history' },
    { id: 'profile', label: 'Profile & Settings', icon: UserIcon, href: '/student/profile' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Student Hub Secondary Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Student portal navigation">
          {studentNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.id === 'submissions' && pendingCount > 0 && (
                  <span className="font-mono text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* VIEW 1: STUDENT DASHBOARD (OVERVIEW) */}
      {activeNav === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
                Student Volunteer Workspace
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {profile?.name || user?.email?.split('@')[0]}!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Connect with verified civic volunteer tasks in your community. Every completed initiative is verified by school &amp; community administrators to award points for local discounts.
              </p>
              
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/student/discover')}
                  className="min-h-[40px] px-5 py-2.5 bg-white text-emerald-950 font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4 text-emerald-700" />
                  <span>Discover Opportunities</span>
                </button>
                <button
                  onClick={() => navigate('/student/rewards')}
                  className="min-h-[40px] px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl border border-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <Gift className="w-4 h-4 text-emerald-300" />
                  <span>Redeem Local Rewards</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Primary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Available Balance</span>
                <Coins className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums font-mono">
                  {pointsBalance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-800">pts</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Ready to redeem at local shops</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Approved Tasks</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums font-mono">
                  {approvedCount}
                </span>
                <span className="text-xs text-slate-600">verified</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{estimatedHoursTotal} verified service hours</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Review</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums font-mono">
                  {pendingCount}
                </span>
                <span className="text-xs text-amber-700 font-semibold">in queue</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Awaiting administrator audit</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Rejected Submissions</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums font-mono">
                  {rejectedCount}
                </span>
                <span className="text-xs text-slate-600">feedback given</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Check feedback notes to resubmit</p>
            </div>
          </div>

          {/* Reward Goal Progress Strip */}
          {nextAchievableReward && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  Reward Milestone Target
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {nextAchievableReward.discountOffer} at {nextAchievableReward.shopName}
                </h4>
                <p className="text-xs text-slate-600">
                  Target: {nextAchievableReward.pointsCost} points · You have {pointsBalance} points
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="w-48 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-700 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((pointsBalance / nextAchievableReward.pointsCost) * 100))}%`
                    }}
                  />
                </div>
                <button
                  onClick={() => navigate('/student/discover')}
                  className="min-h-[38px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  Earn Remaining
                </button>
              </div>
            </div>
          )}

          {/* 2-Column Split: Recommended Tasks & Recent Submissions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Available Community Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Featured Volunteer Tasks</h3>
                  <p className="text-xs text-slate-600">Immediate community service needs</p>
                </div>
                <button
                  onClick={() => navigate('/student/discover')}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-900"
                >
                  View All &rarr;
                </button>
              </div>

              {tasks.filter(t => t.status === 'active').slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/60 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-800">{task.category}</span>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{task.title}</h4>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">+{task.rewardPoints} points</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                    }}
                    className="min-h-[36px] px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                  >
                    Submit Proof
                  </button>
                </div>
              ))}
            </div>

            {/* Right: Recent Submissions / Activity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Service Activity</h3>
                  <p className="text-xs text-slate-600">Proof reviews and verification history</p>
                </div>
                <button
                  onClick={() => navigate('/student/submissions')}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-900"
                >
                  All Submissions &rarr;
                </button>
              </div>

              {submissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-1">
                  <p>No activity recorded yet.</p>
                  <p className="text-[11px] text-slate-400">Complete volunteer tasks to submit evidence.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.slice(0, 3).map(sub => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <h5 className="font-bold text-slate-900 line-clamp-1">{sub.taskTitle}</h5>
                        <span className="text-slate-500 font-mono tabular-nums">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                        sub.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        sub.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {sub.status === 'approved' ? `Approved (+${sub.rewardPoints} pts)` : sub.status === 'rejected' ? 'Rejected' : 'Under Review'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: DISCOVER TASKS */}
      {activeNav === 'discover' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">Discover Community Service Opportunities</h2>
            <p className="text-xs text-slate-600 mt-1">
              Select verified high-need civic tasks, review instructions, and earn rewards upon approval
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search tasks by title or duties..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white text-sm border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {['All', 'Environment', 'Education', 'Food Security', 'Community Care', 'Civic Cleanup'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-emerald-800 text-white shadow-xs' 
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks Grid */}
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
              <Search className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No matching volunteer opportunities</h3>
              <p className="text-xs text-slate-600">
                Try adjusting your search terms or category filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="min-h-[40px] px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Clear Search &amp; Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map(task => {
                const alreadySubmitted = submissions.some(
                  s => s.taskId === task.id && s.status === 'pending'
                );

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden shadow-xs group"
                  >
                    <div>
                      {task.imageUrl && (
                        <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                          <img
                            src={task.imageUrl}
                            alt={task.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <div className="p-5 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="font-semibold text-emerald-800">{task.category}</span>
                          {task.estimatedHours && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="flex items-center gap-1 font-mono tabular-nums">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{task.estimatedHours} hrs</span>
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-2">
                          {task.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {task.description}
                        </p>

                        {task.location && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{task.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 pt-0 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 font-bold text-emerald-800 text-sm tabular-nums font-mono">
                        <Coins className="w-4 h-4 text-emerald-700" />
                        <span>+{task.rewardPoints} pts</span>
                      </div>

                      <button
                        onClick={() => setSelectedTask(task)}
                        disabled={alreadySubmitted}
                        className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                          alreadySubmitted
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 cursor-not-allowed'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {alreadySubmitted ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Review</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Proof</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: MY SUBMISSIONS */}
      {activeNav === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Task Submissions</h2>
              <p className="text-xs text-slate-600 mt-1">
                Track status of submitted evidence and administrator review notes
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSubmissionFilter(f)}
                  className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    submissionFilter === f
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No submissions found</h3>
              <p className="text-xs text-slate-600">
                {submissionFilter !== 'all' 
                  ? `No submissions match the status "${submissionFilter}".` 
                  : 'You have not submitted verification evidence for any volunteer tasks yet.'}
              </p>
              <button
                onClick={() => navigate('/student/discover')}
                className="min-h-[40px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                Browse Civic Opportunities
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
              {filteredSubmissions.map(sub => (
                <div key={sub.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{sub.taskTitle}</h4>
                      <p className="text-xs text-slate-600 font-mono tabular-nums">
                        Submitted {new Date(sub.createdAt).toLocaleDateString()} at{' '}
                        {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-800 tabular-nums font-mono">
                        +{sub.rewardPoints} pts
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                          sub.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : sub.status === 'rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        {sub.status === 'approved' ? 'Approved & Awarded' : sub.status === 'rejected' ? 'Rejected' : 'Under Review'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl leading-relaxed">
                    "{sub.description}"
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    {sub.proofType === 'link' ? (
                      <a
                        href={sub.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-800 hover:underline flex items-center gap-1.5 font-semibold"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>View Verified Proof Document</span>
                      </a>
                    ) : (
                      sub.proofUrl && (
                        <div className="flex items-center gap-2">
                          <img
                            src={sub.proofUrl}
                            alt="Submitted proof"
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                          />
                          <span className="text-slate-600 font-medium">Photo evidence verified</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Admin Feedback Notes */}
                  {sub.adminNotes && (
                    <div className={`text-xs p-3.5 rounded-xl border ${
                      sub.status === 'rejected' 
                        ? 'bg-rose-50 border-rose-200 text-rose-950' 
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <strong className="font-semibold block mb-0.5">
                        {sub.status === 'rejected' ? 'Administrator Rejection Reason:' : 'Administrator Feedback:'}
                      </strong>
                      <p className="leading-relaxed">{sub.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4 & 5: REWARDS & LOCAL OFFERS */}
      {(activeNav === 'rewards' || activeNav === 'offers') && (
        <div className="space-y-6">
          <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="relative z-10 max-w-xl space-y-2">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
                Partner Storefronts &amp; Local Discounts
              </span>
              <h2 className="text-2xl font-bold tracking-tight">
                Exchange Verified Civic Points for Local Rewards
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Independent neighborhood cafes, bookshops, bike workshops, and farmers markets accept CivicTask tokens. Select an offer below to create a secure, short-lived single-use QR code.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map(shop => {
              const canAfford = pointsBalance >= shop.pointsCost;

              return (
                <div
                  key={shop.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between shadow-xs group"
                >
                  <div>
                    {shop.imageUrl && (
                      <div className="h-44 w-full bg-slate-100 overflow-hidden">
                        <img
                          src={shop.imageUrl}
                          alt={shop.shopName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold text-blue-700">{shop.category || 'Local Business'}</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {shop.pointsCost} pts required
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {shop.shopName}
                      </h3>

                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-950 text-xs font-semibold">
                        {shop.discountOffer}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {shop.description}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{shop.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      {canAfford ? (
                        <span className="text-emerald-800 font-semibold">Eligible to Redeem</span>
                      ) : (
                        <span className="text-slate-500 font-mono tabular-nums">Need {shop.pointsCost - pointsBalance} more pts</span>
                      )}
                    </div>

                    <button
                      onClick={() => setConfirmingShop(shop)}
                      disabled={!canAfford || isGeneratingQr}
                      className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs ${
                        canAfford
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Redeem QR</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 6: REDEMPTION & POINTS HISTORY */}
      {activeNav === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Points &amp; Redemption Ledger</h2>
              <p className="text-xs text-slate-600 mt-1">
                Immutable chronological audit record of all earned service points and spent discounts
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-700 tabular-nums">
              Verified Balance: <strong className="text-emerald-800 text-sm font-mono">{pointsBalance.toLocaleString()} pts</strong>
            </div>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
              <Coins className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No ledger transactions yet</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Points earned through approved service tasks and redeemed at local merchants will appear here.
              </p>
              <button
                onClick={() => navigate('/student/discover')}
                className="min-h-[40px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                Find Tasks to Earn Points
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {ledgerEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px] tabular-nums">
                        {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            entry.type === 'credit'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {entry.type === 'credit' ? '+ Credit' : '- Debit'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">{entry.description}</td>
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                        {entry.sourceType}
                      </td>
                      <td className={`px-5 py-3 text-right font-bold tabular-nums font-mono ${
                        entry.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {entry.type === 'credit' ? `+${entry.amount}` : `-${entry.amount}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 7: PROFILE & SETTINGS */}
      {activeNav === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">Student Profile &amp; Settings</h2>
            <p className="text-xs text-slate-600 mt-1">
              Manage your personal student volunteer profile and security credentials
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
                {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">{profile?.name || 'Student Volunteer'}</h3>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <span className="inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Role: Student (Volunteer Account)
                </span>
              </div>
            </div>

            {/* Editable Name Form */}
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label htmlFor="student-display-name" className="block text-xs font-semibold text-slate-800 mb-1">
                    Display Name
                  </label>
                  <input
                    id="student-display-name"
                    type="text"
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="min-h-[40px] px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Name'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Display Name</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{profile?.name || 'Not set'}</span>
                    <button
                      onClick={() => {
                        setProfileName(profile?.name || '');
                        setIsEditingProfile(true);
                      }}
                      className="text-emerald-800 hover:underline text-[11px] font-bold"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Primary Email</span>
                  <span className="font-mono text-slate-900">{user?.email}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Lifetime Verified Hours</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">{estimatedHoursTotal} hours</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Current Points Balance</span>
                  <span className="font-mono font-bold text-emerald-800 tabular-nums">{pointsBalance.toLocaleString()} points</span>
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between">
              <Link
                href="/reset-password"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                Change or Reset Password
              </Link>

              <button
                onClick={signOutUser}
                className="min-h-[40px] px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: REDEEM REWARD */}
      {confirmingShop && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-reward-title"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800">
                <QrCode className="w-5 h-5 text-emerald-700" />
                <h3 id="confirm-reward-title" className="text-base font-bold text-slate-900">
                  Confirm Reward Redemption
                </h3>
              </div>
              <button 
                onClick={() => setConfirmingShop(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="leading-relaxed">
                You are about to generate a single-use redemption QR token for:
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Store:</span>
                  <span className="font-bold text-slate-900">{confirmingShop.shopName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Discount Offer:</span>
                  <span className="font-bold text-emerald-800">{confirmingShop.discountOffer}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                  <span className="font-semibold text-slate-600">Cost:</span>
                  <span className="font-mono font-bold text-rose-700 tabular-nums">-{confirmingShop.pointsCost} points</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Balance after scan:</span>
                  <span className="font-mono font-bold text-emerald-800 tabular-nums">
                    {(pointsBalance - confirmingShop.pointsCost).toLocaleString()} points
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                Notice: The generated token expires in 15 minutes. Points are only deducted when the merchant scans and confirms the discount.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingShop(null)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRedemption}
                disabled={isGeneratingQr}
                className="min-h-[44px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none disabled:opacity-60"
              >
                <QrCode className="w-4 h-4" />
                <span>{isGeneratingQr ? 'Creating Token...' : 'Confirm & Generate QR Token'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROOF SUBMISSION MODAL */}
      {selectedTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-proof-title"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 id="submit-proof-title" className="text-base font-bold text-slate-900">
                  Submit Verification Proof
                </h3>
                <p className="text-xs text-slate-600 truncate max-w-sm">
                  {selectedTask.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setImagePreview(null);
                  setProofUrl('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProof} className="p-6 overflow-y-auto space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                <span className="font-bold flex items-center gap-1 text-emerald-900">
                  <Coins className="w-3.5 h-3.5 text-emerald-700" />
                  Earn +{selectedTask.rewardPoints} Points upon Admin Approval
                </span>
                <p className="text-emerald-900/90 leading-relaxed">
                  Guidelines: {selectedTask.submissionGuidelines || 'Upload a photo showing your service in action or a volunteer sign-in document.'}
                </p>
              </div>

              {/* Evidence Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Proof Format
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProofType('image');
                      setProofUrl('');
                      setImagePreview(null);
                    }}
                    className={`flex-1 min-h-[40px] py-2 text-xs font-semibold rounded-lg border transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
                      proofType === 'image'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Photo Upload (JPEG, PNG, WebP)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProofType('link');
                      setProofUrl('');
                      setImagePreview(null);
                    }}
                    className={`flex-1 min-h-[40px] py-2 text-xs font-semibold rounded-lg border transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
                      proofType === 'link'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    HTTPS Evidence Link
                  </button>
                </div>
              </div>

              {/* Image Upload Input */}
              {proofType === 'image' && (
                <div>
                  <label htmlFor="photo-file-input" className="block text-xs font-semibold text-slate-800 mb-1">
                    Upload Photo Evidence (Max 5MB)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-slate-50">
                    <input
                      id="photo-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Proof preview"
                          className="h-36 mx-auto object-contain rounded-lg border border-slate-200"
                        />
                        <p className="text-[11px] text-emerald-800 font-semibold">
                          Click to select a different image
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-4">
                        <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                        <p className="text-xs font-semibold text-slate-800">
                          Click to choose or drag &amp; drop photo
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Supports JPEG, PNG, WebP up to 5 MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Link Input */}
              {proofType === 'link' && (
                <div>
                  <label htmlFor="proof-link-input" className="block text-xs font-semibold text-slate-800 mb-1">
                    Secure HTTPS Document Link
                  </label>
                  <input
                    id="proof-link-input"
                    type="url"
                    required
                    placeholder="https://drive.google.com/... or https://..."
                    value={proofUrl}
                    onChange={e => setProofUrl(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-700 transition-all"
                  />
                  <p className="text-[11px] text-slate-600 mt-1">
                    Must start with https:// (e.g. verified volunteer sign-off certificate or portfolio)
                  </p>
                </div>
              )}

              {/* Reflection / Description */}
              <div>
                <label htmlFor="service-description-input" className="block text-xs font-semibold text-slate-800 mb-1">
                  Service Reflection &amp; Evidence Details
                </label>
                <textarea
                  id="service-description-input"
                  rows={3}
                  required
                  placeholder="Describe the activities you completed, challenges addressed, and community outcomes achieved..."
                  value={submissionDescription}
                  onChange={e => setSubmissionDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-700 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[40px] px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                >
                  {isSubmitting ? 'Verifying & Submitting...' : 'Submit to Moderation Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE REDEMPTION QR CODE MODAL */}
      {activeRedemption && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-token-title"
        >
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 text-center space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Live Single-Use Token
              </span>
              <button
                onClick={() => setActiveRedemption(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 id="active-token-title" className="text-base font-bold text-slate-900">
                {activeRedemption.shopName}
              </h3>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                {activeRedemption.offerTitle}
              </p>
              <p className="text-xs font-bold text-emerald-800 mt-1 tabular-nums font-mono">
                {activeRedemption.pointsCost} Points
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 inline-block shadow-xs">
              <QRCodeSVG
                value={activeRedemption.code}
                size={190}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold block">
                Manual Redemption Code
              </span>
              <span className="font-mono font-extrabold text-lg text-slate-900 tracking-wider">
                {activeRedemption.code}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-normal">
              Present this code to the merchant. Points will only be deducted when the shopkeeper confirms the scan.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
