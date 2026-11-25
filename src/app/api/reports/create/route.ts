import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { ReportCreateSchema } from "@/lib/validation/report.schema";
import { createReport } from "@/utils/db/actions";
import { verifyAnalysisToken } from "@/lib/auth/token";

export async function POST(req: NextRequest) {
  // 1. Enforce Role-Based Authentication (Citizen or Admin)
  const auth = requireRole(req, ["citizen", "admin"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const body = await req.json();

    // 2. Validate input schema with Zod
    const parsed = ReportCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { location, category, amount, imageUrl } = parsed.data;

    // 3. Server-side Guardrail check: if aiResult is supplied, verify it cryptographically or check criteria
    if (body.aiResult) {
      if (body.aiResult.verificationToken) {
        const verified = verifyAnalysisToken(body.aiResult.verificationToken);
        if (!verified || !verified.isValid || verified.confidence < 0.75) {
          return NextResponse.json(
            { error: "Submission rejected: Invalid or tampered AI verification token.", code: "TAMPERED_AI_TOKEN" },
            { status: 400 }
          );
        }
      } else {
        const { isDirectPhoto, isCivicIssue, confidence } = body.aiResult;
        if (isDirectPhoto === false || isCivicIssue === false) {
          return NextResponse.json(
            { error: "Submission rejected: Image was flagged as non-authentic or non-civic.", code: "GUARDRAIL_REJECTED" },
            { status: 400 }
          );
        }
        if (typeof confidence === "number" && confidence < 0.75) {
          return NextResponse.json(
            { error: "Submission rejected: AI confidence is below the required 75% threshold.", code: "LOW_CONFIDENCE" },
            { status: 400 }
          );
        }
      }
    }

    const report = await createReport(
      auth.user.id,
      location,
      category,
      amount,
      imageUrl,
      body.aiResult
    );

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("[/api/reports/create] Error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
