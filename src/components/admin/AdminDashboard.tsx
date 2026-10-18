import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { db } from '../../lib/firebase.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';
import { 
  CivicTask, 
  TaskSubmission, 
  PartnerShop, 
  PointsLedgerEntry, 
  CivicTransaction, 
  ShopkeeperApplication,
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
  AlertCircle
} from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'queue' | 'tasks' | 'applications' | 'shops' | 'ledger'>('queue');

  // Real-time collections
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [tasks, setTasks] = useState<CivicTask[]>([]);
  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [applications, setApplications] = useState<ShopkeeperApplication[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PointsLedgerEntry[]>([]);
  const [transactions, setTransactions] = useState<CivicTransaction[]>([]);

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
      (err) => {
        console.warn('Submissions listener note:', err.message);
      }
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
      (err) => {
        console.warn('Tasks listener note:', err.message);
      }
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
      (err) => {
        console.warn('Partner shops listener note:', err.message);
      }
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
      (err) => {
        console.warn('Applications listener note:', err.message);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // 5. Points ledger listener
  useEffect(() => {
    if (!user) return;
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
      (err) => {
        console.warn('Points ledger listener note:', err.message);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // 6. Transactions listener
  useEffect(() => {
    if (!user) return;
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
      (err) => {
        console.warn('Transactions listener note:', err.message);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Handle Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingTask(true);
      await apiFetch('/api/tasks/create', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          rewardPoints: Number(newRewardPoints),
          estimatedHours: Number(newHours),
          location: newLocation,
          description: newDescription,
          submissionGuidelines: newGuidelines,
          imageUrl: newImageUrl || undefined,
        }),
      });

      success('Civic volunteer opportunity published!');
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

  // Toggle Task Status (Active / Paused)
  const handleToggleTaskStatus = async (task: CivicTask) => {
    const nextStatus = task.status === 'active' ? 'paused' : 'active';
    try {
      await apiFetch('/api/tasks/toggle-status', {
        method: 'POST',
        body: JSON.stringify({
          taskId: task.id,
          status: nextStatus,
        }),
      });
      success(`Task status updated to ${nextStatus}.`);
    } catch (err: any) {
      error(err.message || 'Failed to toggle task status.');
    }
  };

  // Handle Submission Review (Atomic Points Award)
  const handleProcessSubmission = async () => {
    if (!reviewingSubmission) return;

    try {
      setIsProcessingReview(true);
      await apiFetch('/api/submissions/review', {
        method: 'POST',
        body: JSON.stringify({
          submissionId: reviewingSubmission.id,
          status: reviewAction,
          adminNotes: reviewNotes,
        }),
      });

      if (reviewAction === 'approved') {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        success(`Submission approved! ${reviewingSubmission.rewardPoints} points credited to student wallet.`);
      } else {
        success('Submission rejected with feedback notes.');
      }

      setReviewingSubmission(null);
      setReviewNotes('');
    } catch (err: any) {
      error(err.message || 'Failed to review submission.');
    } finally {
      setIsProcessingReview(false);
    }
  };

  // Handle Merchant Application Review
  const handleProcessApplication = async (status: 'approved' | 'rejected') => {
    if (!reviewingApp) return;

    try {
      setIsProcessingApp(true);
      await apiFetch('/api/merchant/review', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: reviewingApp.id,
          status,
          adminNotes: appNotes,
        }),
      });

      if (status === 'approved') {
        success(`Merchant approved! Store created for ${reviewingApp.shopName}.`);
      } else {
        success('Application declined.');
      }

      setReviewingApp(null);
      setAppNotes('');
    } catch (err: any) {
      error(err.message || 'Failed to review application.');
    } finally {
      setIsProcessingApp(false);
    }
  };

  // Computed summary metrics
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const pendingApplications = applications.filter(a => a.status === 'pending');
  const totalPointsAwarded = ledgerEntries
    .filter(e => e.type === 'credit' && e.sourceType === 'task_reward')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalPointsRedeemed = transactions.reduce((acc, curr) => acc + (curr.pointsDeducted || 0), 0);

  return (
    <div className="space-y-8">
      
      {/* Admin KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Moderation Queue</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {pendingSubmissions.length}
            </span>
            <span className="text-xs text-amber-700 font-bold">pending review</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">Proof evidence awaiting verification</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Points Awarded</span>
            <Coins className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {totalPointsAwarded.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-800 font-bold">pts issued</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">Backed by verified volunteer service</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Local Redemptions</span>
            <Store className="w-4 h-4 text-blue-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {transactions.length}
            </span>
            <span className="text-xs text-slate-600 font-bold tabular-nums">
              ({totalPointsRedeemed.toLocaleString()} pts)
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">Discounts honored at partner shops</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Partner Shops</span>
            <ShieldAlert className="w-4 h-4 text-purple-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {shops.length}
            </span>
            <span className="text-xs text-slate-600">merchants</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {pendingApplications.length} enrollment pending
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('queue')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
              activeTab === 'queue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Queue ({pendingSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
              activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manage Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
              activeTab === 'applications' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Merchant Applications ({pendingApplications.length})
          </button>
          <button
            onClick={() => setActiveTab('shops')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
              activeTab === 'shops' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Partner Shops ({shops.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none ${
              activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Points Ledger &amp; Audit ({ledgerEntries.length})
          </button>
        </div>

        {activeTab === 'tasks' && (
          <button
            onClick={() => setIsCreatingTask(true)}
            className="min-h-[40px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Task</span>
          </button>
        )}
      </div>

      {/* TAB 1: MODERATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Pending Submissions Moderation Queue
            </h3>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              {pendingSubmissions.length} awaiting review
            </span>
          </div>

          {pendingSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">Moderation Queue is Clear!</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                All submitted volunteer proofs have been reviewed and verified. New submissions from student volunteers will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-emerald-800 block tabular-nums">
                          +{sub.rewardPoints} Points
                        </span>
                        <h4 className="text-base font-bold text-slate-900 leading-snug">
                          {sub.taskTitle}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Submitted by <strong className="text-slate-900">{sub.studentName}</strong> ({sub.studentEmail})
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                        Pending
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-800">
                      <strong className="text-slate-900 font-semibold block mb-1">Student Narrative:</strong>
                      <p className="leading-relaxed whitespace-pre-wrap">{sub.description}</p>
                    </div>

                    {/* Proof visual / link */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-600">Evidence Attached:</span>
                      {sub.proofType === 'link' ? (
                        <a
                          href={sub.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-semibold bg-blue-50/70 p-2.5 rounded-lg border border-blue-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{sub.proofUrl}</span>
                        </a>
                      ) : (
                        sub.proofUrl && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48 flex items-center justify-center">
                            <img
                              src={sub.proofUrl}
                              alt="Student proof"
                              referrerPolicy="no-referrer"
                              className="max-h-48 object-contain"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setReviewingSubmission(sub);
                        setReviewAction('rejected');
                        setReviewNotes('');
                      }}
                      className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
                    >
                      Reject Proof
                    </button>
                    <button
                      onClick={() => {
                        setReviewingSubmission(sub);
                        setReviewAction('approved');
                        setReviewNotes('Verified by administrator. Excellent civic service!');
                      }}
                      className="min-h-[40px] px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve &amp; Award +{sub.rewardPoints} Pts</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGE TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Task Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Reward</th>
                <th className="px-5 py-3">Est. Hours</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No civic tasks registered yet. Click "Publish New Task" above or use the Evaluator Quick-Start banner.
                  </td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-slate-900 max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="px-5 py-3">{task.category}</td>
                    <td className="px-5 py-3 font-bold text-emerald-800 tabular-nums font-mono">
                      +{task.rewardPoints} pts
                    </td>
                    <td className="px-5 py-3 tabular-nums font-mono">{task.estimatedHours || 2} hrs</td>
                    <td className="px-5 py-3">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          task.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="min-h-[36px] text-xs font-semibold text-slate-700 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-2 outline-none"
                      >
                        {task.status === 'active' ? 'Pause Task' : 'Activate Task'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: MERCHANT APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-2">
              <Store className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">No merchant applications received</h4>
              <p className="text-xs text-slate-500">
                When local business owners apply to partner with CivicTask, their storefront details and proposed offers will appear here for verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.map(app => (
                <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{app.shopName}</h4>
                      <p className="text-xs text-slate-600">{app.address} · {app.businessCategory}</p>
                      <p className="text-xs text-slate-700 mt-1">Applicant: <strong>{app.userName}</strong> ({app.userEmail})</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      app.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      app.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      'bg-amber-50 text-amber-900 border-amber-200'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                    <span className="font-semibold text-slate-700 block">Proposed Student Reward Offer:</span>
                    <p className="text-slate-900 font-medium">{app.proposedOffer}</p>
                    <span className="font-mono text-emerald-800 font-bold block tabular-nums">
                      Point Cost: {app.proposedPoints} pts
                    </span>
                  </div>

                  {app.status === 'pending' && (
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setReviewingApp(app);
                          setAppNotes('');
                        }}
                        className="min-h-[40px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                      >
                        Review &amp; Approve Merchant
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PARTNER SHOPS */}
      {activeTab === 'shops' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Store Name</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3">Discount Offer</th>
                <th className="px-5 py-3">Points Cost</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {shops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No partner shops enrolled yet. Use the Evaluator Quick-Start banner above to seed sample partner storefronts.
                  </td>
                </tr>
              ) : (
                shops.map(shop => (
                  <tr key={shop.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{shop.shopName}</td>
                    <td className="px-5 py-3">{shop.category || 'Local Business'}</td>
                    <td className="px-5 py-3 max-w-xs truncate text-slate-600">{shop.address}</td>
                    <td className="px-5 py-3 font-medium text-emerald-900">{shop.discountOffer}</td>
                    <td className="px-5 py-3 font-mono font-bold text-slate-900 tabular-nums">{shop.pointsCost} pts</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800">
                        {shop.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: POINTS LEDGER & AUDIT */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Points Ledger Audit Log</h3>
              <p className="text-xs text-slate-600">
                Immutable record of every credit from volunteer tasks and debit from shop redemptions
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-slate-700 tabular-nums">
              Total Records: {ledgerEntries.length}
            </div>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No transactions registered in the points ledger yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Source Type</th>
                    <th className="px-4 py-3">Idempotency Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {ledgerEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600 tabular-nums">
                        {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          entry.type === 'credit' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}>
                          {entry.type === 'credit' ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold tabular-nums ${
                        entry.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {entry.type === 'credit' ? `+${entry.amount}` : `-${entry.amount}`} pts
                      </td>
                      <td className="px-4 py-3">{entry.description}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{entry.sourceType}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500 truncate max-w-[150px]">
                        {entry.idempotencyKey}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreatingTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-title"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="create-task-title" className="text-base font-bold text-slate-900">Publish New Civic Opportunity</h3>
              <button 
                onClick={() => setIsCreatingTask(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label htmlFor="new-task-title" className="block text-xs font-semibold text-slate-800 mb-1">Task Headline</label>
                <input
                  id="new-task-title"
                  type="text"
                  required
                  placeholder="e.g. Community Tree Canopy Care & Mulching"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-task-category" className="block text-xs font-semibold text-slate-800 mb-1">Category</label>
                  <select
                    id="new-task-category"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as TaskCategory)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Environment">Environment</option>
                    <option value="Education">Education</option>
                    <option value="Food Security">Food Security</option>
                    <option value="Community Care">Community Care</option>
                    <option value="Civic Cleanup">Civic Cleanup</option>
                    <option value="Animal Welfare">Animal Welfare</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="new-task-points" className="block text-xs font-semibold text-slate-800 mb-1">Reward Points</label>
                  <input
                    id="new-task-points"
                    type="number"
                    min="1"
                    required
                    value={newRewardPoints}
                    onChange={e => setNewRewardPoints(parseInt(e.target.value) || 0)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-task-hours" className="block text-xs font-semibold text-slate-800 mb-1">Estimated Hours</label>
                  <input
                    id="new-task-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={newHours}
                    onChange={e => setNewHours(parseFloat(e.target.value) || 1)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="new-task-location" className="block text-xs font-semibold text-slate-800 mb-1">Physical Location</label>
                  <input
                    id="new-task-location"
                    type="text"
                    placeholder="e.g. Riverside Memorial Park"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-task-desc" className="block text-xs font-semibold text-slate-800 mb-1">Detailed Description</label>
                <textarea
                  id="new-task-desc"
                  rows={3}
                  required
                  placeholder="Outline the volunteer duties, expected outcomes, and community impact..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="new-task-guidelines" className="block text-xs font-semibold text-slate-800 mb-1">Evidence Guidelines</label>
                <input
                  id="new-task-guidelines"
                  type="text"
                  placeholder="e.g. Photo of finished plot with coordinator signature"
                  value={newGuidelines}
                  onChange={e => setNewGuidelines(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(false)}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="min-h-[40px] px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none disabled:opacity-60"
                >
                  {isSubmittingTask ? 'Publishing...' : 'Publish Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMISSION REVIEW MODAL */}
      {reviewingSubmission && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-submission-title"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="review-submission-title" className="text-base font-bold text-slate-900">
                {reviewAction === 'approved' ? 'Approve Evidence & Award Points' : 'Reject Submission'}
              </h3>
              <button 
                onClick={() => setReviewingSubmission(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              <p>Task: <strong className="text-slate-900">{reviewingSubmission.taskTitle}</strong></p>
              <p>Student: <strong className="text-slate-900">{reviewingSubmission.studentName}</strong></p>
              <p className="font-bold text-emerald-800 tabular-nums">Reward: +{reviewingSubmission.rewardPoints} Points</p>
            </div>

            <div>
              <label htmlFor="review-notes-input" className="block text-xs font-semibold text-slate-800 mb-1">
                {reviewAction === 'approved' ? 'Congratulatory Note (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                id="review-notes-input"
                rows={3}
                required={reviewAction === 'rejected'}
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'approved' ? 'Great work on this task!' : 'State why evidence was incomplete...'}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingSubmission(null)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessSubmission}
                disabled={isProcessingReview}
                className={`min-h-[40px] px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none disabled:opacity-60 ${
                  reviewAction === 'approved' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                }`}
              >
                {isProcessingReview
                  ? 'Executing Atomic Transaction...'
                  : reviewAction === 'approved'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MERCHANT APPLICATION REVIEW MODAL */}
      {reviewingApp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-app-title"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="review-app-title" className="text-base font-bold text-slate-900">Review Partner Merchant Application</h3>
              <button 
                onClick={() => setReviewingApp(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              <p>Store: <strong className="text-slate-900">{reviewingApp.shopName}</strong></p>
              <p>Address: {reviewingApp.address}</p>
              <p>Proposed Offer: <strong className="text-slate-900">{reviewingApp.proposedOffer} ({reviewingApp.proposedPoints} pts)</strong></p>
            </div>

            <div>
              <label htmlFor="admin-app-notes" className="block text-xs font-semibold text-slate-800 mb-1">Admin Onboarding Notes</label>
              <textarea
                id="admin-app-notes"
                rows={2}
                value={appNotes}
                onChange={e => setAppNotes(e.target.value)}
                placeholder="Welcome to CivicTask Partner Network..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleProcessApplication('rejected')}
                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 rounded-lg focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => handleProcessApplication('approved')}
                disabled={isProcessingApp}
                className="min-h-[40px] px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 outline-none disabled:opacity-60"
              >
                {isProcessingApp ? 'Provisioning Shop...' : 'Approve & Provision Store'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
