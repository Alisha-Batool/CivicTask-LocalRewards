import type {
  CivicTransaction,
  PartnerShop,
  PointsLedgerEntry,
  ShopkeeperApplication,
  UserProfile,
  UserRole,
} from './types.ts';

type DemoCollectionName =
  | 'tasks'
  | 'submissions'
  | 'partnerShops'
  | 'pointsLedger'
  | 'transactions'
  | 'redemptionSessions'
  | 'shopkeeperApplications'
  | 'users';

type DemoRecord = Record<string, unknown> & { id: string };
type DemoStore = Record<DemoCollectionName, DemoRecord[]>;

export interface DemoDocument {
  id: string;
  data: () => Record<string, unknown>;
}

export interface DemoSnapshot {
  forEach: (callback: (document: DemoDocument) => void) => void;
}

const STORAGE_KEY = 'civictask-demo-data-v1';
export const DEMO_ROLE_STORAGE_KEY = 'civictask-demo-role';
const CHANGE_EVENT = 'civictask-demo-data-changed';

const timestamp = new Date().toISOString();

const initialStore: DemoStore = {
  users: [
    {
      id: 'demo_student',
      uid: 'demo_student',
      name: 'Jordan Lee',
      email: 'jordan.lee@example.test',
      role: 'student',
      pointsBalance: 240,
      accountStatus: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo_shopkeeper',
      uid: 'demo_shopkeeper',
      name: 'Taylor Morgan',
      email: 'taylor.morgan@example.test',
      role: 'shopkeeper',
      pointsBalance: 0,
      accountStatus: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo_admin',
      uid: 'demo_admin',
      name: 'Alex Rivera',
      email: 'alex.rivera@example.test',
      role: 'admin',
      pointsBalance: 0,
      accountStatus: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  tasks: [
    {
      id: 'demo_task_garden',
      title: 'Community Garden Care',
      description: 'Help prepare planting beds and care for the neighborhood garden.',
      category: 'Environment',
      rewardPoints: 100,
      status: 'active',
      location: 'Riverside Community Garden',
      estimatedHours: 2,
      submissionGuidelines: 'Share a short description and a photo of your work.',
      createdBy: 'demo_admin',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo_task_tutoring',
      title: 'Library Reading Buddies',
      description: 'Support younger learners with a friendly reading session.',
      category: 'Education',
      rewardPoints: 80,
      status: 'active',
      location: 'Central Library',
      estimatedHours: 1,
      submissionGuidelines: 'Include the session date and a brief reflection.',
      createdBy: 'demo_admin',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo_task_pantry',
      title: 'Food Pantry Sorting',
      description: 'Sort donated groceries and prepare community food parcels.',
      category: 'Food Security',
      rewardPoints: 70,
      status: 'active',
      location: 'Westside Community Pantry',
      estimatedHours: 2,
      submissionGuidelines: 'Describe the shift you completed.',
      createdBy: 'demo_admin',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  submissions: [
    {
      id: 'demo_submission_pending',
      userId: 'demo_student',
      studentName: 'Jordan Lee',
      studentEmail: 'jordan.lee@example.test',
      taskId: 'demo_task_garden',
      taskTitle: 'Community Garden Care',
      rewardPoints: 100,
      proofType: 'link',
      proofUrl: 'https://example.test/garden-work',
      description: 'Prepared two planting beds with the volunteer team.',
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  partnerShops: [
    {
      id: 'demo_shop_market',
      shopName: 'Green Market',
      ownerId: 'demo_shopkeeper',
      ownerEmail: 'taylor.morgan@example.test',
      category: 'Grocery',
      address: '24 Market Street',
      description: 'Neighborhood produce and pantry essentials.',
      discountOffer: '10% off fresh produce',
      pointsCost: 60,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo_shop_cafe',
      shopName: 'Common Grounds Cafe',
      ownerId: 'demo_shopkeeper',
      ownerEmail: 'taylor.morgan@example.test',
      category: 'Cafe & Bakery',
      address: '8 Library Lane',
      description: 'Locally roasted coffee and baked goods.',
      discountOffer: 'Free pastry with a drink',
      pointsCost: 80,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  pointsLedger: [
    {
      id: 'demo_ledger_earned',
      userId: 'demo_student',
      type: 'credit',
      amount: 240,
      sourceType: 'task_reward',
      sourceId: 'demo_task_past',
      description: 'Points earned from community volunteering',
      idempotencyKey: 'demo_ledger_earned',
      createdAt: timestamp,
      actorId: 'demo_admin',
    },
  ],
  transactions: [],
  redemptionSessions: [],
  shopkeeperApplications: [
    {
      id: 'demo_application_pending',
      userId: 'demo_student',
      userName: 'Jordan Lee',
      userEmail: 'jordan.lee@example.test',
      shopName: 'Student Sample Bakery',
      businessCategory: 'Cafe & Bakery',
      address: '12 Campus Way',
      description: 'A sample application awaiting review.',
      proposedOffer: '10% off',
      proposedPoints: 50,
      status: 'pending',
      createdAt: timestamp,
    },
  ],
};

function readStore(): DemoStore {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    writeStore(initialStore);
    return initialStore;
  }

  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Stored demo data is invalid. Clear CivicTask demo data and reload.');
  }
  return parsed as DemoStore;
}

function writeStore(store: DemoStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function demoProfile(role: UserRole): UserProfile {
  const user = readStore().users.find((entry) => entry.role === role);
  if (!user) {
    throw new Error(`No demo profile is configured for the ${role} role.`);
  }
  return user as unknown as UserProfile;
}

export function subscribeDemoCollection(
  name: DemoCollectionName,
  filters: Record<string, unknown>,
  callback: (snapshot: DemoSnapshot) => void,
): () => void {
  const notify = () => {
    const records = readStore()[name].filter((record) =>
      Object.entries(filters).every(([key, value]) => record[key] === value),
    );
    callback({
      forEach: (visit) => records.forEach((record) => visit({
        id: record.id,
        data: () => {
          const { id: _id, ...data } = record;
          return data;
        },
      })),
    });
  };
  window.addEventListener(CHANGE_EVENT, notify);
  notify();
  return () => window.removeEventListener(CHANGE_EVENT, notify);
}

function requireDemoRole(role: UserRole, allowed: UserRole[]): void {
  if (!allowed.includes(role)) {
    throw new Error(`This action is unavailable for the ${role} profile.`);
  }
}

export function runDemoApi(endpoint: string, options: RequestInit): unknown {
  const role = (window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY) || 'student') as UserRole;
  const profile = demoProfile(role);
  const rawBody = typeof options.body === 'string' ? options.body : '{}';
  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const store = readStore();
  const now = new Date().toISOString();
  const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (endpoint === '/api/tasks/create') {
    requireDemoRole(role, ['admin']);
    const task = {
      id: id('demo_task'),
      ...body,
      status: 'active',
      createdBy: profile.uid,
      createdAt: now,
      updatedAt: now,
    } as DemoRecord;
    store.tasks.push(task);
    writeStore(store);
    return { task };
  }
  if (endpoint === '/api/tasks/toggle-status') {
    requireDemoRole(role, ['admin']);
    store.tasks = store.tasks.map((task) => task.id === body.taskId
      ? { ...task, status: body.status, updatedAt: now }
      : task);
    writeStore(store);
    return { success: true };
  }
  if (endpoint === '/api/submissions/create') {
    requireDemoRole(role, ['student']);
    const task = store.tasks.find((item) => item.id === body.taskId);
    if (!task || task.status !== 'active') throw new Error('This task is not currently accepting submissions.');
    const duplicate = store.submissions.some((item) =>
      item.userId === profile.uid && item.taskId === task.id && item.status === 'pending',
    );
    if (duplicate) throw new Error('You already have a pending submission for this task.');
    const submission = {
      id: id('demo_submission'),
      userId: profile.uid,
      studentName: profile.name,
      studentEmail: profile.email,
      taskId: task.id,
      taskTitle: task.title,
      rewardPoints: task.rewardPoints,
      ...body,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    } as DemoRecord;
    store.submissions.push(submission);
    writeStore(store);
    return { submission };
  }
  if (endpoint === '/api/submissions/review') {
    requireDemoRole(role, ['admin']);
    const submission = store.submissions.find((item) => item.id === body.submissionId);
    if (!submission || submission.status !== 'pending') throw new Error('Submission is no longer pending.');
    submission.status = body.status;
    submission.adminNotes = body.adminNotes || '';
    submission.reviewedBy = profile.email;
    submission.reviewedAt = now;
    let result: Record<string, unknown> = { submissionId: submission.id, status: body.status };
    if (body.status === 'approved') {
      const student = store.users.find((item) => item.id === submission.userId);
      if (!student) throw new Error('Student demo profile was not found.');
      const rewardPoints = Number(submission.rewardPoints || 0);
      student.pointsBalance = Number(student.pointsBalance || 0) + rewardPoints;
      student.updatedAt = now;
      const ledger: PointsLedgerEntry = {
        id: id('demo_ledger'),
        userId: String(submission.userId),
        type: 'credit',
        amount: rewardPoints,
        sourceType: 'task_reward',
        sourceId: String(submission.id),
        description: `Approved: ${String(submission.taskTitle)}`,
        idempotencyKey: id('demo_review'),
        createdAt: now,
        actorId: profile.uid,
      };
      store.pointsLedger.push(ledger as unknown as DemoRecord);
      result = { ...result, pointsAwarded: rewardPoints, newBalance: student.pointsBalance };
    }
    writeStore(store);
    return { success: true, result };
  }
  if (endpoint === '/api/merchant/apply') {
    requireDemoRole(role, ['student']);
    const application: ShopkeeperApplication = {
      id: id('demo_application'),
      userId: profile.uid,
      userName: profile.name,
      userEmail: profile.email,
      shopName: String(body.shopName || ''),
      businessCategory: String(body.businessCategory || ''),
      address: String(body.address || ''),
      description: String(body.description || ''),
      proposedOffer: String(body.proposedOffer || ''),
      proposedPoints: Number(body.proposedPoints || 0),
      status: 'pending',
      createdAt: now,
    };
    store.shopkeeperApplications.push(application as unknown as DemoRecord);
    writeStore(store);
    return { application };
  }
  if (endpoint === '/api/merchant/review') {
    requireDemoRole(role, ['admin']);
    const application = store.shopkeeperApplications.find((item) => item.id === body.applicationId);
    if (!application || application.status !== 'pending') throw new Error('Application is not pending review.');
    application.status = body.status;
    application.adminNotes = body.adminNotes || '';
    application.reviewedBy = profile.email;
    application.reviewedAt = now;
    if (body.status === 'approved') {
      const owner = store.users.find((item) => item.role === 'shopkeeper');
      if (!owner) throw new Error('Shopkeeper demo profile was not found.');
      const shop: PartnerShop = {
        id: id('demo_shop'),
        shopName: String(application.shopName || ''),
        ownerId: String(owner.uid),
        ownerEmail: String(owner.email || ''),
        category: String(application.businessCategory || ''),
        address: String(application.address || ''),
        description: String(application.description || ''),
        discountOffer: String(application.proposedOffer || ''),
        pointsCost: Number(application.proposedPoints || 0),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      store.partnerShops.push(shop as unknown as DemoRecord);
    }
    writeStore(store);
    return { success: true };
  }
  if (endpoint === '/api/merchant/update') {
    requireDemoRole(role, ['shopkeeper', 'admin']);
    const shop = store.partnerShops.find((item) => item.id === body.shopId);
    if (!shop) throw new Error('Storefront was not found.');
    Object.assign(shop, body, { updatedAt: now });
    writeStore(store);
    return { success: true, shop };
  }
  if (endpoint === '/api/redemption/create') {
    requireDemoRole(role, ['student']);
    const shop = store.partnerShops.find((item) => item.id === body.shopId && item.status === 'active');
    if (!shop) throw new Error('The selected offer is no longer available.');
    const cost = Number(shop.pointsCost || 0);
    if (Number(profile.pointsBalance) < cost) throw new Error('Insufficient points balance.');
    const sessionId = id('demo_redemption');
    const code = `CT-${Math.random().toString(36).slice(2, 5).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const session = {
      id: sessionId,
      studentId: profile.uid,
      studentName: profile.name,
      shopId: shop.id,
      shopName: shop.shopName,
      offerId: shop.id,
      offerTitle: shop.discountOffer,
      pointsCost: cost,
      code,
      status: 'active',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: now,
    } as DemoRecord;
    store.redemptionSessions.push(session);
    writeStore(store);
    return { session };
  }
  if (endpoint === '/api/redemption/validate') {
    requireDemoRole(role, ['shopkeeper', 'admin']);
    const code = String(body.code || '').trim().toUpperCase();
    const session = store.redemptionSessions.find((item) => item.status === 'active' && item.code === code);
    if (!session) throw new Error('Invalid or expired redemption code.');
    const student = store.users.find((item) => item.id === session.studentId);
    return {
      valid: true,
      session: {
        ...session,
        studentBalance: Number(student?.pointsBalance || 0),
      },
    };
  }
  if (endpoint === '/api/redemption/confirm') {
    requireDemoRole(role, ['shopkeeper', 'admin']);
    const session = store.redemptionSessions.find((item) => item.id === body.sessionId && item.status === 'active');
    if (!session) throw new Error('Redemption session is no longer active.');
    const student = store.users.find((item) => item.id === session.studentId);
    if (!student) throw new Error('Student demo profile was not found.');
    const cost = Number(session.pointsCost || 0);
    if (Number(student.pointsBalance || 0) < cost) throw new Error('Insufficient student points.');
    student.pointsBalance = Number(student.pointsBalance) - cost;
    student.updatedAt = now;
    session.status = 'redeemed';
    session.redeemedAt = now;
    const transaction: CivicTransaction = {
      id: id('demo_transaction'),
      studentId: String(session.studentId),
      studentName: String(session.studentName),
      studentEmail: String(student.email || ''),
      shopId: String(session.shopId),
      shopName: String(session.shopName),
      offerId: String(session.offerId),
      offerTitle: String(session.offerTitle),
      pointsDeducted: cost,
      redemptionSessionId: String(session.id),
      status: 'completed',
      timestamp: now,
      idempotencyKey: id('demo_redeem'),
    };
    store.transactions.push(transaction as unknown as DemoRecord);
    store.pointsLedger.push({
      id: id('demo_ledger'),
      userId: String(session.studentId),
      type: 'debit',
      amount: cost,
      sourceType: 'shop_redemption',
      sourceId: transaction.id,
      description: `Redeemed ${cost} points at ${transaction.shopName}`,
      idempotencyKey: id('demo_redeem_ledger'),
      createdAt: now,
      actorId: profile.uid,
    } as unknown as DemoRecord);
    writeStore(store);
    return {
      success: true,
      details: {
        transactionId: transaction.id,
        pointsDeducted: cost,
        remainingBalance: student.pointsBalance,
        shopName: transaction.shopName,
        offerTitle: transaction.offerTitle,
        studentName: transaction.studentName,
      },
    };
  }
  if (endpoint === '/api/seed') {
    requireDemoRole(role, ['admin']);
    return { success: true, message: 'Sample civic tasks and partner storefronts are ready.', tasksCount: store.tasks.length, shopsCount: store.partnerShops.length };
  }
  if (endpoint === '/api/ai/match-tasks') {
    const matches = store.tasks.filter((task) => task.status === 'active').slice(0, 3).map((task) => ({
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      rewardPoints: task.rewardPoints,
      estimatedHours: task.estimatedHours,
      location: task.location,
      matchScore: 90,
      matchReason: 'This opportunity is a strong fit for your interests and available time.',
      keySkillOverlap: [],
    }));
    return {
      success: true,
      model: 'CivicTask',
      student: {
        name: profile.name,
        interests: body.interests || [],
        skills: body.skills || [],
        availableHoursPerWeek: body.availableHoursPerWeek || 0,
      },
      totalCandidatesEvaluated: store.tasks.length,
      matches,
      summary: 'Here are some active community opportunities to explore.',
    };
  }
  if (endpoint === '/api/ai/chat') {
    // Demo mode has no local LLM runtime. Never fabricate an AI reply here;
    // surface an explicit error so callers cannot mistake a mock for a real answer.
    throw new Error(
      'The CivicTask AI Assistant is unavailable in demo mode. Set VITE_DEMO_MODE=false and run the local Ollama service (ollama run qwen2.5:3b-instruct) to enable authentic AI chat.',
    );
  }

  throw new Error(`Demo mode does not support ${endpoint}.`);
}

export function updateDemoProfile(patch: Partial<UserProfile>): void {
  const role = (window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY) || 'student') as UserRole;
  const store = readStore();
  const user = store.users.find((entry) => entry.role === role);
  if (!user) throw new Error(`No demo profile is configured for the ${role} role.`);
  Object.assign(user, patch, { updatedAt: new Date().toISOString() });
  writeStore(store);
}
