import { db } from "@/utils/db/dbConfig";
import { CollectedWastes } from "@/utils/db/schema";
import { eq, desc } from "drizzle-orm";
import { awardRewardWithIdempotency } from "@/utils/db/actions";

export class VolunteerService {
  /**
   * Get all tasks collected by a volunteer (user).
   */
  static async getTasksByCollector(userId: number) {
    try {
      return await db
        .select()
        .from(CollectedWastes)
        .where(eq(CollectedWastes.collectorId, userId))
        .orderBy(desc(CollectedWastes.collectionDate))
        .execute();
    } catch (error) {
      console.error("[VolunteerService.getTasksByCollector] Error:", error);
      return [];
    }
  }

  /**
   * Mark a CollectedWaste task as verified and award XP.
   * Idempotent: repeated calls for the same task won't double-award XP.
   */
  static async completeTask(
    collectorId: number,
    reportId: number
  ) {
    try {
      // 1. Upsert the collection record
      const [record] = await db
        .insert(CollectedWastes)
        .values({
          reportId,
          collectorId,
          collectionDate: new Date(),
          status: "collected",
        })
        .onConflictDoNothing()
        .returning()
        .execute();

      if (!record) {
        // Already exists (conflict) — treat as duplicate
        return { success: false, duplicate: true };
      }

      // 2. Award XP with DB-enforced idempotency
      const referenceKey = `volunteer-task-${reportId}-${collectorId}`;
      const reward = await awardRewardWithIdempotency(
        collectorId,
        100,
        referenceKey,
        `Volunteer cleanup for report #${reportId}`
      );

      return {
        success: true,
        record,
        xpAwarded: reward.duplicate ? 0 : 100,
        duplicate: reward.duplicate,
      };
    } catch (error) {
      console.error("[VolunteerService.completeTask] Error:", error);
      return { success: false, error: "UNKNOWN", duplicate: false };
    }
  }
}
