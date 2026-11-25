import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { ReportUpdateStatusSchema } from "@/lib/validation/report.schema";
import { updateReportStatus } from "@/utils/db/actions";

export async function POST(req: NextRequest) {
  // 1. Enforce Admin-only RBAC on the server
  const rbac = requireRole(req, ["admin"]);
  if ("errorResponse" in rbac) return rbac.errorResponse;

  try {
    const body = await req.json();

    // 2. Validate input schema with Zod
    const parsed = ReportUpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { reportId, status } = parsed.data;
    const updated = await updateReportStatus(reportId, status);

    return NextResponse.json({
      success: true,
      report: updated,
      verifiedBy: rbac.user.email,
    });
  } catch (error) {
    console.error("[/api/admin/reports/verify] Error:", error);
    return NextResponse.json({ error: "Failed to update report status" }, { status: 500 });
  }
}
