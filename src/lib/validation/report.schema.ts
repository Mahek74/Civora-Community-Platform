import { z } from "zod";

export const ReportCreateSchema = z.object({
  category: z.enum([
    "Garbage Accumulation",
    "Pothole",
    "Drainage Blockage",
    "Water Leakage",
    "Broken Road",
    "Street Light Issue",
    "Illegal Dumping",
    "Other",
  ]),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  location: z.string().trim().min(3, "Location description must be at least 3 characters").max(255),
  description: z.string().trim().max(1000).optional(),
  latitude: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= -90 && num <= 90;
    }, "Latitude must be a valid number between -90 and 90"),
  longitude: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= -180 && num <= 180;
    }, "Longitude must be a valid number between -180 and 180"),
  amount: z.string().optional().default("Estimated 10 kg"),
  imageUrl: z.string().optional(),
});

export const ReportUpdateStatusSchema = z.object({
  reportId: z.number().int().positive("Invalid report ID"),
  status: z.enum(["pending", "in_progress", "verified", "resolved", "rejected"]),
  assignedWorker: z.string().max(255).optional(),
});

export type ReportCreateInput = z.infer<typeof ReportCreateSchema>;
export type ReportUpdateStatusInput = z.infer<typeof ReportUpdateStatusSchema>;
