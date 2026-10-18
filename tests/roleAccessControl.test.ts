import { createHash } from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  runTransaction 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const TEST_SECRET = 'CIVICTASK_LIVE_E2E_SECRET_2026';

// Initialize Firebase App targeting real Firestore database
const app = getApps().length === 0 ? initializeApp(firebaseConfig, 'ROLE_SECURITY_TEST_APP') : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${msg}`);
  }
}

async function apiCall(endpoint: string, token: string, body?: any) {
  const res = await fetch(`http://localhost:3000${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runRoleAccessControlTests() {
  console.log('🔒 Running Role-Based Access Control & Security Tests against Live Persistence...\n');

  const testId = `role_test_${Date.now()}`;
  const studentUid = `student_${testId}`;
  const suspendedStudentUid = `susp_student_${testId}`;
  const merchantUid = `merchant_${testId}`;
  const suspendedMerchantUid = `susp_merchant_${testId}`;
  const adminUid = `admin_${testId}`;
  const otherMerchantUid = `other_merchant_${testId}`;

  const taskId = `task_${testId}`;
  const shopId = `shop_${testId}`;
  const otherShopId = `other_shop_${testId}`;

  const cleanupDocs: { col: string; id: string }[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create Student, Suspended Student, Merchant, Suspended Merchant, Admin
    // -------------------------------------------------------------------------
    console.log('Step 1: Setting up role test users in Firestore...');
    const nowIso = new Date().toISOString();

    // 1. Regular Student
    await setDoc(doc(db, 'users', studentUid), {
      uid: studentUid,
      name: 'Regular Student',
      email: `${studentUid}@university.test`,
      role: 'student',
      pointsBalance: 100,
      accountStatus: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'users', id: studentUid });

    // 2. Suspended Student
    await setDoc(doc(db, 'users', suspendedStudentUid), {
      uid: suspendedStudentUid,
      name: 'Suspended Student',
      email: `${suspendedStudentUid}@university.test`,
      role: 'student',
      pointsBalance: 50,
      accountStatus: 'suspended',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'users', id: suspendedStudentUid });

    // 3. Active Merchant
    await setDoc(doc(db, 'users', merchantUid), {
      uid: merchantUid,
      name: 'Active Merchant Owner',
      email: `${merchantUid}@store.test`,
      role: 'shopkeeper',
      pointsBalance: 0,
      accountStatus: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'users', id: merchantUid });

    // 4. Suspended Merchant
    await setDoc(doc(db, 'users', suspendedMerchantUid), {
      uid: suspendedMerchantUid,
      name: 'Suspended Merchant Owner',
      email: `${suspendedMerchantUid}@store.test`,
      role: 'shopkeeper',
      pointsBalance: 0,
      accountStatus: 'suspended',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'users', id: suspendedMerchantUid });

    // 5. Admin
    await setDoc(doc(db, 'users', adminUid), {
      uid: adminUid,
      name: 'System Admin',
      email: 'alishabatool838@gmail.com',
      role: 'admin',
      pointsBalance: 0,
      accountStatus: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'users', id: adminUid });

    // 6. Partner Shop for Merchant
    await setDoc(doc(db, 'partnerShops', shopId), {
      id: shopId,
      shopName: 'Green Market Delights',
      ownerId: merchantUid,
      ownerEmail: `${merchantUid}@store.test`,
      category: 'Grocery',
      address: '100 Main St',
      discountOffer: '$5 Off Fresh Produce',
      pointsCost: 50,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'partnerShops', id: shopId });

    // 7. Active Task
    await setDoc(doc(db, 'tasks', taskId), {
      id: taskId,
      title: 'Community Garden Maintenance',
      category: 'Environment',
      rewardPoints: 60,
      status: 'active',
      createdBy: adminUid,
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    cleanupDocs.push({ col: 'tasks', id: taskId });

    console.log('  ✓ Test user profiles and storefronts persisted.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Students cannot self-assign Admin or change role via API or Registration
    // -------------------------------------------------------------------------
    console.log('Test 1: Testing Student Role Self-Elevation Prevention...');
    const studentSyncRes = await apiCall('/api/auth/profile', `test-student-${studentUid}`, {
      role: 'admin', // Malicious attempt to self-assign admin role
      pointsBalance: 5000,
    });
    assert(studentSyncRes.ok, 'Profile sync should succeed');
    assert(studentSyncRes.data.profile.role === 'student', 'Student role must strictly remain "student"');
    console.log('  ✓ Public/Student authentication strictly assigns "student" role (self-assignment blocked).\n');

    // -------------------------------------------------------------------------
    // TEST 2: Students cannot approve their own submissions via API
    // -------------------------------------------------------------------------
    console.log('Test 2: Testing Student Submission Self-Approval Prevention...');
    // Create pending submission
    const subRes = await apiCall('/api/submissions/create', `test-student-${studentUid}`, {
      taskId,
      proofType: 'image',
      proofUrl: 'https://example.com/proof.jpg',
      description: 'Completed garden plot mulching.',
    });
    assert(subRes.ok, `Student submission should succeed: ${JSON.stringify(subRes.data)}`);
    const submissionId = subRes.data.submission.id;
    cleanupDocs.push({ col: 'submissions', id: submissionId });

    // Student attempts to call /api/submissions/review to approve themselves
    const studentApproveAttempt = await apiCall('/api/submissions/review', `test-student-${studentUid}`, {
      submissionId,
      status: 'approved',
      adminNotes: 'Self approved',
    });
    assert(studentApproveAttempt.status === 403, 'Student approval must return 403 Forbidden');
    console.log('  ✓ Student self-approval blocked by server with 403 Forbidden.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Students cannot validate or confirm redemptions
    // -------------------------------------------------------------------------
    console.log('Test 3: Testing Student Redemption Terminal Access Denial...');
    const studentValidateAttempt = await apiCall('/api/redemption/validate', `test-student-${studentUid}`, {
      code: 'CT-ABC-123',
    });
    assert(studentValidateAttempt.status === 403, 'Student cannot validate redemption codes (403)');

    const studentConfirmAttempt = await apiCall('/api/redemption/confirm', `test-student-${studentUid}`, {
      sessionId: 'any_session',
      code: 'CT-ABC-123',
    });
    assert(studentConfirmAttempt.status === 403, 'Student cannot confirm redemptions (403)');
    console.log('  ✓ Student access to merchant redemption operations blocked with 403 Forbidden.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Suspended merchant cannot perform redemption operations
    // -------------------------------------------------------------------------
    console.log('Test 4: Testing Suspended Merchant Operations Denial...');
    const suspMerchantValidate = await apiCall('/api/redemption/validate', `test-shopkeeper-${suspendedMerchantUid}`, {
      code: 'CT-ABC-123',
    });
    assert(suspMerchantValidate.status === 403, 'Suspended merchant validation must return 403');

    const suspMerchantConfirm = await apiCall('/api/redemption/confirm', `test-shopkeeper-${suspendedMerchantUid}`, {
      sessionId: 'any_session',
      code: 'CT-ABC-123',
    });
    assert(suspMerchantConfirm.status === 403, 'Suspended merchant confirmation must return 403');
    console.log('  ✓ Suspended merchant operations blocked with 403 Forbidden.\n');

    // -------------------------------------------------------------------------
    // TEST 5: Suspended student cannot submit tasks or generate QR sessions
    // -------------------------------------------------------------------------
    console.log('Test 5: Testing Suspended Student Task & Redemption Denial...');
    const suspStudentSub = await apiCall('/api/submissions/create', `test-student-${suspendedStudentUid}`, {
      taskId,
      proofType: 'image',
      proofUrl: 'https://example.com/proof.jpg',
      description: 'Suspended student task attempt.',
    });
    assert(suspStudentSub.status === 403, 'Suspended student submission must return 403');

    const suspStudentRed = await apiCall('/api/redemption/create', `test-student-${suspendedStudentUid}`, {
      shopId,
      offerId: 'offer_1',
    });
    assert(suspStudentRed.status === 403, 'Suspended student redemption must return 403');
    console.log('  ✓ Suspended student operations blocked with 403 Forbidden.\n');

    // -------------------------------------------------------------------------
    // TEST 6: Active merchant cannot access administrative APIs
    // -------------------------------------------------------------------------
    console.log('Test 6: Testing Merchant Admin Access Denial...');
    const merchantTaskCreate = await apiCall('/api/tasks/create', `test-shopkeeper-${merchantUid}`, {
      title: 'Merchant Created Task',
      category: 'Environment',
      rewardPoints: 100,
      description: 'Unauthorized task creation attempt',
    });
    assert(merchantTaskCreate.status === 403, 'Merchant cannot create civic tasks (403)');

    const merchantSubReview = await apiCall('/api/submissions/review', `test-shopkeeper-${merchantUid}`, {
      submissionId,
      status: 'approved',
    });
    assert(merchantSubReview.status === 403, 'Merchant cannot review submissions (403)');
    console.log('  ✓ Merchant administrative access blocked with 403 Forbidden.\n');

    // -------------------------------------------------------------------------
    // TEST 7: Admin legitimately approves submission and awards points
    // -------------------------------------------------------------------------
    console.log('Test 7: Testing Legitimate Admin Approval & Atomic Credit...');
    const adminApprove = await apiCall('/api/submissions/review', `test-admin-${adminUid}`, {
      submissionId,
      status: 'approved',
      adminNotes: 'Verified by administrator.',
    });
    assert(adminApprove.ok, `Admin approval must succeed: ${JSON.stringify(adminApprove.data)}`);

    // Verify student balance incremented by 60 pts: 100 -> 160 pts
    const studentUpdated = await getDoc(doc(db, 'users', studentUid));
    assert(studentUpdated.data()?.pointsBalance === 160, `Student balance must be 160 pts, got ${studentUpdated.data()?.pointsBalance}`);
    console.log('  ✓ Admin approved submission: Student balance updated 100 -> 160 pts.\n');

    // -------------------------------------------------------------------------
    // TEST 8: Full Student -> Merchant single-use redemption lifecycle
    // -------------------------------------------------------------------------
    console.log('Test 8: Testing Student QR Generation and Authorized Merchant Confirmation...');
    const qrRes = await apiCall('/api/redemption/create', `test-student-${studentUid}`, {
      shopId,
      offerId: 'offer_produce',
    });
    assert(qrRes.ok, `QR session generation should succeed: ${JSON.stringify(qrRes.data)}`);
    const { id: redSessionId, code: redCode } = qrRes.data.session;
    cleanupDocs.push({ col: 'redemptionSessions', id: redSessionId });

    // Merchant validates QR code
    const merchantVal = await apiCall('/api/redemption/validate', `test-shopkeeper-${merchantUid}`, {
      code: redCode,
    });
    assert(merchantVal.ok, `Merchant should validate token: ${JSON.stringify(merchantVal.data)}`);

    // Merchant confirms point deduction (50 pts)
    const merchantConf = await apiCall('/api/redemption/confirm', `test-shopkeeper-${merchantUid}`, {
      sessionId: redSessionId,
      code: redCode,
    });
    assert(merchantConf.ok, `Merchant confirmation should succeed: ${JSON.stringify(merchantConf.data)}`);

    // Verify balance debited 160 -> 110 pts
    const studentAfterRed = await getDoc(doc(db, 'users', studentUid));
    assert(studentAfterRed.data()?.pointsBalance === 110, `Balance must be 110 pts, got ${studentAfterRed.data()?.pointsBalance}`);
    console.log('  ✓ Merchant confirmed redemption: Student balance debited 160 -> 110 pts.\n');

    console.log('🎉 ALL 8 Role-Based Access Control and Security Invariant Tests PASSED!\n');

  } finally {
    console.log('Cleaning up test records from Firestore...');
    for (const item of cleanupDocs) {
      try {
        await deleteDoc(doc(db, item.col, item.id));
      } catch {}
    }
    console.log('✓ Cleanup complete.');
  }
}

runRoleAccessControlTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
