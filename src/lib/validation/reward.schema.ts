import { z } from "zod";

export const RedeemRewardSchema = z.object({
  rewardId: z.number().int().min(0, "Invalid reward ID"),
});

export const AwardRewardSchema = z.object({
  userId: z.number().int().positive("Invalid user ID"),
  amount: z.number().int().positive("Reward amount must be a positive number"),
  referenceKey: z.string().trim().min(3, "Reference key must be at least 3 characters"),
  description: z.string().trim().min(3).max(255),
});

export type RedeemRewardInput = z.infer<typeof RedeemRewardSchema>;
export type AwardRewardInput = z.infer<typeof AwardRewardSchema>;
