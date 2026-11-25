import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { CompleteTaskSchema } from "@/lib/validation/volunteer.schema";
import { updateTaskStatus, awardRewardWithIdempotency } from "@/utils/db/actions";

export async function POST(req: NextRequest) {
  // 1. Enforce Volunteer Role Authorization
  const auth = requireRole(req, ["volunteer", "worker", "admin"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await req.json();

    // 2. Validate input schema with Zod
    const parsed = CompleteTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { taskId, afterImageUrl } = parsed.data;
    const userId = auth.user.id;

    // 3. Update task status in DB
    await updateTaskStatus(taskId, "completed", userId);

    // 4. Award XP with database-enforced idempotency (unique reference_key)
    const referenceKey = `volunteer-task-${taskId}-${userId}`;
    const rewardResult = await awardRewardWithIdempotency(
      userId,
      100, // +100 XP
      referenceKey,
      `Completed volunteer cleanup for task #${taskId}`
    );

    return NextResponse.json({
      success: true,
      taskId,
      xpAwarded: rewardResult.duplicate ? 0 : 100,
      isDuplicateClaim: rewardResult.duplicate,
      message: rewardResult.duplicate
        ? "Task marked completed, but XP was already claimed previously."
        : "Task completed successfully! +100 XP awarded.",
    });
  } catch (error) {
    console.error("[/api/volunteer/tasks/complete] Error:", error);
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 });
  }
}
