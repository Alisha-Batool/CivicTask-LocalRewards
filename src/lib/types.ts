export type UserRole = 'student' | 'shopkeeper' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'pending';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  pointsBalance: number;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export type TaskCategory = 
  | 'Environment' 
  | 'Education' 
  | 'Food Security' 
  | 'Community Care' 
  | 'Animal Welfare' 
  | 'Civic Cleanup';

export type TaskStatus = 'active' | 'paused' | 'archived';

export interface CivicTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  rewardPoints: number;
  status: TaskStatus;
  location?: string;
  estimatedHours?: number;
  submissionGuidelines?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type ProofType = 'image' | 'link';

export interface TaskSubmission {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  taskId: string;
  taskTitle: string;
  rewardPoints: number;
  proofType: ProofType;
  proofUrl: string;
  description: string;
  status: SubmissionStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerShop {
  id: string;
  shopName: string;
  ownerId: string;
  ownerEmail?: string;
  category?: string;
  address: string;
  description?: string;
  discountOffer: string;
  pointsCost: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RedemptionSession {
  id: string;
  studentId: string;
  studentName: string;
  shopId: string;
  shopName: string;
  offerId: string;
  offerTitle: string;
  pointsCost: number;
  code: string;
  codeHash: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  redeemedAt?: string;
  redeemedByShopOwnerId?: string;
}

export interface CivicTransaction {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  shopId: string;
  shopName: string;
  offerId: string;
  offerTitle: string;
  pointsDeducted: number;
  redemptionSessionId: string;
  status: 'completed' | 'refunded';
  timestamp: string;
  idempotencyKey: string;
}

export interface PointsLedgerEntry {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  sourceType: 'task_reward' | 'shop_redemption' | 'manual_adjustment';
  sourceId: string;
  description: string;
  idempotencyKey: string;
  createdAt: string;
  actorId: string;
}

export interface ShopkeeperApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  shopName: string;
  businessCategory: string;
  address: string;
  description: string;
  proposedOffer: string;
  proposedPoints: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
  createdAt: string;
  reviewedAt?: string;
}
