import { DEMO_ROLE_STORAGE_KEY, demoProfile, runDemoApi, subscribeDemoCollection } from '../src/lib/demo-data.ts';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`DEMO MODE TEST FAILED: ${message}`);
}

const storage = new Map<string, string>();
const eventListeners = new Map<string, Set<EventListener>>();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    addEventListener: (type: string, listener: EventListener) => {
      const listeners = eventListeners.get(type) || new Set<EventListener>();
      listeners.add(listener);
      eventListeners.set(type, listeners);
    },
    removeEventListener: (type: string, listener: EventListener) => {
      eventListeners.get(type)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      eventListeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
  },
});

function request(endpoint: string, body: Record<string, unknown> = {}) {
  return runDemoApi(endpoint, { method: 'POST', body: JSON.stringify(body) }) as Record<string, unknown>;
}

async function runDemoModeTests() {
  storage.set(DEMO_ROLE_STORAGE_KEY, 'student');
  assert(demoProfile('student').uid === 'demo_student', 'student identity is a separate demo profile');

  let taskCount = 0;
  const unsubscribe = subscribeDemoCollection('tasks', {}, (snapshot) => {
    let count = 0;
    snapshot.forEach(() => count++);
    taskCount = count;
  });
  assert(taskCount === 3, 'demo subscriptions read only the local sample collection');

  storage.set(DEMO_ROLE_STORAGE_KEY, 'admin');
  request('/api/tasks/create', {
    title: 'Test local task',
    category: 'Environment',
    rewardPoints: 25,
    description: 'Created in local demo storage.',
  });
  assert(Number(taskCount) === 4, 'admin workflow mutations update local subscribers');

  let unauthorizedRoleRejected = false;
  storage.set(DEMO_ROLE_STORAGE_KEY, 'student');
  try {
    request('/api/tasks/create', { title: 'Should not be accepted' });
  } catch {
    unauthorizedRoleRejected = true;
  }
  assert(unauthorizedRoleRejected, 'demo workflow enforces the explicitly selected role');

  const submissionResponse = request('/api/submissions/create', {
    taskId: 'demo_task_tutoring',
    proofType: 'link',
    proofUrl: 'https://example.test/reading-session',
    description: 'Helped with a reading session.',
  });
  const submission = submissionResponse.submission;
  assert(
    typeof submission === 'object' && submission !== null && 'id' in submission &&
      typeof submission.id === 'string',
    'student submission is stored locally',
  );

  storage.set(DEMO_ROLE_STORAGE_KEY, 'admin');
  request('/api/submissions/review', {
    submissionId: (submission as { id: string }).id,
    status: 'approved',
  });
  assert(demoProfile('student').pointsBalance === 320, 'approval awards points to the local student profile');

  let chatError: unknown = null;
  try {
    request('/api/ai/chat', {
      messages: [{ role: 'user', content: 'How do I earn points?' }],
    });
  } catch (err) {
    chatError = err;
  }
  assert(
    chatError instanceof Error,
    'demo mode must surface an explicit AI service error instead of fabricating a reply',
  );
  assert(
    (chatError as Error).message.includes('demo mode'),
    'the demo-mode AI error must clearly state that the assistant is unavailable in demo mode',
  );

  let shopCount = 0;
  const unsubscribeShops = subscribeDemoCollection('partnerShops', { ownerId: 'demo_shopkeeper' }, (snapshot) => {
    let count = 0;
    snapshot.forEach(() => count++);
    shopCount = count;
  });
  request('/api/merchant/review', {
    applicationId: 'demo_application_pending',
    status: 'approved',
  });
  assert(Number(shopCount) === 3, 'approving a local application creates a visible storefront');

  unsubscribeShops();
  unsubscribe();
  console.log('Demo mode local data and role isolation tests passed.');
}

runDemoModeTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
