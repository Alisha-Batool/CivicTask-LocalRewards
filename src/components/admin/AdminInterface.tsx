import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { db } from '../../lib/firebase.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useRouter } from '../../context/RouterContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { 
  CivicTask, 
  TaskSubmission, 
  PartnerShop, 
  PointsLedgerEntry, 
  CivicTransaction, 
  ShopkeeperApplication,
  UserProfile,
  TaskCategory 
} from '../../lib/types.ts';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Store, 
  Coins, 
  Clock, 
  ExternalLink, 
  X, 
  AlertCircle,
  LayoutDashboard,
  FileCheck2,
  Users,
  Building2,
  Receipt,
  BarChart3,
  ScrollText,
  Settings,
  Search,
  Filter,
  Check,
  TrendingUp,
  MapPin,
  Calendar,
  LogOut,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Award
} from 'lucide-react';

interface AdminInterfaceProps {
  subRoute?: string;
}

export function AdminInterface({ subRoute = 'dashboard' }: AdminInterfaceProps) {
  const { user, profile, signOutUser } = useAuth();
  const { success, error } = useToast();
  const { path, navigate } = useRouter();

  // Primary Collections
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [tasks, setTasks] = useState<CivicTask[]>([]);
  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [applications, setApplications] = useState<ShopkeeperApplication[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PointsLedgerEntry[]>([]);
  const [transactions, setTransactions] = useState<CivicTransaction[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);

  // Task creation modal
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('Environment');
  const [newRewardPoints, setNewRewardPoints] = useState<number>(100);
  const [newHours, setNewHours] = useState<number>(2);
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGuidelines, setNewGuidelines] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Submission review modal
  const [reviewingSubmission, setReviewingSubmission] = useState<TaskSubmission | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  // Application review modal
  const [reviewingApp, setReviewingApp] = useState<ShopkeeperApplication | null>(null);
  const [appNotes, setAppNotes] = useState('');
  const [isProcessingApp, setIsProcessingApp] = useState(false);

  // Filters & searches
  const [submissionFilter, setSubmissionFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Determine active view from subRoute or path
  const activeNav = subRoute || (
    path.includes('/tasks') ? 'tasks' :
    path.includes('/reviews') ? 'reviews' :
    path.includes('/students') ? 'students' :
    path.includes('/merchants') ? 'merchants' :
    path.includes('/businesses') ? 'businesses' :
    path.includes('/redemptions') ? 'redemptions' :
    path.includes('/reports') ? 'reports' :
    path.includes('/audit') ? 'audit' :
    path.includes('/settings') ? 'settings' :
    'dashboard'
  );

  // Global escape key listener
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isCreatingTask) setIsCreatingTask(false);
      if (reviewingSubmission) setReviewingSubmission(null);
      if (reviewingApp) setReviewingApp(null);
    }
  }, [isCreatingTask, reviewingSubmission, reviewingApp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 1. Submissions listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, 'submissions'),
      (snapshot) => {
        const list: TaskSubmission[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as TaskSubmission);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(list);
      },
      (err) => console.warn('Submissions listener:', err)
    );
    return () => unsubscribe();
  }, [user]);

  // 2. Tasks listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const list: CivicTask[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CivicTask);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTasks(list);
      },
      (err) => console.warn('Tasks listener:', err)
    );
    return () => unsubscribe();
  }, []);

  // 3. Partner shops listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'partnerShops'),
      (snapshot) => {
        const list: PartnerShop[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as PartnerShop);
        });
        setShops(list);
      },
      (err) => console.warn('Shops listener:', err)
    );
    return () => unsubscribe();
  }, []);

  // 4. Shopkeeper applications listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, 'shopkeeperApplications'),
      (snapshot) => {
        const list: ShopkeeperApplication[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as ShopkeeperApplication);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setApplications(list);
      },
      (err) => console.warn('Applications listener:', err)
    );
    return () => unsubscribe();
  }, [user]);

  // 5. Points ledger listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pointsLedger'),
      (snapshot) => {
        const list: PointsLedgerEntry[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as PointsLedgerEntry);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLedgerEntries(list);
      },
      (err) => console.warn('Ledger listener:', err)
    );
    return () => unsubscribe();
  }, []);

  // 6. Transactions listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        const list: CivicTransaction[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CivicTransaction);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(list);
      },
      (err) => console.warn('Transactions listener:', err)
    );
    return () => unsubscribe();
  }, []);

  // 7. Students (Users with role student)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          if (data.role === 'student' || !data.role) {
            list.push({ ...data, uid: doc.id });
          }
        });
        setStudents(list);
      },
      (err) => console.warn('Users listener:', err)
    );
    return () => unsubscribe();
  }, [user]);

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      error('Please complete title and description.');
      return;
    }

    try {
      setIsSubmittingTask(true);
      await apiFetch('/api/tasks/create', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          rewardPoints: Number(newRewardPoints),
          estimatedHours: Number(newHours),
          location: newLocation.trim() || undefined,
          description: newDescription.trim(),
          submissionGuidelines: newGuidelines.trim() || undefined,
          imageUrl: newImageUrl.trim() || undefined,
        }),
      });

      success('New community service task published!');
      setIsCreatingTask(false);
      setNewTitle('');
      setNewDescription('');
      setNewGuidelines('');
      setNewLocation('');
      setNewImageUrl('');
    } catch (err: any) {
      error(err.message || 'Failed to create task.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await apiFetch('/api/tasks/toggle-status', {
        method: 'POST',
        body: JSON.stringify({ taskId, status: nextStatus }),
      });
      success(`Task status updated to ${nextStatus}.`);
    } catch (err: any) {
      error(err.message || 'Failed to update task status.');
    }
  };

  const handleProcessReview = async () => {
    if (!reviewingSubmission) return;
    if (reviewAction === 'rejected' && !reviewNotes.trim()) {
      error('Rejection requires feedback so the student can correct their submission.');
      return;
    }

    try {
      setIsProcessingReview(true);
      const res = await apiFetch<{ success: boolean; result: any }>('/api/submissions/review', {
        method: 'POST',
        body: JSON.stringify({
          submissionId: reviewingSubmission.id,
          status: reviewAction,
          adminNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (res?.success) {
        if (reviewAction === 'approved') {
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
          success(`Submission approved! ${reviewingSubmission.rewardPoints} points credited to student.`);
        } else {
          success('Submission rejected with feedback explanation.');
        }
        setReviewingSubmission(null);
        setReviewNotes('');
      }
    } catch (err: any) {
      error(err.message || 'Failed to resolve submission review.');
    } finally {
      setIsProcessingReview(false);
    }
  };

  const handleReviewMerchantApp = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      setIsProcessingApp(true);
      await apiFetch('/api/merchant/review', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: appId,
          status,
          adminNotes: appNotes.trim() || undefined,
        }),
      });

      success(`Merchant application ${status === 'approved' ? 'approved & store created' : 'declined'}.`);
      setReviewingApp(null);
      setAppNotes('');
    } catch (err: any) {
      error(err.message || 'Failed to review application.');
    } finally {
      setIsProcessingApp(false);
    }
  };

  // Metrics for Admin Dashboard
  const totalRegisteredStudents = students.length || 1;
  const activeMerchantsCount = shops.filter(s => s.status === 'active').length;
  const availableTasksCount = tasks.filter(t => t.status === 'active').length;
  const pendingSubmissionsCount = submissions.filter(s => s.status === 'pending').length;
  const approvedSubmissionsCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedSubmissionsCount = submissions.filter(s => s.status === 'rejected').length;
  const totalPointsAwarded = ledgerEntries
    .filter(e => e.type === 'credit')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const successfulRedemptionsCount = transactions.length;

  // Navigation Items
  const adminNavItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, href: '/admin/dashboard' },
    { id: 'tasks', label: 'Task Management', icon: FileCheck2, href: '/admin/tasks' },
    { id: 'reviews', label: 'Submission Reviews', icon: ShieldCheck, href: '/admin/reviews', badge: pendingSubmissionsCount },
    { id: 'students', label: 'Student Management', icon: Users, href: '/admin/students' },
    { id: 'merchants', label: 'Merchant Management', icon: Building2, href: '/admin/merchants', badge: applications.filter(a => a.status === 'pending').length },
    { id: 'businesses', label: 'Business & Offer Oversight', icon: Store, href: '/admin/businesses' },
    { id: 'redemptions', label: 'Redemptions', icon: Receipt, href: '/admin/redemptions' },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, href: '/admin/reports' },
    { id: 'audit', label: 'Audit Logs', icon: ScrollText, href: '/admin/audit' },
    { id: 'settings', label: 'Platform Settings', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <div className="space-y-6">

      {/* Admin Top Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Civic Administration &amp; Moderation Panel</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Authoritative Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Signed in: {user?.email} · Immutable ledger enforcement &amp; atomic reward audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatingTask(true)}
            className="min-h-[40px] px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Task</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Admin control navigation">
          {adminNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-purple-600 outline-none ${
                  isActive
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-200' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="font-mono text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* VIEW 1: OVERVIEW (DASHBOARD) */}
      {activeNav === 'dashboard' && (
        <div className="space-y-6">

          {/* 8 Primary Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Registered Students
              </span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums block">
                {totalRegisteredStudents}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Active civic profiles</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Active Merchants
              </span>
              <span className="text-2xl font-extrabold text-blue-700 font-mono tabular-nums block">
                {activeMerchantsCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Neighborhood storefronts</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Available Tasks
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums block">
                {availableTasksCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Open for submission</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Pending Submissions
              </span>
              <span className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums block">
                {pendingSubmissionsCount}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold mt-1 block">Requires review</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Approved Submissions
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums block">
                {approvedSubmissionsCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Points credited</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Rejected Submissions
              </span>
              <span className="text-2xl font-extrabold text-rose-600 font-mono tabular-nums block">
                {rejectedSubmissionsCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Feedback given</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Points Awarded
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-purple-700 font-mono tabular-nums">
                  {totalPointsAwarded.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">pts</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Minted via verified service</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Reward Redemptions
              </span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums block">
                {successfulRedemptionsCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Completed at stores</span>
            </div>
          </div>

          {/* Quick Review Callout if pending submissions */}
          {pendingSubmissionsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                <span className="text-xs text-amber-900 font-semibold">
                  You have <strong>{pendingSubmissionsCount}</strong> volunteer task submissions waiting for review and point crediting.
                </span>
              </div>
              <button
                onClick={() => navigate('/admin/reviews')}
                className="min-h-[36px] px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0"
              >
                Go to Review Queue &rarr;
              </button>
            </div>
          )}

          {/* 2-Column Split: Recent Activity & Pending Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Recent Activity Feed */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-purple-700" />
                  <span>Recent Administrative Activity</span>
                </h3>
                <button
                  onClick={() => navigate('/admin/audit')}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-800"
                >
                  Full Audit Log &rarr;
                </button>
              </div>

              {ledgerEntries.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No audit entries recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {ledgerEntries.slice(0, 5).map(entry => (
                    <div
                      key={entry.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block truncate max-w-xs">{entry.description}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(entry.createdAt).toLocaleString()} · ID: {entry.id.slice(0, 14)}
                        </span>
                      </div>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        entry.type === 'credit' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                      }`}>
                        {entry.type === 'credit' ? `+${entry.amount} pts` : `-${entry.amount} pts`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Quick Pending Merchant Applications */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Pending Merchant Applications</span>
                </h3>
                <button
                  onClick={() => navigate('/admin/merchants')}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-800"
                >
                  Manage All &rarr;
                </button>
              </div>

              {applications.filter(a => a.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No merchant applications currently waiting for review.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {applications.filter(a => a.status === 'pending').slice(0, 3).map(app => (
                    <div
                      key={app.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{app.shopName}</span>
                        <span className="text-[11px] text-slate-500">{app.businessCategory} · {app.userEmail}</span>
                      </div>
                      <button
                        onClick={() => {
                          setReviewingApp(app);
                          navigate('/admin/merchants');
                        }}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs rounded-lg"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: TASK MANAGEMENT */}
      {activeNav === 'tasks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Civic Task Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define verified service initiatives, point awards, evidence guidelines, and lifecycle status
              </p>
            </div>
            <button
              onClick={() => setIsCreatingTask(true)}
              className="min-h-[40px] px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Task</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Task Title &amp; Category</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Estimated Hours</th>
                    <th className="py-3 px-4">Point Award</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{task.title}</span>
                        <span className="text-[11px] text-purple-700 font-semibold">{task.category}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{task.location || 'Anywhere in municipality'}</td>
                      <td className="py-3 px-4 font-mono">{task.estimatedHours || 2} hrs</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-700 tabular-nums">
                        +{task.rewardPoints} pts
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          task.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          task.status === 'paused' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {task.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors"
                        >
                          {task.status === 'active' ? 'Pause' : 'Activate'}
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

      {/* VIEW 3: SUBMISSION REVIEWS */}
      {activeNav === 'reviews' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Task Submission Reviews</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit student photographic proof and reflections. Approvals atomically credit verified points to ledger.
              </p>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSubmissionFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    submissionFilter === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {submissions.filter(s => submissionFilter === 'all' || s.status === submissionFilter).length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No submissions found for filter "{submissionFilter}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Task Initiative</th>
                      <th className="py-3 px-4">Proof Type</th>
                      <th className="py-3 px-4">Points</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions
                      .filter(s => submissionFilter === 'all' || s.status === submissionFilter)
                      .map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{sub.studentName}</span>
                            <span className="text-[11px] text-slate-500">{sub.studentEmail}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-semibold">{sub.taskTitle}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                              {sub.proofType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-purple-700 tabular-nums">
                            +{sub.rewardPoints} pts
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              sub.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              sub.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {sub.status === 'pending' ? (
                              <button
                                onClick={() => {
                                  setReviewingSubmission(sub);
                                  setReviewAction('approved');
                                  setReviewNotes('');
                                }}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition-colors"
                              >
                                Review Proof
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setReviewingSubmission(sub);
                                  setReviewAction(sub.status === 'approved' ? 'approved' : 'rejected');
                                  setReviewNotes(sub.adminNotes || '');
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
                              >
                                Inspect
                              </button>
                            )}
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

      {/* VIEW 4: STUDENT MANAGEMENT */}
      {activeNav === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Student Directory &amp; Wallets</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect registered student accounts, verified hours, points balances, and service standing
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Points Balance</th>
                    <th className="py-3 px-4">Verified Submissions</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter(s => {
                      if (!studentSearch) return true;
                      const q = studentSearch.toLowerCase();
                      return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
                    })
                    .map(st => {
                      const studentSubs = submissions.filter(sub => sub.userId === st.uid && sub.status === 'approved');
                      return (
                        <tr key={st.uid} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{st.name || 'Student'}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono">{st.email}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700 tabular-nums">
                            {st.pointsBalance || 0} pts
                          </td>
                          <td className="py-3 px-4 font-mono">{studentSubs.length} approved</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {st.accountStatus || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {new Date(st.createdAt || Date.now()).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: MERCHANT MANAGEMENT */}
      {activeNav === 'merchants' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Merchant Enrollment &amp; Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve merchant applications. Approvals automatically grant shopkeeper role and create storefront.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Business Name</th>
                    <th className="py-3 px-4">Applicant Email</th>
                    <th className="py-3 px-4">Category &amp; Address</th>
                    <th className="py-3 px-4">Proposed Offer</th>
                    <th className="py-3 px-4">Points</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{app.shopName}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{app.userEmail}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <span>{app.businessCategory}</span> · <span className="text-[11px] text-slate-500">{app.address}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">{app.proposedOffer}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{app.proposedPoints} pts</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          app.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          app.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {app.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {app.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReviewMerchantApp(app.id, 'approved')}
                              disabled={isProcessingApp}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewMerchantApp(app.id, 'rejected')}
                              disabled={isProcessingApp}
                              className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 6: BUSINESS & OFFER OVERSIGHT */}
      {activeNav === 'businesses' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Platform-Wide Business &amp; Offer Oversight</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect all partner shops active across the municipality, reward pricing, and owner associations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map(shop => (
              <div key={shop.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                      {shop.category || 'Local Merchant'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{shop.shopName}</h3>
                    <p className="text-xs text-slate-500">{shop.address}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    shop.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {shop.status.toUpperCase()}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <span className="text-slate-500 block">Current Offer:</span>
                  <p className="font-bold text-slate-900">{shop.discountOffer}</p>
                  <span className="font-mono text-purple-700 font-bold block">Cost: {shop.pointsCost} pts</span>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Owner UID: {shop.ownerId.slice(0, 16)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 7: REDEMPTIONS */}
      {activeNav === 'redemptions' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Platform Redemptions &amp; POS Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditable transaction logs across all participating storefronts with immutable timestamps
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No redemption transactions recorded on the platform yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Merchant Shop</th>
                      <th className="py-3 px-4">Offer Redeemed</th>
                      <th className="py-3 px-4">Points Debited</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{tx.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{tx.studentName || 'Student'}</td>
                        <td className="py-3 px-4 text-slate-700">{tx.shopName}</td>
                        <td className="py-3 px-4 text-slate-800">{tx.offerTitle}</td>
                        <td className="py-3 px-4 font-mono font-bold text-purple-700 tabular-nums">
                          -{tx.pointsDeducted} pts
                        </td>
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

      {/* VIEW 8: REPORTS & ANALYTICS */}
      {activeNav === 'reports' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Civic Analytics &amp; Impact Reports</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Service category breakdown, volunteer velocity, and points economy velocity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Service Hours by Category</h3>
              
              <div className="space-y-3">
                {['Environment', 'Education', 'Food Security', 'Civic Cleanup', 'Community Care'].map((cat, idx) => {
                  const count = tasks.filter(t => t.category === cat).length;
                  const pct = Math.round((count / Math.max(1, tasks.length)) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">{cat}</span>
                        <span className="text-slate-500 font-mono">{pct}% ({count} initiatives)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Points Economy Velocity</h3>
              
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-500 font-semibold block">Total Points Minted (Volunteer Service)</span>
                  <span className="text-2xl font-bold font-mono text-emerald-700">+{totalPointsAwarded} pts</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-500 font-semibold block">Total Points Burned (Merchant Redemptions)</span>
                  <span className="text-2xl font-bold font-mono text-purple-700">
                    -{transactions.reduce((acc, t) => acc + (t.pointsDeducted || 0), 0)} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 9: AUDIT LOGS */}
      {activeNav === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Platform Audit Logs &amp; Immutable Ledger</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every sensitive point credit, debit, and administrative action recorded with actor UID and cryptographic idempotency key
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Actor UID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Idempotency Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerEntries
                    .filter(e => {
                      if (!auditSearch) return true;
                      const q = auditSearch.toLowerCase();
                      return e.description.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
                    })
                    .map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{entry.id.slice(0, 16)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            entry.type === 'credit' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{entry.description}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {entry.type === 'credit' ? `+${entry.amount}` : `-${entry.amount}`}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{entry.actorId.slice(0, 14)}...</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[10px] truncate max-w-[140px]">
                          {entry.idempotencyKey}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 10: PLATFORM SETTINGS */}
      {activeNav === 'settings' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Platform Settings &amp; Security State</h2>
            <p className="text-xs text-slate-500">Administrative authority controls and database seeding</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block">Security Invariant Architecture</span>
              <p className="text-slate-600 leading-relaxed">
                Points crediting, submissions moderation, and merchant reward redemption are enforced via atomic transactions on the server. Client applications cannot mutate points balances or bypass authorization.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-700 block">Authoritative Admin Account</span>
              <span className="font-mono text-slate-900 font-bold block">{user?.email}</span>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={signOutUser}
                className="w-full min-h-[44px] px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Admin Panel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE TASK */}
      {isCreatingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Publish Civic Service Initiative</h3>
              <button
                onClick={() => setIsCreatingTask(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Riverfront Microplastic Clean-up"
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as TaskCategory)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="Environment">Environment</option>
                    <option value="Education">Education</option>
                    <option value="Food Security">Food Security</option>
                    <option value="Civic Cleanup">Civic Cleanup</option>
                    <option value="Community Care">Community Care</option>
                    <option value="Animal Welfare">Animal Welfare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reward Points</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={1000}
                    value={newRewardPoints}
                    onChange={e => setNewRewardPoints(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    max={20}
                    value={newHours}
                    onChange={e => setNewHours(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    placeholder="e.g. Westside Green Trailhead"
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description &amp; Purpose</label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Explain why this initiative matters to the community..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Evidence Submission Guidelines</label>
                <textarea
                  rows={2}
                  value={newGuidelines}
                  onChange={e => setNewGuidelines(e.target.value)}
                  placeholder="e.g. Submit a photo of completed plot with volunteer sign-off..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(false)}
                  className="min-h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="min-h-[40px] px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-60"
                >
                  {isSubmittingTask ? 'Publishing...' : 'Publish Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REVIEW SUBMISSION */}
      {reviewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inspect Proof of Service</h3>
                <p className="text-xs text-slate-500">{reviewingSubmission.taskTitle}</p>
              </div>
              <button
                onClick={() => setReviewingSubmission(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block">Student Volunteer</span>
                <span className="font-bold text-slate-900 text-sm block">{reviewingSubmission.studentName}</span>
                <span className="font-mono text-slate-500">{reviewingSubmission.studentEmail}</span>
              </div>

              {/* Proof Preview */}
              {reviewingSubmission.proofType === 'image' && reviewingSubmission.proofUrl && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 block">Submitted Photo Evidence:</span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-60 flex items-center justify-center">
                    <img
                      src={reviewingSubmission.proofUrl}
                      alt="Student Proof"
                      className="max-h-60 w-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {reviewingSubmission.proofType === 'link' && reviewingSubmission.proofUrl && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-mono text-slate-700 truncate max-w-xs">{reviewingSubmission.proofUrl}</span>
                  <a
                    href={reviewingSubmission.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-700 font-bold hover:underline"
                  >
                    Open Link &rarr;
                  </a>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Student Description / Reflection:</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                  {reviewingSubmission.description}
                </p>
              </div>

              {/* Review Actions if pending */}
              {reviewingSubmission.status === 'pending' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction('approved')}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                        reviewAction === 'approved'
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Approve &amp; Award {reviewingSubmission.rewardPoints} pts
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('rejected')}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                        reviewAction === 'rejected'
                          ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Reject Submission
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {reviewAction === 'rejected' ? 'Required Rejection Reason / Guidance *' : 'Optional Commendation Note'}
                    </label>
                    <textarea
                      rows={2}
                      required={reviewAction === 'rejected'}
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      placeholder={
                        reviewAction === 'rejected'
                          ? 'Explain what was missing or why proof could not be verified...'
                          : 'Great effort on behalf of the neighborhood!'
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>
              )}

              {/* Resolution details if already resolved */}
              {reviewingSubmission.status !== 'pending' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-700">Administrator Resolution Note:</span>
                  <p className="text-slate-800">{reviewingSubmission.adminNotes || 'No notes attached.'}</p>
                  <span className="text-[11px] text-slate-400 font-mono block">
                    Reviewed by: {reviewingSubmission.reviewedBy || 'Admin'}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewingSubmission(null)}
                className="min-h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
              {reviewingSubmission.status === 'pending' && (
                <button
                  type="button"
                  disabled={isProcessingReview}
                  onClick={handleProcessReview}
                  className={`min-h-[40px] px-5 py-2 font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-60 text-white ${
                    reviewAction === 'approved' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {isProcessingReview ? 'Resolving...' : reviewAction === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
