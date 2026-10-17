import { z } from 'zod';

export const UserRoleSchema = z.enum(['student', 'shopkeeper', 'admin']);
export const AccountStatusSchema = z.enum(['active', 'suspended', 'pending']);

export const UserProfileInitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(150),
});

export const TaskCategorySchema = z.enum([
  'Environment',
  'Education',
  'Food Security',
  'Community Care',
  'Animal Welfare',
  'Civic Cleanup',
]);

export const CreateTaskSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: TaskCategorySchema,
  rewardPoints: z.number().int().positive('Reward points must be a positive integer'),
  location: z.string().max(200).optional(),
  estimatedHours: z.number().positive().max(100).optional(),
  submissionGuidelines: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const CreateSubmissionSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  proofType: z.enum(['image', 'link']),
  proofUrl: z.string().min(1, 'Proof evidence is required'),
  description: z.string().min(10, 'Please provide at least 10 characters describing your service').max(2000),
}).refine((data) => {
  if (data.proofType === 'link') {
    try {
      const url = new URL(data.proofUrl);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  if (data.proofType === 'image') {
    // Validates data URL format or https URL
    if (data.proofUrl.startsWith('data:image/')) {
      const match = data.proofUrl.match(/^data:image\/(jpeg|png|webp);base64,/);
      return !!match;
    }
    return data.proofUrl.startsWith('https://');
  }
  return true;
}, {
  message: 'Proof link must be a valid HTTPS URL or an image (JPEG, PNG, WebP) under 5MB',
  path: ['proofUrl'],
});

export const ReviewSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
});

export const CreateRedemptionSessionSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
  offerId: z.string().min(1, 'Offer ID is required'),
});

export const ValidateRedemptionCodeSchema = z.object({
  code: z.string().min(4, 'Redemption code is required').max(32),
});

export const ConfirmRedemptionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  code: z.string().min(4).max(32),
});

export const ShopkeeperApplicationSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').max(120),
  businessCategory: z.string().min(2).max(60),
  address: z.string().min(5, 'Storefront address must be at least 5 characters').max(250),
  description: z.string().min(10, 'Please describe your business').max(1000),
  proposedOffer: z.string().min(5, 'Please describe your proposed student discount').max(200),
  proposedPoints: z.number().int().positive('Point cost must be a positive integer'),
});

export const ReviewApplicationSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
});

export const UpdateShopSchema = z.object({
  shopId: z.string().min(1),
  shopName: z.string().min(2).max(120),
  address: z.string().min(5).max(250),
  discountOffer: z.string().min(3).max(200),
  pointsCost: z.number().int().positive(),
  status: z.enum(['active', 'inactive']),
});
