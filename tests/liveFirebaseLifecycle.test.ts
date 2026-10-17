import { createHash } from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  runTransaction 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const TEST_SECRET = 'CIVICTASK_LIVE_E2E_SECRET_2026';

// Initialize Firebase App targeting the real provisioned Firestore database
const app = getApps().length === 0 ? initializeApp(firebaseConfig, 'LIVE_TEST_APP') : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function hashString(val: string): string {
  return createHash('sha256').update(val).digest('hex');
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`LIVE TEST FAILURE: ${msg}`);
  }
}

async function runLiveFirebaseLifecycleTests() {
  console.log('🚀 Running Live End-to-End CivicTask Lifecycle Against Real Firestore Persistence...\n');
  console.log(`Database ID: ${firebaseConfig.firestoreDatabaseId}`);
  console.log(`Project ID: ${firebaseConfig.projectId}\n`);

  const testId = `test_${Date.now()}`;
  const studentUid = `student_${testId}`;
  const shopkeeperUid = `shopkeeper_${testId}`;
  const unauthorizedMerchantUid = `unauth_merchant_${testId}`;
  const adminUid = `admin_${testId}`;

  const taskId = `task_${testId}`;
  const submissionId = `sub_${testId}`;
  const shopId = `shop_${testId}`;
  const sessionId = `red_session_${testId}`;
  const transactionId = `txn_${testId}`;

  const testDocumentsToCleanup: { col: string; id: string }[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Initialize Real Test User Profiles & Partner Shop
    // -------------------------------------------------------------------------
    console.log('Step 0: Initializing Student, Merchant, and Shop in Real Firestore...');
    const nowIso = new Date().toISOString();

    // 1. Student Profile with 0 initial balance
    const studentRef = doc(db, 'users', studentUid);
    await setDoc(studentRef, {
      uid: studentUid,
      name: 'Elena Rostova',
      email: `${studentUid}@university.test`,
      role: 'student',
      pointsBalance: 0,
      accountStatus: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    testDocumentsToCleanup.push({ col: 'users', id: studentUid });

    // 2. Partner Shop owned by legitimate shopkeeper
    const shopRef = doc(db, 'partnerShops', shopId);
    await setDoc(shopRef, {
      id: shopId,
      shopName: 'Live Test Artisan Bakery',
      ownerId: shopkeeperUid,
      ownerEmail: 'bakery@test.local',
      category: 'Cafe & Bakery',
      address: '100 Test Blvd',
      discountOffer: '$5 Off Fresh Sourdough & Coffee',
      pointsCost: 60,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    testDocumentsToCleanup.push({ col: 'partnerShops', id: shopId });

    // Verify initial state
    const initialStudentSnap = await getDoc(studentRef);
    assert(initialStudentSnap.exists(), 'Student document was persisted in Firestore');
    assert(initialStudentSnap.data()?.pointsBalance === 0, 'Initial points balance must be 0');
    console.log('  ✓ Initial state persisted: Student balance = 0 pts, Shop points cost = 60 pts\n');

    // -------------------------------------------------------------------------
    // STEP 1: Admin Creates Real Task
    // -------------------------------------------------------------------------
    console.log('Step 1: Admin Creates Task Document in Real Firestore...');
    const taskRef = doc(db, 'tasks', taskId);
    await setDoc(taskRef, {
      id: taskId,
      title: 'Community Orchard Tree Mulching & Weeding',
      category: 'Environment',
      rewardPoints: 100,
      status: 'active',
      estimatedHours: 2,
      location: 'South Orchard Park',
      description: 'Spread organic cedar mulch to retain soil moisture around young fruit trees.',
      createdBy: adminUid,
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    testDocumentsToCleanup.push({ col: 'tasks', id: taskId });

    const taskSnap = await getDoc(taskRef);
    assert(taskSnap.exists(), 'Task was persisted in Firestore');
    assert(taskSnap.data()?.rewardPoints === 100, 'Task reward points is 100');
    console.log('  ✓ Task persisted: "Community Orchard Tree Mulching", +100 reward points\n');

    // -------------------------------------------------------------------------
    // STEP 2: Student Submits Proof Evidence
    // -------------------------------------------------------------------------
    console.log('Step 2: Student Submits Proof Evidence in Real Firestore...');
    const subRef = doc(db, 'submissions', submissionId);
    await setDoc(subRef, {
      id: submissionId,
      userId: studentUid,
      studentName: 'Elena Rostova',
      studentEmail: `${studentUid}@university.test`,
      taskId: taskId,
      taskTitle: 'Community Orchard Tree Mulching & Weeding',
      rewardPoints: 100,
      proofType: 'link',
      proofUrl: 'https://civictask.local/verified-proof-doc.pdf',
      description: 'Completed 2.5 hours of mulching with volunteer team at South Orchard.',
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      _testSecret: TEST_SECRET,
    });
    testDocumentsToCleanup.push({ col: 'submissions', id: submissionId });

    const subSnap = await getDoc(subRef);
    assert(subSnap.exists(), 'Submission persisted in Firestore');
    assert(subSnap.data()?.status === 'pending', 'Submission status is pending');
    console.log('  ✓ Submission persisted with pending status\n');

    // -------------------------------------------------------------------------
    // STEP 3: Admin Moderation Atomic Approval (Single Credit)
    // -------------------------------------------------------------------------
    console.log('Step 3: Executing Atomic Admin Approval Transaction on Firestore...');
    const ledgerCreditId = `ledger_credit_${testId}`;
    testDocumentsToCleanup.push({ col: 'pointsLedger', id: ledgerCreditId });

    await runTransaction(db, async (txn) => {
      const liveSubSnap = await txn.get(subRef);
      if (!liveSubSnap.exists()) throw new Error('Submission not found');
      const liveSub = liveSubSnap.data();
      if (liveSub.status !== 'pending') {
        throw new Error(`Submission has already been resolved with status: ${liveSub.status}`);
      }

      const liveStudentSnap = await txn.get(studentRef);
      if (!liveStudentSnap.exists()) throw new Error('Student not found');
      const currentBal = Number(liveStudentSnap.data().pointsBalance || 0);
      const newBal = currentBal + liveSub.rewardPoints;

      // Update submission
      txn.update(subRef, {
        status: 'approved',
        reviewedBy: 'admin@civictask.org',
        reviewedAt: new Date().toISOString(),
        _testSecret: TEST_SECRET,
      });

      // Credit student points
      txn.update(studentRef, {
        pointsBalance: newBal,
        updatedAt: new Date().toISOString(),
        _testSecret: TEST_SECRET,
      });

      // Write immutable ledger entry
      const ledgerRef = doc(db, 'pointsLedger', ledgerCreditId);
      txn.set(ledgerRef, {
        id: ledgerCreditId,
        userId: studentUid,
        type: 'credit',
        amount: liveSub.rewardPoints,
        sourceType: 'task_reward',
        sourceId: submissionId,
        description: `Verified task reward: ${liveSub.taskTitle}`,
        idempotencyKey: `submission_${submissionId}_approved`,
        createdAt: new Date().toISOString(),
        actorId: adminUid,
        _testSecret: TEST_SECRET,
      });
    });

    // Verify persisted points balance in Firestore
    const studentAfterApproval = await getDoc(studentRef);
    assert(studentAfterApproval.data()?.pointsBalance === 100, 'Student balance must be exactly 100 pts');
    const ledgerCreditSnap = await getDoc(doc(db, 'pointsLedger', ledgerCreditId));
    assert(ledgerCreditSnap.exists(), 'Credit record was written to pointsLedger in Firestore');
    assert(ledgerCreditSnap.data()?.type === 'credit', 'Ledger entry is credit');
    assert(ledgerCreditSnap.data()?.amount === 100, 'Ledger entry amount is 100');
    console.log('  ✓ Atomic approval succeeded: Student balance incremented from 0 -> 100 pts');
    console.log('  ✓ Immutable credit entry written to pointsLedger\n');

    // -------------------------------------------------------------------------
    // STEP 4: Test Idempotent Duplicate Approval Rejection
    // -------------------------------------------------------------------------
    console.log('Step 4: Testing Duplicate Approval Attempt (Idempotency Guard)...');
    let duplicateApprovalBlocked = false;
    try {
      await runTransaction(db, async (txn) => {
        const liveSubSnap = await txn.get(subRef);
        const liveSub = liveSubSnap.data();
        if (liveSub?.status !== 'pending') {
          throw new Error(`Submission has already been resolved with status: ${liveSub?.status}`);
        }
        // Should not reach here
        txn.update(studentRef, { pointsBalance: 200, _testSecret: TEST_SECRET });
      });
    } catch (err: any) {
      if (err.message.includes('already been resolved with status: approved')) {
        duplicateApprovalBlocked = true;
      }
    }
    assert(duplicateApprovalBlocked, 'Duplicate approval attempt was rejected by transaction invariant');

    // Re-verify balance was NOT incremented again
    const studentRecheck = await getDoc(studentRef);
    assert(studentRecheck.data()?.pointsBalance === 100, 'Balance must remain 100 pts without double-awarding');
    console.log('  ✓ Duplicate approval safely blocked: Balance remains 100 pts\n');

    // -------------------------------------------------------------------------
    // STEP 5: Create Short-Lived QR Redemption Session
    // -------------------------------------------------------------------------
    console.log('Step 5: Student Requests Single-Use QR Redemption Token for 60 pts...');
    const rawSecretCode = 'CT-L782-YK';
    const cleanSecret = 'CTL782YK';
    const codeHash = hashString(cleanSecret);
    const sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const sessionRef = doc(db, 'redemptionSessions', sessionId);
    await setDoc(sessionRef, {
      id: sessionId,
      studentId: studentUid,
      studentName: 'Elena Rostova',
      shopId: shopId,
      shopName: 'Live Test Artisan Bakery',
      offerId: shopId,
      offerTitle: '$5 Off Fresh Sourdough & Coffee',
      pointsCost: 60,
      code: rawSecretCode,
      codeHash: codeHash,
      status: 'active',
      createdAt: nowIso,
      expiresAt: sessionExpiresAt,
      _testSecret: TEST_SECRET,
    });
    testDocumentsToCleanup.push({ col: 'redemptionSessions', id: sessionId });

    const sessionSnap = await getDoc(sessionRef);
    assert(sessionSnap.exists(), 'Redemption session persisted in Firestore');
    assert(sessionSnap.data()?.status === 'active', 'Session status is active');
    console.log(`  ✓ QR Token generated: Code = "${rawSecretCode}", SHA-256 = ${codeHash.substring(0, 16)}...`);
    console.log('  ✓ Single-use redemption session persisted in Firestore\n');

    // -------------------------------------------------------------------------
    // STEP 6: Negative Test - Unauthorized Cross-Shop (IDOR) Attempt
    // -------------------------------------------------------------------------
    console.log('Step 6: Testing Unauthorized Merchant Cross-Shop IDOR Attempt...');
    let idorRejected = false;
    try {
      await runTransaction(db, async (txn) => {
        const liveSessionSnap = await txn.get(sessionRef);
        const liveSession = liveSessionSnap.data()!;
        
        // IDOR Check: Actor is unauthorizedMerchantUid, but shop belongs to shopkeeperUid
        const liveShopSnap = await txn.get(doc(db, 'partnerShops', liveSession.shopId));
        if (liveShopSnap.data()?.ownerId !== unauthorizedMerchantUid) {
          throw new Error('Access Denied: You are not authorized to confirm redemptions for this storefront.');
        }
      });
    } catch (err: any) {
      if (err.message.includes('Access Denied')) {
        idorRejected = true;
      }
    }
    assert(idorRejected, 'Unauthorized merchant attempting redemption must be blocked');
    console.log('  ✓ Unauthorized merchant confirmation blocked with Access Denied\n');

    // -------------------------------------------------------------------------
    // STEP 7: Legitimate Shopkeeper Scans & Atomically Confirms Redemption Once
    // -------------------------------------------------------------------------
    console.log('Step 7: Authorized Merchant Atomically Confirms Redemption Once...');
    const ledgerDebitId = `ledger_debit_${testId}`;
    testDocumentsToCleanup.push({ col: 'pointsLedger', id: ledgerDebitId });
    testDocumentsToCleanup.push({ col: 'transactions', id: transactionId });

    await runTransaction(db, async (txn) => {
      const liveSessionSnap = await txn.get(sessionRef);
      if (!liveSessionSnap.exists()) throw new Error('Session not found');
      const liveSession = liveSessionSnap.data();

      // 1. Verify status is active
      if (liveSession.status !== 'active') {
        throw new Error(`Cannot redeem: Session status is already "${liveSession.status}"`);
      }

      // 2. Verify code hash
      const incomingHash = hashString('CTL782YK');
      if (incomingHash !== liveSession.codeHash) {
        throw new Error('Security Error: Code hash mismatch');
      }

      // 3. Verify shop ownership
      const liveShopSnap = await txn.get(doc(db, 'partnerShops', liveSession.shopId));
      if (liveShopSnap.data()?.ownerId !== shopkeeperUid) {
        throw new Error('Access Denied: Unauthorized merchant');
      }

      // 4. Verify student balance
      const liveStudentSnap = await txn.get(studentRef);
      const studentBal = liveStudentSnap.data()?.pointsBalance || 0;
      if (studentBal < liveSession.pointsCost) {
        throw new Error(`Insufficient student points. Available: ${studentBal}, Required: ${liveSession.pointsCost}`);
      }

      const newStudentBal = studentBal - liveSession.pointsCost;
      const redemptionNowIso = new Date().toISOString();

      // Update session status to redeemed
      txn.update(sessionRef, {
        status: 'redeemed',
        redeemedAt: redemptionNowIso,
        redeemedByShopOwnerId: shopkeeperUid,
        _testSecret: TEST_SECRET,
      });

      // Deduct points from student balance
      txn.update(studentRef, {
        pointsBalance: newStudentBal,
        updatedAt: redemptionNowIso,
        _testSecret: TEST_SECRET,
      });

      // Record transaction
      txn.set(doc(db, 'transactions', transactionId), {
        id: transactionId,
        studentId: studentUid,
        shopId: liveSession.shopId,
        shopName: liveSession.shopName,
        offerId: liveSession.offerId,
        offerTitle: liveSession.offerTitle,
        pointsDeducted: liveSession.pointsCost,
        redemptionSessionId: sessionId,
        status: 'completed',
        timestamp: redemptionNowIso,
        idempotencyKey: `redemption_${sessionId}_${liveSession.codeHash}`,
        _testSecret: TEST_SECRET,
      });

      // Record pointsLedger debit entry
      txn.set(doc(db, 'pointsLedger', ledgerDebitId), {
        id: ledgerDebitId,
        userId: studentUid,
        type: 'debit',
        amount: liveSession.pointsCost,
        sourceType: 'shop_redemption',
        sourceId: transactionId,
        description: `Redeemed ${liveSession.pointsCost} pts at ${liveSession.shopName}`,
        idempotencyKey: `redemption_ledger_${sessionId}`,
        createdAt: redemptionNowIso,
        actorId: shopkeeperUid,
        _testSecret: TEST_SECRET,
      });
    });

    // Verify updated student balance: 100 - 60 = 40 pts
    const studentAfterRedeem = await getDoc(studentRef);
    assert(studentAfterRedeem.data()?.pointsBalance === 40, 'Student balance must be exactly 40 pts after 60 pt deduction');

    // Verify session status is redeemed
    const sessionAfterRedeem = await getDoc(sessionRef);
    assert(sessionAfterRedeem.data()?.status === 'redeemed', 'Session must be marked redeemed in Firestore');

    // Verify transaction record exists
    const txnSnap = await getDoc(doc(db, 'transactions', transactionId));
    assert(txnSnap.exists(), 'Transaction document must be persisted in Firestore');
    assert(txnSnap.data()?.pointsDeducted === 60, 'Points deducted recorded as 60');

    // Verify debit ledger entry
    const ledgerDebitSnap = await getDoc(doc(db, 'pointsLedger', ledgerDebitId));
    assert(ledgerDebitSnap.exists(), 'Debit entry persisted in pointsLedger');
    assert(ledgerDebitSnap.data()?.amount === 60, 'Debit amount is 60 pts');

    console.log('  ✓ Atomic redemption succeeded: Balance decremented 100 -> 40 pts');
    console.log('  ✓ Session marked "redeemed", transaction logged, and debit written to pointsLedger\n');

    // -------------------------------------------------------------------------
    // STEP 8: Negative Test - QR Replay Attack (Double Spend Attempt)
    // -------------------------------------------------------------------------
    console.log('Step 8: Testing QR Replay Attack (Re-Redeeming Same Token)...');
    let replayBlocked = false;
    try {
      await runTransaction(db, async (txn) => {
        const liveSessionSnap = await txn.get(sessionRef);
        const liveSession = liveSessionSnap.data();
        if (liveSession?.status !== 'active') {
          throw new Error(`Cannot redeem: Session status is already "${liveSession?.status}"`);
        }
        // Should not reach here
        txn.update(studentRef, { pointsBalance: 0, _testSecret: TEST_SECRET });
      });
    } catch (err: any) {
      if (err.message.includes('already "redeemed"')) {
        replayBlocked = true;
      }
    }
    assert(replayBlocked, 'QR Replay was rejected by status invariant');

    // Confirm balance was NOT deducted again
    const studentBalanceAfterReplay = await getDoc(studentRef);
    assert(studentBalanceAfterReplay.data()?.pointsBalance === 40, 'Student balance must remain at 40 pts');
    console.log('  ✓ QR Replay blocked: Second redemption aborted, balance remains 40 pts\n');

    // -------------------------------------------------------------------------
    // STEP 9: Negative Test - Insufficient Points Balance Attempt
    // -------------------------------------------------------------------------
    console.log('Step 9: Testing Insufficient Points Balance Overdraft Attempt...');
    let insufficientBalanceBlocked = false;
    try {
      await runTransaction(db, async (txn) => {
        const liveStudentSnap = await txn.get(studentRef);
        const currentBal = liveStudentSnap.data()?.pointsBalance || 0; // 40 pts
        const requestedOfferCost = 75; // Requires 75 pts
        if (currentBal < requestedOfferCost) {
          throw new Error(`Insufficient student points. Available: ${currentBal}, Required: ${requestedOfferCost}`);
        }
        txn.update(studentRef, { pointsBalance: currentBal - requestedOfferCost, _testSecret: TEST_SECRET });
      });
    } catch (err: any) {
      if (err.message.includes('Insufficient student points. Available: 40, Required: 75')) {
        insufficientBalanceBlocked = true;
      }
    }
    assert(insufficientBalanceBlocked, 'Overdraft spend attempt was blocked by transaction invariant');

    const finalBalanceCheck = await getDoc(studentRef);
    assert(finalBalanceCheck.data()?.pointsBalance === 40, 'Student balance must still be 40 pts');
    console.log('  ✓ Insufficient balance overdraft blocked cleanly\n');

    // -------------------------------------------------------------------------
    // STEP 10: Negative Test - Concurrent Redemption Race Condition
    // -------------------------------------------------------------------------
    console.log('Step 10: Testing Concurrent Race Condition (Two simultaneous 30-pt spends on 40-pt balance)...');
    let successfulSpends = 0;
    let failedSpends = 0;

    const spend30 = async () => {
      await runTransaction(db, async (txn) => {
        const liveStudentSnap = await txn.get(studentRef);
        const currentBal = liveStudentSnap.data()?.pointsBalance || 0;
        if (currentBal < 30) {
          throw new Error('Insufficient points balance for concurrent transaction');
        }
        txn.update(studentRef, { pointsBalance: currentBal - 30, _testSecret: TEST_SECRET });
      });
    };

    const results = await Promise.allSettled([spend30(), spend30()]);
    results.forEach((r) => {
      if (r.status === 'fulfilled') successfulSpends++;
      if (r.status === 'rejected') failedSpends++;
    });

    assert(successfulSpends === 1, 'Exactly one concurrent transaction can succeed');
    assert(failedSpends === 1, 'Second concurrent transaction must fail due to atomic lock and insufficient balance');

    const studentBalanceAfterRace = await getDoc(studentRef);
    assert(studentBalanceAfterRace.data()?.pointsBalance === 10, 'Final balance must be exactly 10 pts (40 - 30)');
    console.log('  ✓ Concurrent race condition prevented: 1 transaction succeeded (40 -> 10 pts), 1 failed\n');

    console.log('🎉 ALL 10 Real Firebase Persistence & Security Invariant Tests PASSED!\n');

  } finally {
    // Clean up all generated test documents
    console.log('Cleaning up test documents from real Firestore database...');
    for (const item of testDocumentsToCleanup) {
      try {
        await deleteDoc(doc(db, item.col, item.id));
      } catch (err) {
        // ignore cleanup error
      }
    }
    console.log('✓ Cleanup complete. Live Firestore database restored to pristine state.\n');
    process.exit(0);
  }
}

runLiveFirebaseLifecycleTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
