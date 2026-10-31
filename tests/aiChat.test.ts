import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ChatRequestSchema, ChatMessageSchema } from '../src/lib/validation.ts';

const TEST_SECRET = 'CIVICTASK_LIVE_E2E_SECRET_2026';

// Initialize Firebase App targeting real Firestore database
const app = getApps().length === 0 ? initializeApp(firebaseConfig, 'AI_CHAT_TEST_APP') : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${msg}`);
  }
}

async function apiCall(endpoint: string, token?: string, body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`http://localhost:3000${endpoint}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runAiChatTests() {
  console.log('🤖 Running CivicTask AI Assistant Chat Backend Integration Tests...\n');

  const testId = `chat_test_${Date.now()}`;
  const studentUid = `student_${testId}`;
  const suspendedStudentUid = `susp_student_${testId}`;
  const cleanupDocs: { col: string; id: string }[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision test users in Cloud Firestore
    // -------------------------------------------------------------------------
    console.log('Step 1: Setting up authoritative test profiles in Firestore...');
    const now = new Date().toISOString();

    // Active Student
    await setDoc(doc(db, 'users', studentUid), {
      uid: studentUid,
      name: 'Elena Rostova (Student Volunteer)',
      email: `${studentUid}@university.edu`,
      role: 'student',
      pointsBalance: 120,
      accountStatus: 'active',
      createdAt: now,
      updatedAt: now,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'users', id: studentUid });

    // Suspended Student
    await setDoc(doc(db, 'users', suspendedStudentUid), {
      uid: suspendedStudentUid,
      name: 'Suspended Volunteer',
      email: `${suspendedStudentUid}@university.edu`,
      role: 'student',
      pointsBalance: 0,
      accountStatus: 'suspended',
      createdAt: now,
      updatedAt: now,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'users', id: suspendedStudentUid });

    console.log('  ✓ Test user profiles created successfully in Firestore.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Guest requests reach validation without requiring authentication
    // -------------------------------------------------------------------------
    console.log('Test 1: Guest requests reach AI chat validation...');
    const guestRes = await apiCall('/api/ai/chat', undefined, {});
    assert(guestRes.status === 400, `Expected 400 for invalid guest request, got ${guestRes.status}`);
    console.log('  ✓ PASS: Guest request reached payload validation without requiring authentication.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Suspended account blocked with HTTP 403
    // -------------------------------------------------------------------------
    console.log('Test 2: Suspended user accounts are rejected...');
    const suspRes = await apiCall('/api/ai/chat', `test-student-${suspendedStudentUid}`, {
      messages: [
        { role: 'user', content: 'Hello assistant' },
      ],
    });
    assert(suspRes.status === 403, `Expected 403 for suspended account, got ${suspRes.status}`);
    console.log('  ✓ PASS: Suspended user strictly rejected with HTTP 403.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Zod payload validation (HTTP 400 on malformed payloads)
    // -------------------------------------------------------------------------
    console.log('Test 3: Request payload validation (Zod schema)...');

    // Empty messages array without message property
    const emptyMessagesRes = await apiCall('/api/ai/chat', `test-student-${studentUid}`, {
      messages: [],
    });
    assert(emptyMessagesRes.status === 400, `Expected 400 for empty messages array, got ${emptyMessagesRes.status}`);

    // Empty message string
    const emptyMsgStrRes = await apiCall('/api/ai/chat', `test-student-${studentUid}`, {
      message: '',
    });
    assert(emptyMsgStrRes.status === 400, `Expected 400 for empty message string, got ${emptyMsgStrRes.status}`);

    // Missing content in message
    const missingContentRes = await apiCall('/api/ai/chat', `test-student-${studentUid}`, {
      messages: [{ role: 'user', content: '' }],
    });
    assert(missingContentRes.status === 400, `Expected 400 for empty message content, got ${missingContentRes.status}`);

    // Invalid role in message
    const invalidRoleRes = await apiCall('/api/ai/chat', `test-student-${studentUid}`, {
      messages: [{ role: 'hacker', content: 'hello' }],
    });
    assert(invalidRoleRes.status === 400, `Expected 400 for invalid message role, got ${invalidRoleRes.status}`);
    console.log('  ✓ PASS: Malformed chat payloads rejected with HTTP 400.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Zod Schema unit tests for all supported payload formats
    // -------------------------------------------------------------------------
    console.log('Test 4: Testing ChatRequestSchema with multiple payload formats...');
    
    // Format A: messages array of objects
    const formatA = ChatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Recommend a volunteering task for a student interested in teaching and community service. Explain why.' },
      ],
    });
    assert(formatA.success, 'Format A (messages array) must be valid');

    // Format B: single message string
    const formatB = ChatRequestSchema.safeParse({
      message: 'Recommend a volunteering task for a student interested in teaching and community service. Explain why.',
    });
    assert(formatB.success, 'Format B (single message string) must be valid');

    // Format C: prompt string
    const formatC = ChatRequestSchema.safeParse({
      prompt: 'Recommend a volunteering task for a student interested in teaching and community service. Explain why.',
    });
    assert(formatC.success, 'Format C (prompt string) must be valid');

    // Format D: combined message and messages history
    const formatD = ChatRequestSchema.safeParse({
      message: 'Recommend a volunteering task for a student interested in teaching and community service. Explain why.',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
    });
    assert(formatD.success, 'Format D (combined message + history) must be valid');

    // Format E: messages array of strings
    const formatE = ChatRequestSchema.safeParse({
      messages: ['How can I earn points?', 'Where do I find tasks?'],
    });
    assert(formatE.success, 'Format E (array of strings) must be valid');

    console.log('  ✓ PASS: Zod schema validates all standard chat payload structures.\n');

    // -------------------------------------------------------------------------
    // TEST 5: Real endpoint dispatch with live student credentials & exact user message
    // -------------------------------------------------------------------------
    console.log('Test 5: Dispatching exact user query to /api/ai/chat...');
    const userQuery = 'Recommend a volunteering task for a student interested in teaching and community service. Explain why.';
    
    // Test with combined payload as sent by frontend
    const chatRes = await apiCall('/api/ai/chat', `test-student-${studentUid}`, {
      message: userQuery,
      messages: [{ role: 'user', content: userQuery }],
    });

    // Test with single message payload
    const singleMsgRes = await apiCall('/api/ai/chat', `test-student-${studentUid}`, {
      message: userQuery,
    });

    assert(
      chatRes.status === 200 || chatRes.status === 503,
      `Expected 200 (live inference) or 503 (offline daemon), got ${chatRes.status}`
    );
    assert(
      singleMsgRes.status === 200 || singleMsgRes.status === 503,
      `Expected 200 or 503 for single message payload, got ${singleMsgRes.status}`
    );

    // Verify model target is strictly qwen2.5:3b-instruct
    const targetModel = chatRes.data.model;
    assert(
      targetModel === 'qwen2.5:3b-instruct',
      `Expected backend to use model 'qwen2.5:3b-instruct', got '${targetModel}'`
    );

    if (chatRes.status === 200) {
      console.log('  ✓ Live Ollama Qwen2.5-3B-Instruct chat inference SUCCEEDED (HTTP 200)!');
      console.log(`    Model: ${chatRes.data.model}`);
      console.log(`    Reply: ${chatRes.data.reply}`);
      assert(typeof chatRes.data.reply === 'string', 'Reply must be a string');
    } else if (chatRes.status === 503) {
      console.log('  ✓ Expected graceful service status: Ollama is not active on this container (HTTP 503).');
      console.log(`    Message: ${chatRes.data.error}`);
      console.log(`    Host: ${chatRes.data.host}`);
      console.log(`    Model: ${chatRes.data.model}`);
      console.log(`    Instructions: ${chatRes.data.setupInstructions}`);
      assert(chatRes.data.connected === false, 'connected flag should be false when Ollama is offline');
      assert(!chatRes.data.reply, 'Zero mock reply generated when Ollama is offline');
    }
    console.log('  ✓ PASS: Both payload shapes accepted cleanly without 400 validation error.\n');

    console.log('🎉 ALL 5 AI CHAT BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ AI Chat Test Suite Error:', err);
    throw err;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Clean up test documents from Firestore
    // -------------------------------------------------------------------------
    console.log('🧹 Cleaning up test artifacts from Cloud Firestore...');
    for (const docInfo of cleanupDocs) {
      try {
        await deleteDoc(doc(db, docInfo.col, docInfo.id));
      } catch (err) {
        console.warn(`Failed to cleanup ${docInfo.col}/${docInfo.id}:`, err);
      }
    }
    console.log('  ✓ Cleanup complete.\n');
  }
  process.exit(0);
}

runAiChatTests().catch((err) => {
  console.error('❌ Fatal error in test runner:', err);
  process.exit(1);
});
