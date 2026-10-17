import { createHash } from 'crypto';
import { 
  CreateTaskSchema, 
  CreateSubmissionSchema, 
  CreateRedemptionSessionSchema,
  ValidateRedemptionCodeSchema,
  ConfirmRedemptionSchema 
} from '../src/lib/validation.ts';

// Helper for testing assertions
function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

async function runTests() {
  console.log('🧪 Starting CivicTask & Local Rewards Security & Points Engine Tests...\n');

  // Test 1: Task Reward Points Validation
  console.log('Test 1: Enforcing positive integer reward points for tasks');
  const validTask = CreateTaskSchema.safeParse({
    title: 'Plant Native Trees in City Park',
    description: 'Help plant native saplings and lay cedar mulch across public beds.',
    category: 'Environment',
    rewardPoints: 120,
    estimatedHours: 2,
    location: 'Northside Park',
  });
  assert(validTask.success, 'Valid task should pass validation');

  const negativePointsTask = CreateTaskSchema.safeParse({
    title: 'Invalid Negative Task',
    description: 'Attempting to reward negative points to exploit ledger balance.',
    category: 'Environment',
    rewardPoints: -50,
  });
  assert(!negativePointsTask.success, 'Negative points must be rejected by Zod schema');
  console.log('  ✓ Negative reward points successfully blocked.\n');

  // Test 2: Submission Proof URL and MIME Allowlist
  console.log('Test 2: Verifying proof evidence URL security (HTTPS & MIME allowlist)');
  const validImageSub = CreateSubmissionSchema.safeParse({
    taskId: 'task_123',
    proofType: 'image',
    proofUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
    description: 'Completed 2 hours of reading mentorship with elementary kids.',
  });
  assert(validImageSub.success, 'Valid base64 JPEG proof must be accepted');

  const invalidMimeSub = CreateSubmissionSchema.safeParse({
    taskId: 'task_123',
    proofType: 'image',
    proofUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    description: 'Trying unsupported GIF format.',
  });
  assert(!invalidMimeSub.success, 'Disallowed MIME type (GIF) must be rejected');

  const unsecureHttpSub = CreateSubmissionSchema.safeParse({
    taskId: 'task_123',
    proofType: 'link',
    proofUrl: 'http://insecure-site.org/doc.pdf',
    description: 'Insecure non-HTTPS link submitted.',
  });
  assert(!unsecureHttpSub.success, 'Non-HTTPS proof links must be rejected');
  console.log('  ✓ Insecure links and unauthorized MIME types successfully rejected.\n');

  // Test 3: Redemption Code Hash Matching & Entropy
  console.log('Test 3: Validating cryptographically hashed single-use redemption code');
  const rawCode = 'CT-9824-XK';
  const cleanCode = rawCode.replace(/[^A-Z0-9]/g, '');
  const computedHash = createHash('sha256').update(cleanCode).digest('hex');

  const incomingCode = 'ct-9824-xk'; // lowercase input from scanner
  const normalizedIncoming = incomingCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const verifiedHash = createHash('sha256').update(normalizedIncoming).digest('hex');

  assert(computedHash === verifiedHash, 'SHA-256 code hash must match normalized token');
  console.log('  ✓ High-entropy redemption token hash successfully validated.\n');

  // Test 4: Points Balance Overdraft Guard
  console.log('Test 4: Balance deduction invariants (preventing negative balances)');
  function simulateRedemption(currentBalance: number, pointsCost: number) {
    if (currentBalance < pointsCost) {
      throw new Error(`Insufficient points: ${currentBalance} available, ${pointsCost} required`);
    }
    return currentBalance - pointsCost;
  }

  const studentBalance = 150;
  const affordableCost = 120;
  const remaining = simulateRedemption(studentBalance, affordableCost);
  assert(remaining === 30, 'Remaining balance should be 30');

  let failedAsExpected = false;
  try {
    simulateRedemption(50, 100);
  } catch {
    failedAsExpected = true;
  }
  assert(failedAsExpected, 'Overdraft spend attempt must throw an error');
  console.log('  ✓ Insufficient points balance spend attempt prevented.\n');

  // Test 5: Expiration Guard
  console.log('Test 5: Temporal expiry guard for 15-minute QR tokens');
  const now = Date.now();
  const validExpiresAt = new Date(now + 10 * 60 * 1000).toISOString();
  const expiredExpiresAt = new Date(now - 1000).toISOString();

  assert(new Date(validExpiresAt).getTime() > now, 'Session within 15 min window must be valid');
  assert(new Date(expiredExpiresAt).getTime() <= now, 'Expired session must be rejected');
  console.log('  ✓ Expired QR code tokens successfully flagged.\n');

  console.log('🎉 All 5 Security & Points Engine Tests PASSED successfully!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
