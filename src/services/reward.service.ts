import { db } from "@/utils/db/dbConfig";
import { Rewards, Transactions } from "@/utils/db/schema";
import { eq, desc } from "drizzle-orm";
import { awardRewardWithIdempotency, redeemReward as redeemRewardAction } from "@/utils/db/actions";

export class RewardService {
  /**
   * Get reward record for a user (points balance + level).
   */
  static async getByUserId(userId: number) {
    try {
      const [reward] = await db
        .select()
        .from(Rewards)
        .where(eq(Rewards.userId, userId))
        .execute();
      return reward || null;
    } catch (error) {
      console.error("[RewardService.getByUserId] Error:", error);
      return null;
    }
  }

  /**
   * Get transaction history for a user (most recent first).
   */
  static async getTransactionHistory(userId: number, limit = 20) {
    try {
      return await db
        .select()
        .from(Transactions)
        .where(eq(Transactions.userId, userId))
        .orderBy(desc(Transactions.date))
        .limit(limit)
        .execute();
    } catch (error) {
      console.error("[RewardService.getTransactionHistory] Error:", error);
      return [];
    }
  }

  /**
   * Award points with DB-enforced idempotency (unique reference_key).
   * Will silently return duplicate:true if already claimed.
   */
  static async award(
    userId: number,
    amount: number,
    referenceKey: string,
    description: string
  ) {
    return awardRewardWithIdempotency(userId, amount, referenceKey, description);
  }

  /**
   * Redeem a reward by ID (or 0 to redeem all).
   */
  static async redeem(userId: number, rewardId: number) {
    return redeemRewardAction(userId, rewardId);
  }
}
