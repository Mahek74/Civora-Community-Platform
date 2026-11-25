import { z } from "zod";

export const AdoptTaskSchema = z.object({
  taskId: z.number().int().positive("Invalid task ID"),
});

export const CompleteTaskSchema = z.object({
  taskId: z.number().int().positive("Invalid task ID"),
  beforeImageUrl: z.string().optional(),
  afterImageUrl: z.string().min(5, "After-cleanup photo proof is required"),
  notes: z.string().max(500).optional(),
});

export type AdoptTaskInput = z.infer<typeof AdoptTaskSchema>;
export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>;
