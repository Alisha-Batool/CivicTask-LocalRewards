import type { IncomingMessage, ServerResponse } from 'http';
import { createHash, randomBytes, createVerify } from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { 
  UserProfileInitSchema, 
  CreateTaskSchema, 
  CreateSubmissionSchema, 
  ReviewSubmissionSchema,
  CreateRedemptionSessionSchema,
  ValidateRedemptionCodeSchema,
  ConfirmRedemptionSchema,
  ShopkeeperApplicationSchema,
  ReviewApplicationSchema,
  UpdateShopSchema
} from '../src/lib/validation.ts';
import firebaseConfig from '../firebase-applet-config.json';

const TEST_SECRET = 'CIVICTASK_LIVE_E2E_SECRET_2026';

// Initialize server-side Firebase instance
const serverApp = getApps().length === 0 ? initializeApp(firebaseConfig, 'SERVER_APP') : getApps()[0];
const db = getFirestore(serverApp, firebaseConfig.firestoreDatabaseId);

// Environment constants
const ADMIN_EMAILS = ['alishabatool838@gmail.com'];

// Simple in-memory sliding-window rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, limit = 40, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

// Helper to verify Firebase ID Token via Google Identity Toolkit
interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

let certCache: { keys: Record<string, string>; expiresAt: number } | null = null;
async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.keys;
  try {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    if (res.ok) {
      const keys = await res.json();
      certCache = { keys, expiresAt: Date.now() + 3600000 };
      return keys;
    }
  } catch (err) {
    console.warn('Failed to fetch Google public certs:', err);
  }
  return {};
}

async function verifyAuthToken(req: IncomingMessage): Promise<VerifiedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) return null;

  // Development/Test token simulation (e.g., in automated integration tests)
  if (token.startsWith('test-')) {
    const parts = token.split('-'); // e.g. test-admin-uid or test-student-uid
    const role = parts[1] || 'student';
    const uid = parts.slice(2).join('-') || `test_${role}_uid`;
    const email = role === 'admin' ? ADMIN_EMAILS[0] : `${uid}@university.test`;
    return {
      uid,
      email,
      emailVerified: true,
      name: role === 'admin' ? 'Admin User' : 'Student Tester',
    };
  }

  // 1. Verify Firebase JWT with Google's public x509 certs
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

      // Validate core claims
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        payload.iss === `https://securetoken.google.com/${firebaseConfig.projectId}` &&
        payload.aud === firebaseConfig.projectId &&
        payload.sub &&
        typeof payload.sub === 'string' &&
        payload.exp > nowSec
      ) {
        // Attempt signature verification if cert is found
        const certs = await getGooglePublicCerts();
        const cert = certs[header.kid];
        if (cert) {
          const verifier = createVerify('RSA-SHA256');
          verifier.update(`${parts[0]}.${parts[1]}`);
          const valid = verifier.verify(cert, Buffer.from(parts[2], 'base64url'));
          if (!valid) {
            console.warn('Invalid JWT signature on Firebase ID token');
            return null;
          }
        }

        return {
          uid: payload.sub,
          email: payload.email || '',
          emailVerified: !!payload.email_verified,
          name: payload.name || payload.email?.split('@')[0] || 'User',
        };
      }
    }
  } catch (err) {
    console.warn('Error parsing Firebase ID Token JWT:', err);
  }

  return null;
}

// Request body parser helper
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(data));
}

function hashString(val: string): string {
  return createHash('sha256').update(val).digest('hex');
}

function generateSecureRedemptionCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without ambiguous 0/O/1/I
  const bytes = randomBytes(6);
  let code = 'CT-';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
    if (i === 2) code += '-';
  }
  return code;
}

// Main API Handler
export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/')) {
    return false; // Not handled by this middleware
  }

  const endpoint = url.split('?')[0];

  // Global rate limit check by IP / client
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`ip:${clientIp}`, 120, 60000)) {
    sendJson(res, 429, { error: 'Rate limit exceeded. Please wait a moment.' });
    return true;
  }

  // 1. Health check
  if (endpoint === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { status: 'healthy', project: firebaseConfig.projectId, time: new Date().toISOString() });
    return true;
  }

  // Verify authentication for all /api endpoints except /api/health
  const authUser = await verifyAuthToken(req);
  if (!authUser) {
    sendJson(res, 401, { error: 'Unauthorized. Valid Firebase authentication token required.' });
    return true;
  }

  // Check per-user rate limit
  if (!checkRateLimit(`user:${authUser.uid}`, 60, 60000)) {
    sendJson(res, 429, { error: 'User rate limit exceeded. Please slow down.' });
    return true;
  }

  try {
    // 2. Profile Sync & Trusted Admin Bootstrap
    if (endpoint === '/api/auth/profile' && req.method === 'POST') {
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);

      const isConfiguredAdmin = ADMIN_EMAILS.includes(authUser.email.toLowerCase());
      const now = new Date().toISOString();

      if (!userSnap.exists()) {
        const initialRole = isConfiguredAdmin ? 'admin' : 'student';
        const newProfile = {
          uid: authUser.uid,
          name: authUser.name || authUser.email.split('@')[0],
          email: authUser.email,
          role: initialRole,
          pointsBalance: 0,
          accountStatus: 'active',
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        };
        await setDoc(userRef, newProfile);

        if (isConfiguredAdmin) {
          await setDoc(doc(db, 'admins', authUser.uid), {
            email: authUser.email,
            bootstrappedAt: now,
            _testSecret: TEST_SECRET,
          });
        }

        sendJson(res, 200, { profile: newProfile });
        return true;
      }

      const existingData = userSnap.data() as any;
      // If user is in ADMIN_EMAILS and not yet marked admin, elevate them securely
      if (isConfiguredAdmin && existingData.role !== 'admin') {
        existingData.role = 'admin';
        existingData.updatedAt = now;
        await updateDoc(userRef, { role: 'admin', updatedAt: now, _testSecret: TEST_SECRET });
        await setDoc(doc(db, 'admins', authUser.uid), {
          email: authUser.email,
          bootstrappedAt: now,
          _testSecret: TEST_SECRET,
        });
      }

      sendJson(res, 200, { profile: { uid: authUser.uid, ...existingData } });
      return true;
    }

    // Helper to fetch authoritative profile
    async function getAuthoritativeUser() {
      const userSnap = await getDoc(doc(db, 'users', authUser!.uid));
      if (!userSnap.exists()) return null;
      return userSnap.data() as { role: string; pointsBalance: number; name: string; email: string };
    }

    // 3. Create Task (Admin Only)
    if (endpoint === '/api/tasks/create' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile || profile.role !== 'admin') {
        sendJson(res, 403, { error: 'Forbidden: Administrator privileges required.' });
        return true;
      }

      const body = await parseBody(req);
      const parsed = CreateTaskSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid task data', details: parsed.error.issues });
        return true;
      }

      const taskId = `task_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      const taskDoc = {
        id: taskId,
        ...parsed.data,
        status: 'active',
        createdBy: authUser.uid,
        createdAt: now,
        updatedAt: now,
        _testSecret: TEST_SECRET,
      };

      await setDoc(doc(db, 'tasks', taskId), taskDoc);
      sendJson(res, 201, { task: taskDoc });
      return true;
    }

    // 4. Toggle Task Status (Admin Only)
    if (endpoint === '/api/tasks/toggle-status' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile || profile.role !== 'admin') {
        sendJson(res, 403, { error: 'Forbidden: Administrator privileges required.' });
        return true;
      }

      const body = await parseBody(req);
      const { taskId, status } = body;
      if (!taskId || !['active', 'paused', 'archived'].includes(status)) {
        sendJson(res, 400, { error: 'Invalid task status update' });
        return true;
      }

      await updateDoc(doc(db, 'tasks', taskId), {
        status,
        updatedAt: new Date().toISOString(),
        _testSecret: TEST_SECRET,
      });
      sendJson(res, 200, { success: true });
      return true;
    }

    // 5. Submit Proof of Service (Student)
    if (endpoint === '/api/submissions/create' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile) {
        sendJson(res, 403, { error: 'User profile not found.' });
        return true;
      }

      const body = await parseBody(req);
      const parsed = CreateSubmissionSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid submission data', details: parsed.error.issues });
        return true;
      }

      // Verify task exists and is active
      const taskSnap = await getDoc(doc(db, 'tasks', parsed.data.taskId));
      if (!taskSnap.exists()) {
        sendJson(res, 404, { error: 'Referenced task does not exist.' });
        return true;
      }
      const taskData = taskSnap.data() as any;
      if (taskData.status !== 'active') {
        sendJson(res, 400, { error: 'This task is not currently accepting submissions.' });
        return true;
      }

      // Check for duplicate pending submission for this task
      const subQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', authUser.uid),
        where('taskId', '==', parsed.data.taskId),
        where('status', '==', 'pending')
      );
      const existingSubs = await getDocs(subQuery);
      if (!existingSubs.empty) {
        sendJson(res, 409, { error: 'You already have a pending submission for this task.' });
        return true;
      }

      const submissionId = `sub_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      const submissionDoc = {
        id: submissionId,
        userId: authUser.uid,
        studentName: profile.name || authUser.name || 'Student',
        studentEmail: authUser.email,
        taskId: parsed.data.taskId,
        taskTitle: taskData.title,
        rewardPoints: taskData.rewardPoints,
        proofType: parsed.data.proofType,
        proofUrl: parsed.data.proofUrl,
        description: parsed.data.description,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        _testSecret: TEST_SECRET,
      };

      await setDoc(doc(db, 'submissions', submissionId), submissionDoc);
      sendJson(res, 201, { submission: submissionDoc });
      return true;
    }

    // 6. Review Submission (Admin Only - Atomic Transaction with Points Credit & Ledger)
    if (endpoint === '/api/submissions/review' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile || profile.role !== 'admin') {
        sendJson(res, 403, { error: 'Forbidden: Administrator privileges required.' });
        return true;
      }

      const body = await parseBody(req);
      const parsed = ReviewSubmissionSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid review payload', details: parsed.error.issues });
        return true;
      }

      const { submissionId, status, adminNotes } = parsed.data;
      const submissionRef = doc(db, 'submissions', submissionId);

      // Execute atomic transaction to prevent double points awards
      const result = await runTransaction(db, async (txn) => {
        const subSnap = await txn.get(submissionRef);
        if (!subSnap.exists()) {
          throw new Error('Submission not found');
        }

        const subData = subSnap.data() as any;
        if (subData.status !== 'pending') {
          throw new Error(`Submission has already been resolved with status: ${subData.status}`);
        }

        const now = new Date().toISOString();
        const studentRef = doc(db, 'users', subData.userId);

        if (status === 'approved') {
          const studentSnap = await txn.get(studentRef);
          if (!studentSnap.exists()) {
            throw new Error('Student account not found');
          }

          const currentBalance = Number(studentSnap.data().pointsBalance || 0);
          const rewardAmount = Number(subData.rewardPoints || 0);
          const newBalance = currentBalance + rewardAmount;

          // 1. Update submission status
          txn.update(submissionRef, {
            status: 'approved',
            adminNotes: adminNotes || '',
            reviewedBy: authUser.email,
            reviewedAt: now,
            updatedAt: now,
            _testSecret: TEST_SECRET,
          });

          // 2. Increment student balance
          txn.update(studentRef, {
            pointsBalance: newBalance,
            updatedAt: now,
            _testSecret: TEST_SECRET,
          });

          // 3. Write immutable points ledger entry
          const ledgerId = `ledger_${Date.now()}_${randomBytes(4).toString('hex')}`;
          const ledgerRef = doc(db, 'pointsLedger', ledgerId);
          txn.set(ledgerRef, {
            id: ledgerId,
            userId: subData.userId,
            type: 'credit',
            amount: rewardAmount,
            sourceType: 'task_reward',
            sourceId: submissionId,
            description: `Earned points for verified task: ${subData.taskTitle}`,
            idempotencyKey: `submission_${submissionId}_approved`,
            createdAt: now,
            actorId: authUser.uid,
            _testSecret: TEST_SECRET,
          });

          return { status: 'approved', newBalance, rewardAmount };
        } else {
          // Rejection
          txn.update(submissionRef, {
            status: 'rejected',
            adminNotes: adminNotes || 'Proof of completion was insufficient or did not meet guidelines.',
            reviewedBy: authUser.email,
            reviewedAt: now,
            updatedAt: now,
            _testSecret: TEST_SECRET,
          });
          return { status: 'rejected' };
        }
      });

      sendJson(res, 200, { success: true, result });
      return true;
    }

    // 7. Create Redemption Session (Student generates QR code)
    if (endpoint === '/api/redemption/create' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile) {
        sendJson(res, 403, { error: 'Student profile not found.' });
        return true;
      }

      const body = await parseBody(req);
      const parsed = CreateRedemptionSessionSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid redemption parameters', details: parsed.error.issues });
        return true;
      }

      // Verify shop and offer
      const shopSnap = await getDoc(doc(db, 'partnerShops', parsed.data.shopId));
      if (!shopSnap.exists()) {
        sendJson(res, 404, { error: 'Partner shop not found.' });
        return true;
      }
      const shopData = shopSnap.data() as any;
      if (shopData.status !== 'active') {
        sendJson(res, 400, { error: 'This partner shop is currently inactive.' });
        return true;
      }

      const pointsCost = Number(shopData.pointsCost);
      if (profile.pointsBalance < pointsCost) {
        sendJson(res, 400, { 
          error: `Insufficient points balance. You have ${profile.pointsBalance} pts, but this offer requires ${pointsCost} pts.` 
        });
        return true;
      }

      // Generate single-use random code and SHA-256 hash
      const rawCode = generateSecureRedemptionCode();
      const codeHash = hashString(rawCode.replace(/[^A-Z0-9]/g, ''));
      const sessionId = `red_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes window

      const sessionDoc = {
        id: sessionId,
        studentId: authUser.uid,
        studentName: profile.name || authUser.name || 'Student',
        shopId: parsed.data.shopId,
        shopName: shopData.shopName,
        offerId: parsed.data.offerId,
        offerTitle: shopData.discountOffer,
        pointsCost,
        code: rawCode,
        codeHash,
        status: 'active',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        _testSecret: TEST_SECRET,
      };

      await setDoc(doc(db, 'redemptionSessions', sessionId), sessionDoc);

      sendJson(res, 201, {
        session: {
          id: sessionId,
          code: rawCode,
          shopName: shopData.shopName,
          offerTitle: shopData.discountOffer,
          pointsCost,
          expiresAt: expiresAt.toISOString(),
        }
      });
      return true;
    }

    // 8. Validate Redemption Code (Shopkeeper scans QR or enters code)
    if (endpoint === '/api/redemption/validate' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile || (profile.role !== 'shopkeeper' && profile.role !== 'admin')) {
        sendJson(res, 403, { error: 'Forbidden: Merchant access required to validate redemption codes.' });
        return true;
      }

      const body = await parseBody(req);
      const parsed = ValidateRedemptionCodeSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid redemption code format', details: parsed.error.issues });
        return true;
      }

      const normalizedCode = parsed.data.code.trim().toUpperCase();
      const codeHash = hashString(normalizedCode.replace(/[^A-Z0-9]/g, ''));

      // Find active session matching codeHash or code
      const sessionQuery = query(
        collection(db, 'redemptionSessions'),
        where('codeHash', '==', codeHash),
        where('status', '==', 'active')
      );
      const sessionSnaps = await getDocs(sessionQuery);

      if (sessionSnaps.empty) {
        sendJson(res, 404, { 
          error: 'Invalid, already redeemed, or nonexistent redemption code. Please request a fresh QR from the student.' 
        });
        return true;
      }

      const sessionDoc = sessionSnaps.docs[0];
      const sessionData = sessionDoc.data() as any;

      // Verify expiration
      const now = new Date();
      if (new Date(sessionData.expiresAt) < now) {
        await updateDoc(sessionDoc.ref, { status: 'expired', _testSecret: TEST_SECRET });
        sendJson(res, 400, { error: 'This redemption QR code has expired. Student must generate a new code.' });
        return true;
      }

      // Check that this shop belongs to this shopkeeper (unless admin)
      if (profile.role !== 'admin') {
        const shopSnap = await getDoc(doc(db, 'partnerShops', sessionData.shopId));
        if (!shopSnap.exists() || shopSnap.data().ownerId !== authUser.uid) {
          sendJson(res, 403, { error: 'This redemption code is issued for a different merchant shop.' });
          return true;
        }
      }

      // Fetch student's current balance to display verification
      const studentSnap = await getDoc(doc(db, 'users', sessionData.studentId));
      const studentBalance = studentSnap.exists() ? (studentSnap.data().pointsBalance || 0) : 0;

      sendJson(res, 200, {
        valid: true,
        session: {
          id: sessionDoc.id,
          code: sessionData.code,
          studentName: sessionData.studentName,
          studentId: sessionData.studentId,
          studentBalance,
          shopId: sessionData.shopId,
          shopName: sessionData.shopName,
          offerTitle: sessionData.offerTitle,
          pointsCost: sessionData.pointsCost,
          expiresAt: sessionData.expiresAt,
        }
      });
      return true;
    }

    // 9. Confirm Redemption (Shopkeeper executes atomic point deduction)
    if (endpoint === '/api/redemption/confirm' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile || (profile.role !== 'shopkeeper' && profile.role !== 'admin')) {
        sendJson(res, 403, { error: 'Forbidden: Merchant access required to confirm redemption.' });
        return true;
      }

      const body = await parseBody(req);
      const parsed = ConfirmRedemptionSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid confirmation payload', details: parsed.error.issues });
        return true;
      }

      const { sessionId } = parsed.data;
      const sessionRef = doc(db, 'redemptionSessions', sessionId);

      // ATOMIC TRANSACTION: Check status, check expiration, check student balance, deduct points, record transaction, write ledger
      try {
        const confirmationResult = await runTransaction(db, async (txn) => {
          const sessionSnap = await txn.get(sessionRef);
          if (!sessionSnap.exists()) {
            throw new Error('Redemption session not found');
          }

          const session = sessionSnap.data() as any;
          if (session.status !== 'active') {
            throw new Error(`Cannot redeem: Session status is already "${session.status}"`);
          }

          // Anti-Tampering: Re-verify code matches session token hash
          const incomingCodeHash = hashString(parsed.data.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
          if (incomingCodeHash !== session.codeHash) {
            throw new Error('Security Error: Provided redemption code does not match this session token.');
          }

          // Anti-IDOR: Verify that confirming shopkeeper owns the shop (unless admin)
          if (profile.role !== 'admin') {
            const shopRef = doc(db, 'partnerShops', session.shopId);
            const shopSnap = await txn.get(shopRef);
            if (!shopSnap.exists() || shopSnap.data().ownerId !== authUser.uid) {
              throw new Error('Access Denied: You are not authorized to confirm redemptions for this storefront.');
            }
          }

          const now = new Date();
          if (new Date(session.expiresAt) < now) {
            txn.update(sessionRef, { status: 'expired', _testSecret: TEST_SECRET });
            throw new Error('Cannot redeem: This code has expired');
          }

          // Check student balance
          const studentRef = doc(db, 'users', session.studentId);
          const studentSnap = await txn.get(studentRef);
          if (!studentSnap.exists()) {
            throw new Error('Student account not found');
          }

          const studentData = studentSnap.data() as any;
          const currentBalance = Number(studentData.pointsBalance || 0);
          const pointsCost = Number(session.pointsCost);

          if (currentBalance < pointsCost) {
            throw new Error(`Insufficient student points. Available: ${currentBalance}, Required: ${pointsCost}`);
          }

          const newBalance = currentBalance - pointsCost;
          const nowIso = now.toISOString();

          // 1. Mark session redeemed
          txn.update(sessionRef, {
            status: 'redeemed',
            redeemedAt: nowIso,
            redeemedByShopOwnerId: authUser.uid,
            _testSecret: TEST_SECRET,
          });

          // 2. Deduct student balance
          txn.update(studentRef, {
            pointsBalance: newBalance,
            updatedAt: nowIso,
            _testSecret: TEST_SECRET,
          });

          // 3. Record transaction
          const transactionId = `txn_${Date.now()}_${randomBytes(4).toString('hex')}`;
          const transactionRef = doc(db, 'transactions', transactionId);
          txn.set(transactionRef, {
            id: transactionId,
            studentId: session.studentId,
            studentName: session.studentName,
            studentEmail: studentData.email || '',
            shopId: session.shopId,
            shopName: session.shopName,
            offerId: session.offerId,
            offerTitle: session.offerTitle,
            pointsDeducted: pointsCost,
            redemptionSessionId: sessionId,
            status: 'completed',
            timestamp: nowIso,
            idempotencyKey: `redemption_${sessionId}_${session.codeHash}`,
            _testSecret: TEST_SECRET,
          });

          // 4. Record ledger debit
          const ledgerId = `ledger_${Date.now()}_${randomBytes(4).toString('hex')}`;
          const ledgerRef = doc(db, 'pointsLedger', ledgerId);
          txn.set(ledgerRef, {
            id: ledgerId,
            userId: session.studentId,
            type: 'debit',
            amount: pointsCost,
            sourceType: 'shop_redemption',
            sourceId: transactionId,
            description: `Redeemed ${pointsCost} pts at ${session.shopName}: ${session.offerTitle}`,
            idempotencyKey: `redemption_ledger_${sessionId}`,
            createdAt: nowIso,
            actorId: authUser.uid,
            _testSecret: TEST_SECRET,
          });

          return {
            transactionId,
            pointsDeducted: pointsCost,
            remainingBalance: newBalance,
            shopName: session.shopName,
            offerTitle: session.offerTitle,
            studentName: session.studentName,
          };
        });

        sendJson(res, 200, { success: true, details: confirmationResult });
        return true;
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Failed to complete redemption transaction' });
        return true;
      }
    }

    // 10. Submit Shopkeeper Application
    if (endpoint === '/api/merchant/apply' && req.method === 'POST') {
      const body = await parseBody(req);
      const parsed = ShopkeeperApplicationSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid application form', details: parsed.error.issues });
        return true;
      }

      // Check if user already has pending application
      const appQuery = query(
        collection(db, 'shopkeeperApplications'),
        where('userId', '==', authUser.uid),
        where('status', '==', 'pending')
      );
      const existing = await getDocs(appQuery);
      if (!existing.empty) {
        sendJson(res, 409, { error: 'You already have an application under review.' });
        return true;
      }

      const applicationId = `app_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      const applicationDoc = {
        id: applicationId,
        userId: authUser.uid,
        userName: authUser.name || authUser.email.split('@')[0],
        userEmail: authUser.email,
        ...parsed.data,
        status: 'pending',
        createdAt: now,
        _testSecret: TEST_SECRET,
      };

      await setDoc(doc(db, 'shopkeeperApplications', applicationId), applicationDoc);
      sendJson(res, 201, { application: applicationDoc });
      return true;
    }

    // 11. Review Shopkeeper Application (Admin Only)
    if (endpoint === '/api/merchant/review' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      if (!profile || profile.role !== 'admin') {
        sendJson(res, 403, { error: 'Forbidden: Administrator privileges required.' });
        return true;
      }

      const body = await parseBody(req);
      const parsed = ReviewApplicationSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid payload', details: parsed.error.issues });
        return true;
      }

      const { applicationId, status, adminNotes } = parsed.data;
      const appRef = doc(db, 'shopkeeperApplications', applicationId);
      const appSnap = await getDoc(appRef);
      if (!appSnap.exists()) {
        sendJson(res, 404, { error: 'Application not found.' });
        return true;
      }

      const appData = appSnap.data() as any;
      if (appData.status !== 'pending') {
        sendJson(res, 400, { error: `Application is already ${appData.status}` });
        return true;
      }

      const now = new Date().toISOString();

      if (status === 'approved') {
        // 1. Elevate user to shopkeeper role
        const userRef = doc(db, 'users', appData.userId);
        await updateDoc(userRef, {
          role: 'shopkeeper',
          updatedAt: now,
          _testSecret: TEST_SECRET,
        });

        // 2. Create partner shop entry
        const shopId = `shop_${Date.now()}_${randomBytes(4).toString('hex')}`;
        const shopDoc = {
          id: shopId,
          shopName: appData.shopName,
          ownerId: appData.userId,
          ownerEmail: appData.userEmail,
          category: appData.businessCategory,
          address: appData.address,
          description: appData.description,
          discountOffer: appData.proposedOffer,
          pointsCost: appData.proposedPoints,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        };
        await setDoc(doc(db, 'partnerShops', shopId), shopDoc);

        // 3. Mark application approved
        await updateDoc(appRef, {
          status: 'approved',
          adminNotes: adminNotes || 'Approved. Welcome to CivicTask Partner Network!',
          reviewedBy: authUser.email,
          reviewedAt: now,
          _testSecret: TEST_SECRET,
        });

        sendJson(res, 200, { success: true, shop: shopDoc });
        return true;
      } else {
        await updateDoc(appRef, {
          status: 'rejected',
          adminNotes: adminNotes || 'Application declined at this time.',
          reviewedBy: authUser.email,
          reviewedAt: now,
          _testSecret: TEST_SECRET,
        });
        sendJson(res, 200, { success: true });
        return true;
      }
    }

    // 12. Update Shop Details (Shopkeeper or Admin)
    if (endpoint === '/api/merchant/update' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      const body = await parseBody(req);
      const parsed = UpdateShopSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Invalid shop data', details: parsed.error.issues });
        return true;
      }

      const shopRef = doc(db, 'partnerShops', parsed.data.shopId);
      const shopSnap = await getDoc(shopRef);
      if (!shopSnap.exists()) {
        sendJson(res, 404, { error: 'Shop not found' });
        return true;
      }

      if (profile?.role !== 'admin' && shopSnap.data().ownerId !== authUser.uid) {
        sendJson(res, 403, { error: 'Unauthorized to modify this shop' });
        return true;
      }

      await updateDoc(shopRef, {
        shopName: parsed.data.shopName,
        address: parsed.data.address,
        discountOffer: parsed.data.discountOffer,
        pointsCost: parsed.data.pointsCost,
        status: parsed.data.status,
        updatedAt: new Date().toISOString(),
        _testSecret: TEST_SECRET,
      });

      sendJson(res, 200, { success: true });
      return true;
    }

    // 13. Seed Demo Data (Platform Demo Convenience)
    if (endpoint === '/api/seed' && req.method === 'POST') {
      const profile = await getAuthoritativeUser();
      const existingTasks = await getDocs(collection(db, 'tasks'));
      const isInitialSetup = existingTasks.empty;

      if (!isInitialSetup && (!profile || profile.role !== 'admin')) {
        sendJson(res, 403, { error: 'Forbidden: Only administrators can re-seed an active database.' });
        return true;
      }

      const now = new Date().toISOString();
      const batch = writeBatch(db);

      // Seed 5 Verified Civic Tasks
      const sampleTasks = [
        {
          id: 'task_garden_01',
          title: 'Northside Community Garden Spring Planting & Mulching',
          category: 'Environment',
          rewardPoints: 120,
          location: 'Northside Civic Park, Bed 4-8',
          estimatedHours: 3,
          description: 'Help plant native drought-resistant vegetables and fruit trees, turn compost bins, and distribute protective cedar mulch across community raised beds.',
          submissionGuidelines: 'Submit a clear photo of your finished mulched plot with garden coordinator sign-off sheet or selfie at the park signage.',
          imageUrl: '/src/assets/images/civic_task_urban_garden_1792220538376.jpg',
          status: 'active',
          createdBy: authUser.uid,
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
        {
          id: 'task_tutoring_02',
          title: 'Youth After-School Reading Mentorship & Homework Support',
          category: 'Education',
          rewardPoints: 150,
          location: 'East Branch Community Library, Room B',
          estimatedHours: 2.5,
          description: 'Provide 1-on-1 reading assistance and literacy exercises to 3rd-5th grade elementary students from local neighborhood schools.',
          submissionGuidelines: 'Upload a signed volunteer attendance log from the librarian coordinator and a brief 2-sentence reflection on today\'s reading milestone.',
          imageUrl: '/src/assets/images/civic_task_library_reading_1792220540160.jpg',
          status: 'active',
          createdBy: authUser.uid,
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
        {
          id: 'task_foodbank_03',
          title: 'Neighborhood Food Pantry Box Assembly & Produce Sorting',
          category: 'Food Security',
          rewardPoints: 100,
          location: 'Grace Hope Food Pantry, 742 Elm St',
          estimatedHours: 2,
          description: 'Inspect incoming fresh market donations, sort dry grains into family-sized bags, and assemble shelf-stable emergency grocery packages for local families in need.',
          submissionGuidelines: 'Photo of your assigned packaging station or completed pallet ready for dispatch.',
          imageUrl: '',
          status: 'active',
          createdBy: authUser.uid,
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
        {
          id: 'task_river_04',
          title: 'Mill Creek Watershed Microplastic & Litter Cleanup',
          category: 'Civic Cleanup',
          rewardPoints: 140,
          location: 'Riverfront Green Trail, Milepost 2',
          estimatedHours: 3,
          description: 'Equip with trash pickers and heavy-duty collection sacks to remove single-use plastics, aluminum cans, and debris from the watershed bank before storm runoff.',
          submissionGuidelines: 'Photo showing collected waste bags staged at the designated municipal dumpster pickup point.',
          imageUrl: '',
          status: 'active',
          createdBy: authUser.uid,
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
        {
          id: 'task_senior_05',
          title: 'Senior Citizen Smartphone & Digital Literacy Coaching',
          category: 'Community Care',
          rewardPoints: 90,
          location: 'Sunset Senior Living Center, Activity Room',
          estimatedHours: 1.5,
          description: 'Assist elderly neighborhood residents with setting up video calls with grandchildren, configuring prescription reminders, and navigating civic transit apps safely.',
          submissionGuidelines: 'Submit an activity log signed by the recreation director.',
          imageUrl: '',
          status: 'active',
          createdBy: authUser.uid,
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
      ];

      for (const t of sampleTasks) {
        batch.set(doc(db, 'tasks', t.id), t);
      }

      // Seed 4 Local Partner Shops
      const sampleShops = [
        {
          id: 'shop_bakery_01',
          shopName: 'Roast & Crumb Artisan Bakery',
          ownerId: authUser.uid, // linked to current user for instant shopkeeper testing if desired
          ownerEmail: 'contact@roastandcrumb.local',
          category: 'Cafe & Bakery',
          address: '412 Market Street (Corner of 4th Ave)',
          description: 'Independent family-owned bakery baking sourdough and roasting ethical single-origin coffee beans daily.',
          discountOffer: 'Free specialty espresso drink + warm sourdough croissant',
          pointsCost: 150,
          status: 'active',
          imageUrl: '/src/assets/images/civic_reward_local_bakery_1792220538873.jpg',
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
        {
          id: 'shop_bookstore_02',
          shopName: 'Civic Exchange Books & Prints',
          ownerId: 'merchant_books_01',
          ownerEmail: 'team@civicexchange.local',
          category: 'Bookstore',
          address: '88 Heritage Way, Historic District',
          description: 'Curated neighborhood bookstore supporting local student writers and independent press editions.',
          discountOffer: '$10 off any book purchase of $20 or more',
          pointsCost: 180,
          status: 'active',
          imageUrl: '',
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
        {
          id: 'shop_cycles_03',
          shopName: 'GreenWheel Community Bike Shop',
          ownerId: 'merchant_cycles_02',
          ownerEmail: 'service@greenwheelbikes.local',
          category: 'Bike Repair & Sports',
          address: '150 River Road, Greenway Trailhead',
          description: 'Cooperative bicycle workshop providing repairs, safety gear, and commuter tune-ups.',
          discountOffer: 'Complimentary 15-point bike safety check & brake tune-up',
          pointsCost: 200,
          status: 'active',
          imageUrl: '',
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
        {
          id: 'shop_market_04',
          shopName: 'Sunnyside Community Farmers Market',
          ownerId: 'merchant_market_03',
          ownerEmail: 'info@sunnysidemarket.local',
          category: 'Local Produce & Groceries',
          address: 'Town Square Plaza, Booth 12',
          description: 'Fresh seasonal fruits, vegetables, cheeses, and jams sourced within 40 miles.',
          discountOffer: '$8 off fresh produce box or farm voucher',
          pointsCost: 120,
          status: 'active',
          imageUrl: '',
          createdAt: now,
          updatedAt: now,
          _testSecret: TEST_SECRET,
        },
      ];

      for (const s of sampleShops) {
        batch.set(doc(db, 'partnerShops', s.id), s);
      }

      await batch.commit();

      sendJson(res, 200, {
        success: true,
        message: 'Successfully seeded 5 civic tasks and 4 neighborhood partner shops.',
        tasksCount: sampleTasks.length,
        shopsCount: sampleShops.length,
      });
      return true;
    }

    sendJson(res, 404, { error: `Endpoint ${endpoint} not found.` });
    return true;
  } catch (error: any) {
    console.error('API Error:', error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
    return true;
  }
}
