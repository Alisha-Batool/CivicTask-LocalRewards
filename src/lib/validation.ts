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

export const AiTaskMatchRequestSchema = z.object({
  interests: z.array(z.string().min(1).max(60)).min(1, 'Please select or provide at least one interest').max(10),
  skills: z.array(z.string().min(1).max(60)).min(1, 'Please select or provide at least one skill').max(10),
  availableHoursPerWeek: z.number().positive('Hours per week must be greater than 0').max(40, 'Hours per week cannot exceed 40'),
  additionalNotes: z.string().max(500).optional(),
});

export const AiTaskMatchItemSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  matchScore: z.number().min(0).max(100),
  matchReason: z.string().min(5, 'Match reason must be at least 5 characters').max(1000),
  keySkillOverlap: z.array(z.string().max(60)).optional().default([]),
});

export const AiTaskMatchResponseSchema = z.object({
  matches: z.array(AiTaskMatchItemSchema).max(10),
  summary: z.string().max(1000).optional().default(''),
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content cannot be empty').max(3000, 'Message is too long (max 3000 characters)'),
  timestamp: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required').max(30, 'Conversation history exceeds 30 messages limit'),
});

export const ChatResponseSchema = z.object({
  reply: z.string().min(1),
  model: z.string(),
  timestamp: z.string(),
});


