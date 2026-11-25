import { db } from "@/utils/db/dbConfig";
import { Reports } from "@/utils/db/schema";
import { eq, desc } from "drizzle-orm";

export class ReportService {
  static async getById(id: number) {
    try {
      const [report] = await db.select().from(Reports).where(eq(Reports.id, id)).execute();
      return report || null;
    } catch (error) {
      console.error("[ReportService.getById] Error:", error);
      return null;
    }
  }

  static async getByComplaintId(complaintId: string) {
    try {
      const [report] = await db.select().from(Reports).where(eq(Reports.complaintId, complaintId)).execute();
      return report || null;
    } catch (error) {
      console.error("[ReportService.getByComplaintId] Error:", error);
      return null;
    }
  }

  static async getByUserId(userId: number) {
    try {
      return await db.select().from(Reports).where(eq(Reports.userId, userId)).orderBy(desc(Reports.createdAt)).execute();
    } catch (error) {
      console.error("[ReportService.getByUserId] Error:", error);
      return [];
    }
  }

  static async getRecent(limit: number = 10) {
    try {
      return await db.select().from(Reports).orderBy(desc(Reports.createdAt)).limit(limit).execute();
    } catch (error) {
      console.error("[ReportService.getRecent] Error:", error);
      return [];
    }
  }

  static async updateStatus(reportId: number, status: string, assignedWorker?: string) {
    try {
      const updateData: any = { status };
      if (assignedWorker) updateData.assignedWorker = assignedWorker;
      if (status === "resolved") updateData.resolvedAt = new Date();

      const [updated] = await db.update(Reports).set(updateData).where(eq(Reports.id, reportId)).returning().execute();
      return updated || null;
    } catch (error) {
      console.error("[ReportService.updateStatus] Error:", error);
      return null;
    }
  }
}
